/**
 * Standalone migration runner used by `npm run db:migrate`.
 *
 * Drizzle migrations are opt-in for Stride. The default runtime path uses an
 * idempotent `CREATE TABLE IF NOT EXISTS` bootstrap (see `./index.ts`). Once
 * you start evolving the schema, generate proper migrations with:
 *
 *     npm run db:generate
 *
 * and apply them with this script.
 */
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

function resolveDatabasePath(): string {
  const raw = process.env.DATABASE_URL ?? "file:./data/stride.db";
  const filePath = raw.startsWith("file:") ? raw.slice("file:".length) : raw;
  const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const dir = path.dirname(absolute);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return absolute;
}

function main() {
  const migrationsFolder = path.join(process.cwd(), "src/lib/db/migrations");
  if (!existsSync(migrationsFolder) || readdirSync(migrationsFolder).length === 0) {
    console.log(
      "[stride] No migrations found. Run `npm run db:generate` first to create one.",
    );
    return;
  }

  const dbPath = resolveDatabasePath();
  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite);
  console.log(`[stride] Running migrations against ${dbPath}`);
  migrate(db, { migrationsFolder });
  sqlite.close();
  console.log("[stride] Migrations complete.");
}

main();
