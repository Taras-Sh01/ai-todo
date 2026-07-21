import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env.local (see README) — a local Postgres via `brew services start postgresql@17` works for dev.",
  );
}

// prepare: false — required for compatibility with pooled connections
// (PgBouncer transaction mode, e.g. Neon's default DATABASE_URL). Harmless
// against a direct/unpooled connection too.
export const db = drizzle(postgres(databaseUrl, { prepare: false }), { schema });
