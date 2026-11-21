import "server-only";
import * as schema from "./schema";
import { criarDb, type Db } from "./criar";

const globalDb = globalThis as unknown as { __pgDb?: Promise<Db> };

/** Uma instância por processo (evita abrir várias conexões no modo dev). */
export function db(): Promise<Db> {
  if (!globalDb.__pgDb) globalDb.__pgDb = criarDb(process.env.DATABASE_URL);
  return globalDb.__pgDb;
}

export { schema };
