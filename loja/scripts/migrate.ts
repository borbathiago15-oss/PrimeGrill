import { criarDb, migrar } from "../src/db/criar";

async function main() {
  const url = process.env.DATABASE_URL;
  const db = await criarDb(url);
  await migrar(db, url);
  console.log(`Migrations aplicadas (${url ? "PostgreSQL" : "PGlite local"}).`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
