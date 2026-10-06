import { readFileSync, writeFileSync } from "node:fs";
const [src, dest] = process.argv.slice(2);
const lines = readFileSync(src, "utf8").replace(/\f/g, "").split(/\r?\n/);
const out = [];
const fixed = [];
let skipping = false;
for (let i = 0; i < lines.length; i++) {
  let l = lines[i];
  if (l.includes('"how_to_use"')) { skipping = true; continue; }
  if (skipping) { if (l.trim() === "},") skipping = false; continue; }
  const quotes = (l.match(/(?<!\\)"/g) || []).length;
  if (quotes % 2 === 1) {
    fixed.push(l.slice(0, 80));
    const next = (lines[i + 1] || "").trim();
    const comma = l.trim().endsWith(",") || next.startsWith('"');
    l = l.replace(/[\s,]*$/, "") + '"' + (comma ? "," : "");
  }
  if (/^"[^"]+": ".*"$/.test(l.trim()) && (lines[i + 1] || "").trim().startsWith('"')) l += ",";
  out.push(l);
}
try {
  const j = JSON.parse(out.join("\n"));
  console.log("parsed games:", j.games.length, "| repaired lines:", fixed.length);
  fixed.forEach((f) => console.log("  fixed:", f));
  writeFileSync(dest, JSON.stringify(j, null, 1));
  console.log(j.games.map((g) => g.slug).join(", "));
} catch (e) {
  console.log("fail:", e.message);
}
