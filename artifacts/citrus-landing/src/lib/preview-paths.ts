// Every game now speaks the BRANDING_CONTRACT.md postMessage protocol (see
// each game's brand-bridge), so the live preview works for all of them —
// not just the one `games` row currently marked brandSupport "full". Preview
// bundles are built into citrus-landing/public/game-previews/<slug>/.
export const PREVIEW_BASE_PATHS: Record<string, string> = {
  "space-shooter-1": "/game-previews/space-shooter-1/",
  "cyber-adventure": "/game-previews/cyber-adventure/",
  "basketball-shootout": "/game-previews/basketball-shootout/",
  "soccer-shootout": "/game-previews/soccer-shootout/",
  "gesture-space-war": "/game-previews/gesture-space-war/",
  "boat-booth": "/game-previews/boat-booth/",
  "lexus-energy-quiz": "/game-previews/lexus-energy-quiz/",
  "jeopardy": "/game-previews/jeopardy/",
  "a8-match": "/game-previews/a8-match/",
  "a8-trivia-rush": "/game-previews/a8-trivia-rush/",
  "a8-the-number": "/game-previews/a8-the-number/",
  "a8-spin-to-win": "/game-previews/a8-spin-to-win/",
  "a8-recall": "/game-previews/a8-recall/",
};
