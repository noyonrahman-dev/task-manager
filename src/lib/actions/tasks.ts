"use server";

import { revalidatePath } from "next/cache";
import { desc } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db, schema } from "@/lib/db";
import {
  createTaskSchema,
  type CreateTaskInput,
  idSchema,
  updateTaskSchema,
  type UpdateTaskInput,
} from "@/lib/validations/task";
import type { ActionResult, Task } from "@/lib/types";
import type { TaskStatus } from "@/lib/constants";

const { tasks } = schema;

/** Map a Drizzle row to the public {@link Task} type. */
function mapTask(row: typeof tasks.$inferSelect): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    dueDate: row.dueDate,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

function flattenZodErrors(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  return error.flatten().fieldErrors;
}

/* ------------------------------------------------------------------ */
/* Reads                                                              */
/* ------------------------------------------------------------------ */

/** Returns all tasks ordered by most recently updated. */
export async function listTasks(): Promise<Task[]> {
  const rows = db.select().from(tasks).orderBy(desc(tasks.updatedAt)).all();
  return rows.map(mapTask);
}

/* ------------------------------------------------------------------ */
/* Mutations                                                          */
/* ------------------------------------------------------------------ */

export async function createTask(input: CreateTaskInput): Promise<ActionResult<Task>> {
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid task data", fieldErrors: flattenZodErrors(parsed.error) };
  }

  const data = parsed.data;
  const now = nowIso();
  const id = data.id ?? nanoid();

  // If a client-generated id was supplied (offline replay) and the row is
  // already present, treat the create as a no-op. This makes replays from
  // the offline mutation queue idempotent.
  if (data.id) {
    const existing = db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (existing) {
      return { ok: true, data: mapTask(existing) };
    }
  }

  const row = {
    id,
    title: data.title,
    description: data.description ?? null,
    priority: data.priority,
    status: data.status,
    dueDate: data.dueDate ?? null,
    completedAt: data.status === "done" ? now : null,
    createdAt: now,
    updatedAt: now,
  };

  try {
    db.insert(tasks).values(row).run();
    revalidatePath("/");
    return { ok: true, data: mapTask(row) };
  } catch (error) {
    console.error("[stride] createTask failed", error);
    return { ok: false, error: "Could not create task. Please try again." };
  }
}

export async function updateTask(input: UpdateTaskInput): Promise<ActionResult<Task>> {
  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid task data", fieldErrors: flattenZodErrors(parsed.error) };
  }
  const { id, ...rest } = parsed.data;

  const existing = db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!existing) {
    return { ok: false, error: "Task not found" };
  }

  const next = {
    ...existing,
    ...(rest.title !== undefined ? { title: rest.title } : {}),
    ...(rest.description !== undefined ? { description: rest.description ?? null } : {}),
    ...(rest.priority !== undefined ? { priority: rest.priority } : {}),
    ...(rest.status !== undefined ? { status: rest.status } : {}),
    ...(rest.dueDate !== undefined ? { dueDate: rest.dueDate ?? null } : {}),
    updatedAt: nowIso(),
  };

  // Keep `completedAt` in sync with status transitions.
  if (rest.status !== undefined) {
    next.completedAt = rest.status === "done" ? (existing.completedAt ?? nowIso()) : null;
  }

  try {
    db.update(tasks).set(next).where(eq(tasks.id, id)).run();
    revalidatePath("/");
    return { ok: true, data: mapTask(next) };
  } catch (error) {
    console.error("[stride] updateTask failed", error);
    return { ok: false, error: "Could not update task. Please try again." };
  }
}

/** Toggles a task between "done" and its previous open state ("todo"). */
export async function toggleTaskDone(input: { id: string }): Promise<ActionResult<Task>> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid task id" };
  }

  const existing = db.select().from(tasks).where(eq(tasks.id, parsed.data.id)).get();
  if (!existing) {
    return { ok: false, error: "Task not found" };
  }

  const nextStatus: TaskStatus = existing.status === "done" ? "todo" : "done";
  const now = nowIso();
  const next = {
    ...existing,
    status: nextStatus,
    completedAt: nextStatus === "done" ? now : null,
    updatedAt: now,
  };

  try {
    db.update(tasks).set(next).where(eq(tasks.id, existing.id)).run();
    revalidatePath("/");
    return { ok: true, data: mapTask(next) };
  } catch (error) {
    console.error("[stride] toggleTaskDone failed", error);
    return { ok: false, error: "Could not update task." };
  }
}

export async function deleteTask(input: { id: string }): Promise<ActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid task id" };
  }
  try {
    db.delete(tasks).where(eq(tasks.id, parsed.data.id)).run();
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    console.error("[stride] deleteTask failed", error);
    return { ok: false, error: "Could not delete task." };
  }
}

/** Bulk delete completed tasks — used by "Clear completed" UI. */
export async function clearCompletedTasks(): Promise<ActionResult<{ count: number }>> {
  try {
    const completed = db.select({ id: tasks.id }).from(tasks).where(eq(tasks.status, "done")).all();
    if (completed.length === 0) {
      return { ok: true, data: { count: 0 } };
    }
    db.delete(tasks).where(eq(tasks.status, "done")).run();
    revalidatePath("/");
    return { ok: true, data: { count: completed.length } };
  } catch (error) {
    console.error("[stride] clearCompletedTasks failed", error);
    return { ok: false, error: "Could not clear completed tasks." };
  }
}
