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
  // Isolated embedded database: never writes to the workspace or production DB.
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
  directory = await mkdtemp(join(tmpdir(), "soccer-api-test-"));
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
const path = "/api/games/soccer-shootout/scores";
const input = (overrides = {}) => ({
  submissionId: randomUUID(),
  playerName: "Soccer Test",
  playerTitle: "Tester",
  playerCompany: "Example",
  playerEmail: "soccer-test@example.invalid",
  score: 9,
  shotsTaken: 5,
  shotsMade: 3,
  outagesPrevented: 3,
  ...overrides,
});
const post = body => fetch(`${base}${path}`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});
const list = async () => {
  const response = await fetch(`${base}${path}?limit=100`);
  assert.equal(response.status, 200);
  return response.json();
};

test("saves a result without exposing private email in either response", async () => {
  const body = input();
  const response = await post(body);
  assert.equal(response.status, 201);
  const saved = await response.json();
  assert.equal(saved.id, body.submissionId);
  assert.equal(saved.score, 9);
  assert.equal("playerEmail" in saved, false);
  assert.equal("email" in saved, false);
  assert.ok(!JSON.stringify(await list()).includes(body.playerEmail));
});
test("retries are idempotent; conflicting retries do not replace a score", async () => {
  const body = input();
  const responses = await Promise.all([post(body), post(body)]);
  assert.ok(responses.every(response => response.status === 201));
  assert.equal((await list()).filter(row => row.id === body.submissionId).length, 1);
  assert.equal((await post({ ...body, playerName: "Different" })).status, 409);
});
test("invalid limits and malformed player/score inputs return 400", async () => {
  for (const limit of ["0", "101", "1.5", "no", "1&limit=2"]) {
    assert.equal((await fetch(`${base}${path}?limit=${limit}`)).status, 400);
  }
  for (const patch of [
    { submissionId: "not-a-uuid" }, { playerEmail: "not-an-email" },
    { playerName: "   " }, { playerCompany: "x".repeat(101) },
    { score: "9" }, { score: -3 }, { score: 9000 },
    { score: 10 }, { shotsTaken: 1 }, { outagesPrevented: 0 },
  ]) {
    assert.equal((await post(input(patch))).status, 400);
  }
});
test("leaderboard ranks highest first and honors limit", async () => {
  const high = input({ score: 30, shotsTaken: 12, shotsMade: 10, outagesPrevented: 10 });
  assert.equal((await post(high)).status, 201);
  const response = await fetch(`${base}${path}?limit=1`);
  const rows = await response.json();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, high.submissionId);
  const all = await list();
  assert.deepEqual(all.map(row => row.score), all.map(row => row.score).sort((a, b) => b - a));
});
test("another game's player submissions cannot appear in Soccer's leaderboard", async () => {
  const response = await fetch(`${base}/api/player-submissions`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      gameSlug: "basketball-shootout", name: "Other Game", email: "other@example.invalid",
      extra: { kind: "soccer-score", score: 900, shotsTaken: 300, shotsMade: 300, outagesPrevented: 300, playerTitle: "Test", playerCompany: "Example" },
    }),
  });
  assert.equal(response.status, 200);
  assert.ok((await list()).every(row => row.playerName !== "Other Game"));
});
test("scores survive an API process restart", async () => {
  const beforeRestart = await list();
  await stop();
  await start();
  assert.deepEqual(await list(), beforeRestart);
});
test("generic player capture cannot bypass Soccer score validation", async () => {
  const response = await fetch(`${base}/api/player-submissions`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      gameSlug: "soccer-shootout", name: "Forged Score", email: "forged@example.invalid",
      extra: { kind: "soccer-score", score: "invalid" },
    }),
  });
  assert.equal(response.status, 400);
  assert.ok((await list()).every(row => row.playerName !== "Forged Score"));
});
