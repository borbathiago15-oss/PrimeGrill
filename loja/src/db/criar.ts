import path from "node:path";
import * as schema from "./schema";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

/**
 * Produção: PostgreSQL via DATABASE_URL.
 * Desenvolvimento: sem DATABASE_URL, usa PGlite (PostgreSQL embarcado) em ./.data/pglite.
 */
export async function criarDb(url: string | undefined): Promise<Db> {
  if (url && /^postgres(ql)?:\/\//.test(url)) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const pool = new Pool({ connectionString: url, max: 5 });
    return drizzle(pool, { schema }) as unknown as Db;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const dir = path.join(process.cwd(), ".data", "pglite");
  const { mkdirSync } = await import("node:fs");
  mkdirSync(path.dirname(dir), { recursive: true });
  const client = new PGlite(dir);
  return drizzle(client, { schema }) as unknown as Db;
}

export async function migrar(db: Db, url: string | undefined) {
  const pasta = path.join(process.cwd(), "drizzle");
  if (url && /^postgres(ql)?:\/\//.test(url)) {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate(db as any, { migrationsFolder: pasta });
  } else {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate(db as any, { migrationsFolder: pasta });
  }
}
