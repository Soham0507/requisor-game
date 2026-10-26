import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";

let child, directory, base, port;
async function start() {
  // Isolated embedded database: no writes to workspace or production data.
  const env = { ...process.env, PORT: String(port), PGLITE_DATA_DIR: directory, NODE_ENV: "test" };
  delete env.DATABASE_URL;
  child = spawn(process.execPath, [resolve("artifacts/api-server/dist/index.mjs")], { env, stdio: ["ignore", "pipe", "pipe"] });
  let startup = "";
  child.stdout.on("data", chunk => { startup = (startup + chunk).slice(-4000); });
  child.stderr.on("data", chunk => { startup = (startup + chunk).slice(-4000); });
  for (let i = 0; i < 150; i++) {
    if (child.exitCode !== null) throw new Error(`Test API exited: ${startup}`);
    try {
      if ((await fetch(`${base}/api/healthz`)).ok) return;
    } catch { /* wait for bootstrap */ }
    await new Promise(done => setTimeout(done, 100));
  }
  throw new Error(`Test API failed to start: ${startup}`);
}
async function stop() {
  if (!child || child.exitCode !== null) return;
  const exited = once(child, "exit");
  child.kill("SIGTERM");
  const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
  await exited;
  clearTimeout(timer);
}
before(async () => {
  directory = await mkdtemp(join(tmpdir(), "basketball-api-test-"));
  const socket = createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  port = socket.address().port;
  await new Promise(done => socket.close(done));
  base = `http://127.0.0.1:${port}`;
  await start();
});
after(async () => {
  await stop();
  if (directory) await rm(directory, { recursive: true, force: true });
});
const path = "/api/games/basketball-shootout/scores";
const input = (overrides = {}) => ({
  submissionId: randomUUID(), playerName: "Basketball Test",
  playerTitle: "Tester", playerCompany: "Example",
  playerEmail: "basketball-test@example.invalid", score: 9,
  shotsTaken: 5, shotsMade: 3, outagesPrevented: 3, ...overrides,
});
const post = (body, endpoint = path) => fetch(`${base}${endpoint}`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});
const list = async (endpoint = path) => {
  const response = await fetch(`${base}${endpoint}?limit=100`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  return response.json();
};

test("only public score fields leave the private contact store", async () => {
  const body = input();
  const response = await post(body);
  assert.equal(response.status, 201);
  const saved = await response.json();
  assert.deepEqual(Object.keys(saved).sort(), [
    "id", "playerName", "playerTitle", "playerCompany", "score",
    "shotsTaken", "shotsMade", "outagesPrevented", "createdAt",
  ].sort());
  assert.equal(saved.id, body.submissionId);
  assert.equal(saved.score, 9);
  assert.ok(!JSON.stringify(saved).includes(body.playerEmail));
  assert.ok(!JSON.stringify(await list()).includes(body.playerEmail));
});
test("concurrent retries save once and reject changed contacts or round details", async () => {
  const body = input();
  const responses = await Promise.all([post(body), post(body)]);
  assert.ok(responses.every(response => response.status === 201));
  assert.equal((await list()).filter(row => row.id === body.submissionId).length, 1);
  assert.equal((await post({ ...body, playerName: "Different" })).status, 409);
  assert.equal((await post({ ...body, playerEmail: "different@example.invalid" })).status, 409);
});
test("invalid limits, contacts and inconsistent statistics are rejected", async () => {
  for (const limit of ["0", "101", "1.5", "no", "1&limit=2"]) {
    assert.equal((await fetch(`${base}${path}?limit=${limit}`)).status, 400);
  }
  for (const patch of [
    { submissionId: "invalid" }, { playerEmail: "not-an-email" },
    { playerName: "   " }, { playerCompany: "x".repeat(101) },
    { score: "9" }, { score: -3 }, { score: 901 },
    { shotsTaken: 1 }, { outagesPrevented: 0 },
  ]) {
    assert.equal((await post(input(patch))).status, 400);
  }
});
test("zero-score rounds are saved; rankings are highest first and bounded", async () => {
  const high = input({ score: 30, shotsTaken: 12, shotsMade: 10, outagesPrevented: 10 });
  const zero = input({ score: 0, shotsTaken: 0, shotsMade: 0, outagesPrevented: 0 });
  assert.equal((await post(high)).status, 201);
  assert.equal((await post(zero)).status, 201);
  const response = await fetch(`${base}${path}?limit=1`);
  const rows = await response.json();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, high.submissionId);
  const all = await list();
  assert.deepEqual(all.map(row => row.score), all.map(row => row.score).sort((a, b) => b - a));
});
test("Soccer and generic leads never enter Basketball rankings", async () => {
  const soccerPath = "/api/games/soccer-shootout/scores";
  const soccer = input({ playerName: "Soccer Only" });
  assert.equal((await post(soccer, soccerPath)).status, 201);
  assert.equal((await post({ ...soccer, playerName: "Basketball Collision" })).status, 409);
  assert.ok((await list()).every(row => row.id !== soccer.submissionId));
  const basketballRows = await list();
  assert.ok((await list(soccerPath)).every(row => !basketballRows.some(other => other.id === row.id)));
  assert.equal((await post({
    gameSlug: "basketball-shootout", name: "Forged Score", email: "forged@example.invalid",
    extra: { kind: "basketball-score", score: "invalid" },
  }, "/api/player-submissions")).status, 400);
  assert.equal((await post({
    gameSlug: "soccer-shootout", name: "Other Game", email: "other@example.invalid",
    extra: { kind: "basketball-score", score: 900 },
  }, "/api/player-submissions")).status, 200);
  assert.ok((await list()).every(row => row.playerName !== "Other Game"));
});
test("server restart and fresh reads preserve saved scores", async () => {
  const beforeRestart = await list();
  await stop();
  await start();
  assert.deepEqual(await list(), beforeRestart);
});
test("public submissions are rate limited with a retry instruction", async () => {
  const body = input();
  for (let i = 0; i < 20; i++) assert.equal((await post(body)).status, 201);
  const limited = await post(body);
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "60");
  assert.equal((await list()).filter(row => row.id === body.submissionId).length, 1);
});
