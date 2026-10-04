import * as schema from "./schema";
export declare const db: (import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema> & {
    $client: import("pg").Pool;
}) | (import("drizzle-orm/pglite").PgliteDatabase<typeof schema> & {
    $client: import("@electric-sql/pglite").PGlite;
});
export * from "./schema";
export { FIVEGAMES_CATALOG } from "./fivegames-catalog";
//# sourceMappingURL=index.d.ts.map