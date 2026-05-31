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
  position     REAL NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS tasks_status_idx     ON tasks (status);
CREATE INDEX IF NOT EXISTS tasks_priority_idx   ON tasks (priority);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx   ON tasks (due_date);
CREATE INDEX IF NOT EXISTS tasks_created_at_idx ON tasks (created_at);
CREATE INDEX IF NOT EXISTS tasks_position_idx   ON tasks (position);
`;

/**
 * Forward-only column upgrades for databases that pre-date a schema change.
 * Each entry: { column to look for, ALTER to run if missing, optional
 * back-fill statement }. SQLite has no `ADD COLUMN IF NOT EXISTS`, so we
 * inspect `pragma table_info` first.
 */
interface ColumnUpgrade {
  table: string;
  column: string;
  alter: string;
  backfill?: string;
}

const COLUMN_UPGRADES: ColumnUpgrade[] = [
  {
    table: "tasks",
    column: "position",
    alter: "ALTER TABLE tasks ADD COLUMN position REAL NOT NULL DEFAULT 0",
    // Seed positions from creation order so existing tasks keep a stable
    // visible order until the user starts dragging.
    backfill: `
      UPDATE tasks
      SET position = (
        SELECT COUNT(*) FROM tasks AS t2 WHERE t2.created_at < tasks.created_at
      )
      WHERE position = 0
    `,
  },
];

function applyColumnUpgrades(sqlite: Database.Database) {
  for (const upgrade of COLUMN_UPGRADES) {
    const cols = sqlite
      .prepare(`PRAGMA table_info(${upgrade.table})`)
      .all() as Array<{ name: string }>;
    const hasColumn = cols.some((c) => c.name === upgrade.column);
    if (!hasColumn) {
      sqlite.exec(upgrade.alter);
      if (upgrade.backfill) sqlite.exec(upgrade.backfill);
    }
  }
}

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
    applyColumnUpgrades(sqlite);
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
