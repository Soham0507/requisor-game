# Activate8 game library: source

Five lead capture games that share one runtime and one brand kit format. Build them into a single self-contained page with `python3 build.py`. Icons come from the `lucide-static` npm package (`npm i lucide-static`).

## Files

| File | What it holds |
| --- | --- |
| `src/styles.css` | Design tokens (light theme, SF Pro on Apple devices, Inter elsewhere) and every component style |
| `src/core.js` | Runtime: theme engine, stage, lead form, leaderboards, sound, confetti, kiosk idle reset |
| `src/brands.js` | Three demo brand kits. This is the shape the self-serve editor should produce. |
| `src/games/*.js` | One module per game: `match`, `trivia`, `number`, `spin`, `recall` |
| `src/library.js` | The library page: brand kit switcher, game tiles, session leads |
| `build.py` | Inlines icons, CSS and JS into `dist/activate8.html` |

## Brand kit format (`BRANDS[id]`)

- **Identity:** `name`, `color` (one hex value; every tint is derived from it), `mark` (SVG markup) or `logoImg` (data URL), `code` (prefix for prize and referral codes).
- **`lead`:** which fields to collect. Each field can be required, half-width, `type: 'email'` or `type: 'zip'`, or offer `choices`. Also sets the opt-in label.
- **`products`:** used by Match and The Number. Each product has a name, icon, color, one-line pitch and three specs.
- **`games.<id>`:** each game's copy and content: questions, stats, prizes with `weight` and `tier`, and memory pairs.
- **`{brand}`:** anywhere in the text, this is replaced with the brand name at play time.

## Game module contract (`GAMES[id]`)

- `tile`: the copy shown on the library tile.
- `art(stage)`: returns the start-screen artwork.
- `play(stage)`: runs the game, then calls `stage.lead(...)`, then `stage.saveLead(...)`, then `stage.bindResult(...)`.
- `cleanup(stage)`: optional; tears down listeners when the game closes.

The stage's async helpers (`wait`, `tween`, `lead`) never resolve after the stage resets. A game abandoned mid-flow simply stops; no state leaks into the next player's game.

## Receiving leads

Set `window.A8_ON_LEAD = (lead) => { ... }` to receive each lead as it is captured. Each lead includes the player's details plus `game`, `brand`, `result`, `score`, `detail` (the player's answers, in Match) and `code`.

`window.Activate8` exposes `{ App, BRANDS, GAMES, Leads, Boards }`.

Leaderboards and leads are in memory in this build. In the platform, they should be written to your backend.
