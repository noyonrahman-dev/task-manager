import "server-only";

import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema";

/**
 * Resolve the SQLite file path from `DATABASE_URL` (e.g. `file:./data/stride.db`)
 * or fall back to `./data/stride.db`. The parent directory is created on
 * demand so a fresh `next dev` works without manual setup.
 */
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

/**
 * Idempotent schema bootstrap. Mirrors the Drizzle schema in `./schema.ts`.
 * Used so the very first run of the app works without invoking the
 * migration runner. For evolving the schema in production, prefer
 * `npm run db:generate && npm run db:migrate` (see README).
 */
const BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS tasks (
  id           TEXT PRIMARY KEY NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  priority     TEXT NOT NULL DEFAULT 'medium',
  status       TEXT NOT NULL DEFAULT 'todo',
  due_date     TEXT,
  completed_at TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS tasks_status_idx     ON tasks (status);
CREATE INDEX IF NOT EXISTS tasks_priority_idx   ON tasks (priority);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx   ON tasks (due_date);
CREATE INDEX IF NOT EXISTS tasks_created_at_idx ON tasks (created_at);
`;

type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;

interface GlobalWithDb {
  __strideSqlite?: Database.Database;
  __strideDrizzle?: DrizzleClient;
  __strideBootstrapped?: boolean;
}

const globalForDb = globalThis as unknown as GlobalWithDb;

function createClient(): DrizzleClient {
  if (globalForDb.__strideDrizzle) {
    return globalForDb.__strideDrizzle;
  }

  const sqlite = new Database(resolveDatabasePath());
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  if (!globalForDb.__strideBootstrapped) {
    sqlite.exec(BOOTSTRAP_SQL);
    globalForDb.__strideBootstrapped = true;
  }

  const client = drizzle(sqlite, { schema });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__strideSqlite = sqlite;
    globalForDb.__strideDrizzle = client;
  }

  return client;
}

export const db: DrizzleClient = createClient();
export { schema };
