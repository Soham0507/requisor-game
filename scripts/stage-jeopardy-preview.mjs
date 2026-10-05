// Reuse the site's installed toolchain, not the uploaded Windows node_modules.
import { createRequire } from "node:module";
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "artifacts/citrus-landing/game/jeoparady/frontend");
const require = createRequire(path.join(root, "artifacts/citrus-landing/package.json"));
const { build } = await import(require.resolve("vite"));
const { default: react } = await import(require.resolve("@vitejs/plugin-react"));
const { default: tailwind } = await import(require.resolve("@tailwindcss/vite"));
const output = path.join(source, "dist/catalog");
await build({
  configFile: false,
  root: source,
  base: "/game-previews/jeopardy/",
  publicDir: false,
  plugins: [react(), tailwind()],
  resolve: {
    alias: [
      { find: /^.*\/lib\/api(?:\.ts)?$/, replacement: path.join(source, "src/catalog-preview/api.ts") },
      { find: "react-dom", replacement: path.dirname(require.resolve("react-dom/package.json")) },
      { find: "react", replacement: path.dirname(require.resolve("react/package.json")) },
      { find: "tailwindcss", replacement: path.dirname(require.resolve("tailwindcss/package.json")) },
    ],
    dedupe: ["react", "react-dom"],
  },
  build: { outDir: output, emptyOutDir: true, rollupOptions: { input: path.join(source, "catalog-preview.html") } },
});
writeFileSync(path.join(output, "index.html"), readFileSync(path.join(output, "catalog-preview.html")));
for (const asset of ["category-geography.jpg", "category-food.jpg", "category-pharma.jpg", "category-jobs.jpg", "money-credit.mp3"]) {
  cpSync(path.join(source, "public", asset), path.join(output, asset));
}
const staged = path.join(root, "artifacts/citrus-landing/dist/public/game-previews/jeopardy");
mkdirSync(staged, { recursive: true });
cpSync(output, staged, { recursive: true });
console.log("Staged brandable Jeopardy demo -> /game-previews/jeopardy/");
