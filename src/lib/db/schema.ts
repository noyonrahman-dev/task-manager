import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Tasks table.
 *
 * Notes
 * - `id` uses a 21-char nanoid generated in application code; SQLite stays
 *   agnostic of the format so it works the same when migrated to Postgres.
 * - All timestamps are stored as ISO-8601 strings for round-trippable JSON
 *   and easy migration between dialects. We avoid SQLite's `INTEGER` epoch
 *   storage to keep timezone semantics explicit.
 * - `priority` and `status` are stored as TEXT and validated at the
 *   application layer (see `src/lib/validations/task.ts`).
 */
export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    priority: text("priority", { enum: ["low", "medium", "high", "urgent"] })
      .notNull()
      .default("medium"),
    status: text("status", { enum: ["todo", "in_progress", "done"] })
      .notNull()
      .default("todo"),
    dueDate: text("due_date"),
    completedAt: text("completed_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => ({
    statusIdx: index("tasks_status_idx").on(table.status),
    priorityIdx: index("tasks_priority_idx").on(table.priority),
    dueDateIdx: index("tasks_due_date_idx").on(table.dueDate),
    createdAtIdx: index("tasks_created_at_idx").on(table.createdAt),
  }),
);

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
