import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

config({ path: ".env.local" });

async function main() {
  // Prefer a direct (unpooled) connection for migrations when available
  // (e.g. Neon's DATABASE_URL_UNPOOLED) — DDL over a PgBouncer transaction-mode
  // pooled connection is a known source of subtle failures.
  const databaseUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");

  const db = drizzle(postgres(databaseUrl, { max: 1, prepare: false }));
  await migrate(db, { migrationsFolder: "./drizzle" });

  console.log("Migrations applied.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
