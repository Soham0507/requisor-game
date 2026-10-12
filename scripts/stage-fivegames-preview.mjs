// The Activate8 library (artifacts/citrus-landing/game/fivegames) builds into
// one self-contained HTML fragment (dist/activate8.html, via its own
// build.py). The platform serves it as five separate games, so this wraps
// that fragment in a real document and appends src/embed-bridge.js, which
// picks the game from the /game-previews/<slug>/ path, hides the library
// page chrome and speaks the CDH_BRAND_* postMessage contract.
//
// Re-run after rebuilding dist/ or editing src/embed-bridge.js:
//   node scripts/stage-fivegames-preview.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(repoRoot, "artifacts/citrus-landing/game/fivegames");
const outDir = path.join(srcDir, "public");

let page = readFileSync(path.join(srcDir, "dist/activate8.html"), "utf8");
// Reuse the supplied icon dictionary, but assemble runtime and CSS from source
// so future edits do not depend on uploaded node_modules or a stale bundle.
const icons = page.match(/const ICONS = (\{[^\n]*\});/);
if (!icons) throw new Error("Fivegames bundle is missing its icon dictionary.");
JSON.parse(icons[1]);
const modules = ["core.js", "brands.js", "games/match.js", "games/trivia.js",
  "games/number.js", "games/spin.js", "games/recall.js", "library.js"];
const runtime = modules.map((file) => readFileSync(path.join(srcDir, "src", file), "utf8")).join("\n");
page = page.replace(/<style>[\s\S]*?<\/style>/, () =>
  `<style>${readFileSync(path.join(srcDir, "src/styles.css"), "utf8")}</style>`);
page = page.replace(/<script>\s*[\s\S]*?<\/script>/, () =>
  `<script>(function(){'use strict';const ICONS=${icons[1]};\n${runtime}\n})();</script>`);
const bridge = readFileSync(path.join(srcDir, "src/embed-bridge.js"), "utf8");
const questionRuntime = readFileSync(path.join(repoRoot, "lib/game-content/src/index.js"), "utf8").replace(/^export /gm, "");

const SINGLE_GAME_CSS = `
body.a8-single #app { display: none; }
body.a8-single .stage [data-act="exit"] { display: none; }
body.a8-single .stage .topbar .logo img { height: 48px; max-width: 240px; }
.a8-save-status { position:fixed; left:16px; right:16px; bottom:16px; z-index:10000; padding:12px 16px; border-radius:12px; background:#fff; color:#1a1a1a; box-shadow:0 4px 24px #0003; font:14px system-ui; }
.a8-save-status button { margin-left:12px; padding:8px 12px; border:1px solid #555; border-radius:8px; background:#fff; color:#111; cursor:pointer; }
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
(function(){${questionRuntime}
window.CDH_QUIZ_CONTENT={validateGameContent,adaptFiveGameContent};
})();
${bridge}</script>
</body>
</html>
`;

mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "index.html"), html);

const games = [
  { slug: "a8-match", name: "Match", color: "#6366f1", mark: "94%", caption: "FIND YOUR MATCH" },
  { slug: "a8-trivia-rush", name: "Trivia Rush", color: "#0A84FF", mark: "60", caption: "SECONDS TO SHINE" },
  { slug: "a8-the-number", name: "The Number", color: "#14b8a6", mark: "42", caption: "MAKE YOUR GUESS" },
  { slug: "a8-spin-to-win", name: "Spin to Win", color: "#f59e0b", mark: "✦", caption: "ANSWER · SPIN · WIN" },
  { slug: "a8-recall", name: "Recall", color: "#ec4899", mark: "↔", caption: "MATCH THE PAIRS" },
];
const only = process.argv[2];
if (only && !games.some((game) => game.slug === only)) throw new Error(`Unknown fivegames slug: ${only}`);
for (const game of games.filter((game) => !only || game.slug === only)) {
  const individualHtml = html.replace("<title>Activate8 Game Library</title>",
    `<title>${game.name} — Activate</title><meta name="description" content="Play and customize ${game.name}, an interactive branded game by Activate.">`);
  for (const base of [
    path.join(srcDir, "dist/previews"),
    path.join(repoRoot, "artifacts/citrus-landing/dist/public/game-previews"),
  ]) {
    const dir = path.join(base, game.slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "index.html"), individualHtml);
  }
  const thumbnail = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-label="${game.name}">
<defs><radialGradient id="glow"><stop stop-color="${game.color}" stop-opacity=".45"/><stop offset="1" stop-color="#10121c" stop-opacity="0"/></radialGradient></defs>
<rect width="640" height="360" fill="#10121c"/><ellipse cx="320" cy="160" rx="280" ry="230" fill="url(#glow)"/>
<rect x="253" y="47" width="134" height="134" rx="32" fill="${game.color}" fill-opacity=".16" stroke="${game.color}" stroke-width="2"/>
<text x="320" y="137" fill="white" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="55">${game.mark}</text>
<text x="320" y="236" fill="white" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="35">${game.name}</text>
<text x="320" y="277" fill="#c8cfdf" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" letter-spacing="3">${game.caption}</text></svg>`;
  for (const base of ["public/logo", "dist/public/logo"]) {
    const dir = path.join(repoRoot, "artifacts/citrus-landing", base);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, `${game.slug}.svg`), thumbnail);
  }
  console.log(`Staged ${game.name} -> /game-previews/${game.slug}/`);
}
