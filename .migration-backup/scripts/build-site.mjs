// Produces the complete deployable static site in
// `artifacts/citrus-landing/dist/public`:
//
//   1. the marketing/customizer SPA
//   2. every brandable game, staged under `game-previews/<slug>/`
//
// Order is load-bearing. citrus-landing's vite config sets
// `emptyOutDir: true`, so building the site *after* the games would delete
// them. Site first, games staged into its output second.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const shell = process.platform === "win32";

// citrus-landing's vite config throws unless both are present, even though a
// static build never starts a server. BASE_PATH is the real setting: the site
// is served from the domain root.
const env = {
  ...process.env,
  BASE_PATH: process.env.BASE_PATH ?? "/",
  PORT: process.env.PORT ?? "9999",
  NODE_ENV: "production",
  NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --max-old-space-size=4096`.trim(),
};

console.log("=== building citrus-landing site");
execFileSync("pnpm", ["--filter", "@workspace/citrus-landing", "run", "build"], {
  cwd: repoRoot,
  env,
  stdio: "inherit",
  shell,
});

execFileSync("node", ["scripts/build-games.mjs"], { cwd: repoRoot, env, stdio: "inherit", shell });
