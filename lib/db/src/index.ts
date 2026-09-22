import * as schema from "./schema";

// Local dev fallback: when no DATABASE_URL is provisioned (e.g. running
// outside Replit without a real Postgres instance), fall back to an
// in-process embedded Postgres (pglite) persisted under .pglite-data so the
// app is still runnable and seedable locally. Any real DATABASE_URL always
// wins and uses the standard node-postgres driver.
export const db = process.env.DATABASE_URL
  ? await createNodePostgresDb(process.env.DATABASE_URL)
  : await createPgliteDb();

async function createNodePostgresDb(connectionString: string) {
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const pg = await import("pg");
  const pool = new pg.default.Pool({ connectionString });
  return drizzle(pool, { schema });
}

async function createPgliteDb() {
  const { drizzle } = await import("drizzle-orm/pglite");
  const { PGlite } = await import("@electric-sql/pglite");
  const path = await import("path");
  const os = await import("os");
  const { pgliteBootstrapSql } = await import("./pglite-bootstrap.sql");
  // A fixed, caller-independent location: when this module is bundled (e.g.
  // into api-server's dist), `import.meta.dirname` would resolve relative to
  // wherever the bundle happens to land rather than this package, so every
  // consumer would end up pointed at a different on-disk database. Anchoring
  // to the home directory keeps it identical everywhere.
  const dataDir =
    process.env.PGLITE_DATA_DIR ?? path.join(os.homedir(), ".game-dev-hub", "pglite-data");
  const fs = await import("fs");
  fs.mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  await client.exec(pgliteBootstrapSql);
  return drizzle(client, { schema });
}

export * from "./schema";
