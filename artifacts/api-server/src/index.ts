import { existsSync } from "node:fs";
import path from "node:path";

// Local runs: load XAI_API_KEY (and any other settings) from a git-ignored
// .env at the repo root. Real environment variables (e.g. Replit Secrets or a
// deployment's settings) always take precedence, so this is a no-op there.
for (const candidate of [
  path.resolve(process.cwd(), ".env"),
  path.resolve(import.meta.dirname, "../../../.env"),
]) {
  if (existsSync(candidate)) {
    try {
      process.loadEnvFile(candidate);
    } catch {
      /* unreadable .env: fall back to the real environment */
    }
    break;
  }
}

import app from "./app";
import { ensureDefaultGames } from "./lib/catalog-bootstrap";
import { logger } from "./lib/logger";
import { resumePendingVideoJobs } from "./lib/generations";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

await ensureDefaultGames();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  void resumePendingVideoJobs();
});
