// The Activate8 library (artifacts/citrus-landing/game/fivegames) builds into
// one self-contained HTML fragment (dist/activate8.html, via its own
// build.py). The platform serves it as five separate games, so this wraps
// that fragment in a real document and appends src/embed-bridge.js, which
// picks the game from the /game-previews/<slug>/ path, hides the library
// page chrome and speaks the CDH_BRAND_* postMessage contract.
//
// Re-run after rebuilding dist/ or editing src/embed-bridge.js:
//   node scripts/stage-fivegames-preview.mjs
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(repoRoot, "artifacts/citrus-landing/game/fivegames");
const outDir = path.join(srcDir, "public");

const page = readFileSync(path.join(srcDir, "dist/activate8.html"), "utf8");
const bridge = readFileSync(path.join(srcDir, "src/embed-bridge.js"), "utf8");

const SINGLE_GAME_CSS = `
body.a8-single #app { display: none; }
body.a8-single .stage [data-act="exit"] { display: none; }
`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>:root{color-scheme:light}body{margin:0;background:#fafaf9}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
${page}
<style>${SINGLE_GAME_CSS}</style>
<script>
${bridge}</script>
</body>
</html>
`;

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "index.html"), html);

console.log(`Staged Activate8 preview -> ${path.relative(repoRoot, outDir)}`);
