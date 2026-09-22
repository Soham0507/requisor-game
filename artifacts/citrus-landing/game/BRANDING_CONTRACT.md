# Branding contract

Any game in this folder can be listed in the sellable catalog (see the
`games` table seeded by `pnpm --filter @workspace/scripts run seed-games`).
Games marked `brandSupport: "full"` additionally support **live in-game
re-skinning** inside the branding customizer's embedded preview. This is the
protocol a game must implement to earn that status.

## Message protocol

The customizer page embeds the game in an `<iframe>` and communicates with it
via `window.postMessage`. There is no build step or shared package involved —
any game, in any framework, can implement this with a few lines of vanilla JS.

**Game → host, on load**, once the game is ready to receive branding:

```js
window.parent.postMessage({ type: "CDH_BRAND_READY" }, "*");
```

**Host → game**, once on ready and again on every (debounced) edit:

```js
window.postMessage(
  {
    type: "CDH_BRAND_UPDATE",
    theme: {
      primaryColor: "#00f0ff",
      secondaryColor: "#ff2bd6",
      accentColor: "#a6ff3d",
      logoUrl: "data:image/png;base64,...", // or a normal URL
      brandName: "Acme Corp", // the customer's company/brand — distinct from the game's own title
      heading: "Space Shooter", // the game's own title
      tagline: "",
    },
  },
  "*",
);
```

The game hub (`game/shared/hub/index.html`) uses the same shape, handed off via
URL query params instead of postMessage — `?brandName=&heading=&tagline=&logo=&primaryColor=&secondaryColor=&accentColor=`
— for games launched as their own top-level page rather than embedded in an
iframe. See `game/shared/start-screen/README.md`.

## What a "full" game must do with the theme

1. Listen for `CDH_BRAND_UPDATE` and store the latest theme on
   `window.__BRAND__` (with sane defaults so the game still looks right when
   no message ever arrives, e.g. when played standalone outside the
   customizer).
2. Apply it to any brandable surface:
   - **DOM/CSS chrome** — set CSS custom properties on `document.documentElement`
     (e.g. `--brand-primary/--brand-secondary/--brand-accent`) and have your
     stylesheet/Tailwind config reference those instead of hardcoded hex.
   - **Heading/title text** — re-render wherever the game's name/tagline is
     shown as DOM text.
   - **Brand name** — if there's a natural spot for the customer's own
     company/brand name (typically paired with the logo), render it there;
     otherwise it's fine to leave unused rather than force it in.
   - **Logo** — swap the `src` of the logo `<img>`, if one exists.
   - **Canvas/WebGL draw calls** — read colors from `window.__BRAND__` at draw
     time instead of hardcoded literals, so gameplay visuals (ship, enemies,
     particles, etc.) reflect the brand too.

A game that only does the DOM/CSS chrome parts (no canvas/3D retheming) should
be marked `brandSupport: "chrome_only"` — still useful (logo + heading + page
colors update live), just not a full gameplay re-skin.

## Reference implementation

`artifacts/games/space-shooter-1/src/brand-bridge.ts`
implements the full contract, including canvas color theming in
`GameCanvas.tsx`. Use it as the template when upgrading another game from
`chrome_only` to `full`.
