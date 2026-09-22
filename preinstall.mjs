// Cross-platform replacement for the old `sh -c '...'` preinstall script,
// which broke under a plain Windows cmd.exe (no `sh` on PATH) whenever pnpm's
// dependency status check auto-triggered an install outside of Git Bash.
// Node itself is guaranteed present regardless of shell, so this runs
// identically on Windows/macOS/Linux.
import { existsSync, rmSync } from "node:fs";

for (const file of ["package-lock.json", "yarn.lock"]) {
  if (existsSync(file)) rmSync(file);
}

const userAgent = process.env.npm_config_user_agent ?? "";
if (!userAgent.startsWith("pnpm/")) {
  console.error("Use pnpm instead");
  process.exit(1);
}
