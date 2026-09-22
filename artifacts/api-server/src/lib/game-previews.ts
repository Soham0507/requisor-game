import fs from "fs";
import path from "path";
import express, { Router, type IRouter } from "express";

// The bundled server always lands at `artifacts/api-server/dist/index.mjs`
// (see build.mjs), so three levels up from this file's runtime directory is
// the repo root regardless of dev vs. prod.
const repoRoot = path.resolve(import.meta.dirname, "../../..");

// Every game's static build is mounted here so the branding customizer can
// embed it in a live, re-themeable iframe — each implements the
// CDH_BRAND_READY / CDH_BRAND_UPDATE postMessage protocol via its own
// src/brand-bridge.ts, see game/BRANDING_CONTRACT.md. Rebuild a game with
// `BASE_PATH=/game-previews/<slug>/ vite build` (or `--base=` for configs
// that don't read BASE_PATH) whenever its source changes — these are static
// snapshots, not live dev servers.
const GAME_PREVIEWS: { slug: string; distDir: string }[] = [
  {
    slug: "space-shooter-1",
    distDir: path.join(repoRoot, "artifacts/games/space-shooter-1/dist/public"),
  },
  {
    slug: "cyber-adventure",
    distDir: path.join(
      repoRoot,
      "artifacts/citrus-landing/game/Cybergame/artifacts/gesturesec-runner/dist/public",
    ),
  },
  {
    slug: "basketball-shootout",
    distDir: path.join(
      repoRoot,
      "artifacts/citrus-landing/game/AI-versionBB2-5/AI-versionBB2-5/dist/public",
    ),
  },
  {
    slug: "gesture-space-war",
    distDir: path.join(
      repoRoot,
      "artifacts/citrus-landing/game/Gesture-Space-War/Gesture-Space-War/artifacts/space-game/dist/public",
    ),
  },
  {
    slug: "boat-booth",
    distDir: path.join(
      repoRoot,
      "artifacts/citrus-landing/game/On-The-Fly-Video/On-The-Fly-Video/artifacts/boat-booth/dist/public",
    ),
  },
];

const router: IRouter = Router();

for (const { slug, distDir } of GAME_PREVIEWS) {
  router.use(`/game-previews/${slug}`, express.static(distDir));
  // SPA fallback: boat-booth uses client-side routing (wouter, "/" and
  // "/create"), so a direct load/refresh of a sub-route 404s against
  // express.static alone unless unmatched paths fall back to index.html.
  // Harmless no-op for the other single-screen games.
  //
  // The existence check matters in production: the deployed API box only
  // builds artifacts/api-server, and the CDN serves the games. Without it,
  // a stray request here would sendFile a path that isn't there and surface
  // as a 500 instead of an honest 404.
  const indexHtml = path.join(distDir, "index.html");
  router.get(`/game-previews/${slug}/*splat`, (_req, res, next) => {
    if (!fs.existsSync(indexHtml)) return next();
    res.sendFile(indexHtml);
  });
}

export default router;
