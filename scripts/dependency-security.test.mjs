import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, mkdtemp, mkdir, writeFile, rm, glob } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const apiRequire = createRequire(path.join(root, "artifacts/api-server/package.json"));
const jeopardyRequire = createRequire(path.join(root, "artifacts/citrus-landing/game/jeoparady/frontend/package.json"));

test("IPv4 does not match malformed mapped IPv6 proxy trust subnets", () => {
  const expressRequire = createRequire(apiRequire.resolve("express"));
  const proxyaddr = expressRequire("proxy-addr");
  const trust = proxyaddr.compile("::ffff:10.0.0.0/8");
  assert.equal(trust("203.0.113.1"), false);
});

test("SQL identifiers escape embedded quotes", () => {
  const { PgDialect } = apiRequire("drizzle-orm/pg-core");
  assert.equal(new PgDialect().escapeName('name"; DROP TABLE users; --'), '"name""; DROP TABLE users; --"');
});

test("preview discovery retains nested TSX files and excludes hidden/private components", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "preview-security-"));
  try {
    for (const file of ["Visible.tsx", "nested/Child.tsx", "_Private.tsx", "_hidden/Child.tsx", ".hidden/Child.tsx", "Other.ts"]) {
      await mkdir(path.dirname(path.join(dir, file)), { recursive: true });
      await writeFile(path.join(dir, file), "");
    }
    const files = [];
    for await (const file of glob("**/*.tsx", { cwd: dir })) {
      if (file.split(path.sep).every((part) => !part.startsWith("_") && !part.startsWith("."))) files.push(file);
    }
    assert.deepEqual(files.sort(), ["Visible.tsx", "nested/Child.tsx"]);
    const plugin = await readFile(path.join(root, "artifacts/mockup-sandbox/mockupPreviewPlugin.ts"), "utf8");
    assert.ok(plugin.includes('from "node:fs/promises"'));
    assert.ok(!plugin.includes("fast-glob"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("spreadsheet replacement produces a real XLSX archive", async () => {
  const { default: writeXlsxFile } = await import(jeopardyRequire.resolve("write-excel-file/universal"));
  const excelRequire = createRequire(jeopardyRequire.resolve("write-excel-file/package.json"));
  const { unzipSync, strFromU8 } = excelRequire("fflate");
  const blob = await writeXlsxFile([
    [{ type: String, value: "Username" }, { type: String, value: "Score" }],
    [{ type: String, value: "=1+1" }, { type: Number, value: 42 }],
  ], { sheet: "Players" }).toBlob();
  const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  assert.ok(files["xl/workbook.xml"]);
  assert.match(strFromU8(files["xl/workbook.xml"]), /Players/);
  assert.match(strFromU8(files["xl/worksheets/sheet1.xml"]), /42/);
  assert.doesNotMatch(strFromU8(files["xl/worksheets/sheet1.xml"]), /<f>/);
});
