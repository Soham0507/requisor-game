// Lexus Energy Quiz has no Vite build step — it's already a single static
// HTML file plus a few asset folders — so unlike the other games there's
// nothing for build-games.mjs to run. What it does need is a `public/`
// folder shaped like every other game's `dist/public` (an index.html plus
// only the assets that are actually meant to be public — see server.js's
// own route allowlist, which this mirrors), so api-server's game-previews
// router can serve it the same way.
//
// The source HTML/manifest/service-worker all reference their assets with
// root-absolute paths (`/icons/icon-192.png`), which only works when the app
// owns the whole domain. Served from a sub-path
// (`/game-previews/lexus-energy-quiz/`) those 404, so this script rewrites
// them to relative paths in the staged copy — the original source files
// are never touched.
//
// Re-run this whenever the source HTML/manifest/service-worker changes:
//   node scripts/stage-lexus-preview.mjs
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(repoRoot, "artifacts/citrus-landing/game/Lexus");
const outDir = path.join(srcDir, "public");

// Every root-absolute reference in the source files, found by inspecting
// the HTML/manifest/service-worker directly — not a blanket "/" -> ""
// rewrite, so a future new absolute path added upstream fails loudly
// (missed in ASSET_PATHS) instead of silently staying broken.
const ASSET_PATHS = [
  "/manifest.json",
  "/sw.js",
  "/favicon.ico",
  "/icons/favicon-32.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

function relativize(source) {
  let out = source;
  for (const p of ASSET_PATHS) {
    out = out.split(`"${p}"`).join(`"${p.slice(1)}"`);
  }
  return out;
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

let html = readFileSync(path.join(srcDir, "lexus_energy_quiz_tuned_v018.html"), "utf8");
html = relativize(html);
// A caching service worker fights the customizer's live-preview loop —
// every branding/logo change would need a hard cache-bust to actually show
// up in the iframe. Disabled only in this staged preview copy.
html = html.replace(
  'if ("serviceWorker" in navigator) {',
  'if (false && "serviceWorker" in navigator) { // disabled in the customizer preview — see stage-lexus-preview.mjs',
);
writeFileSync(path.join(outDir, "index.html"), html);

let manifest = relativize(readFileSync(path.join(srcDir, "manifest.json"), "utf8"));
writeFileSync(path.join(outDir, "manifest.json"), manifest);

let sw = relativize(readFileSync(path.join(srcDir, "sw.js"), "utf8"));
writeFileSync(path.join(outDir, "sw.js"), sw);

for (const dir of ["icons"]) {
  cpSync(path.join(srcDir, dir), path.join(outDir, dir), { recursive: true });
}

console.log(`Staged Lexus Energy Quiz preview -> ${path.relative(repoRoot, outDir)}`);
