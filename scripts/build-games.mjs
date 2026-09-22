// Builds every brandable game and stages the output where the citrus-landing
// site expects to serve it, at `dist/public/game-previews/<slug>/`.
//
// Why this exists: in local dev the api-server serves each game straight out
// of its own `dist/public` (see artifacts/api-server/src/lib/game-previews.ts),
// but in production the site is a static bundle on a CDN. Rather than proxy
// large video assets through the API box, the games are built into the site's
// own output so the CDN serves them directly.
//
// Each game must be built with its public base path baked in, because the
// games reference their assets at runtime (e.g. `${import.meta.env.BASE_URL}
// newbb/home.mp4`) and are served from a sub-path, not the domain root.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// `envBase` games read BASE_PATH from the environment in their vite config.
// `flagBase` mode (a `--base` CLI flag) still exists below for a game whose
// build genuinely goes through the `vite build` CLI, but nothing currently
// uses it — basketball-shootout used to, until its build turned out to call
// vite's build() API directly (script/build.ts), which silently ignores CLI
// flags; it now reads BASE_PATH like the others instead.
const GAMES = [
  { slug: "space-shooter-1", pkg: "@workspace/game-space-shooter-1", dist: "artifacts/games/space-shooter-1/dist/public", mode: "envBase" },
  { slug: "cyber-adventure", pkg: "@workspace/gesturesec-runner", dist: "artifacts/citrus-landing/game/Cybergame/artifacts/gesturesec-runner/dist/public", mode: "envBase" },
  { slug: "basketball-shootout", pkg: "rest-express", dist: "artifacts/citrus-landing/game/AI-versionBB2-5/AI-versionBB2-5/dist/public", mode: "envBase" },
  { slug: "gesture-space-war", pkg: "@workspace/space-game", dist: "artifacts/citrus-landing/game/Gesture-Space-War/Gesture-Space-War/artifacts/space-game/dist/public", mode: "envBase" },
  { slug: "boat-booth", pkg: "@workspace/boat-booth", dist: "artifacts/citrus-landing/game/On-The-Fly-Video/On-The-Fly-Video/artifacts/boat-booth/dist/public", mode: "envBase" },
];

const outRoot = path.join(repoRoot, "artifacts/citrus-landing/dist/public/game-previews");

function run(game) {
  const base = `/game-previews/${game.slug}/`;
  const args = ["--filter", game.pkg, "run", "build"];
  // Several game vite configs throw unless PORT is set, even for a build that
  // never starts a server, so supply a placeholder.
  //
  // The heap bump is not optional: cyber-adventure bundles three.js plus
  // face-api into a ~1.7MB chunk and dies with "memory allocation failed" on
  // Node's default heap, which would otherwise only show up in CI.
  const env = {
    ...process.env,
    PORT: process.env.PORT ?? "9999",
    NODE_ENV: "production",
    NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --max-old-space-size=4096`.trim(),
  };

  if (game.mode === "envBase") {
    env.BASE_PATH = base;
  } else {
    args.push("--", `--base=${base}`);
  }

  console.log(`\n=== building ${game.slug} (${game.pkg}) at base ${base}`);
  execFileSync("pnpm", args, { cwd: repoRoot, env, stdio: "inherit", shell: process.platform === "win32" });

  const from = path.join(repoRoot, game.dist);
  if (!existsSync(from)) {
    throw new Error(`${game.slug}: expected build output at ${game.dist}, but it does not exist`);
  }
  const to = path.join(outRoot, game.slug);
  rmSync(to, { recursive: true, force: true });
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
  console.log(`--- staged ${game.slug} -> dist/public/game-previews/${game.slug}/`);
}

const only = process.argv[2];
const selected = only ? GAMES.filter((g) => g.slug === only) : GAMES;
if (only && selected.length === 0) {
  console.error(`Unknown game "${only}". Known: ${GAMES.map((g) => g.slug).join(", ")}`);
  process.exit(1);
}

mkdirSync(outRoot, { recursive: true });
for (const game of selected) run(game);
console.log(`\nAll ${selected.length} game build(s) staged into artifacts/citrus-landing/dist/public/game-previews/`);
