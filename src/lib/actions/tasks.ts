"use server";

import { revalidatePath } from "next/cache";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";

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
    position: row.position,
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

/**
 * Returns all tasks ordered by user-controlled `position` ascending. Ties
 * (e.g. a fresh database) fall back to most-recently-updated.
 */
export async function listTasks(): Promise<Task[]> {
  const rows = db
    .select()
    .from(tasks)
    .orderBy(asc(tasks.position), desc(tasks.updatedAt))
    .all();
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

  // Newly captured tasks go to the top of the list — drop a position one
  // less than the current minimum so we don't have to renumber anything.
  const minPositionRow = db
    .select({ min: sql<number | null>`MIN(${tasks.position})` })
    .from(tasks)
    .get();
  const minPosition = minPositionRow?.min ?? 0;
  const position = (minPosition ?? 0) - 1;

  const row = {
    id: nanoid(),
    title: data.title,
    description: data.description ?? null,
    priority: data.priority,
    status: data.status,
    dueDate: data.dueDate ?? null,
    completedAt: data.status === "done" ? now : null,
    position,
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

/* ------------------------------------------------------------------ */
/* Reorder                                                            */
/* ------------------------------------------------------------------ */

const reorderSchema = z.object({
  /** Full list of task ids in the new desired top-to-bottom order. */
  orderedIds: z.array(z.string().min(1)).min(1),
});

/**
 * Persist a new manual order for the entire task list. The client is the
 * source of truth here — it knows the optimistic state including any
 * filters the user has applied — so it sends the full ordering. We
 * renumber positions 0..N-1 in a single transaction.
 */
export async function reorderTasks(input: {
  orderedIds: string[];
}): Promise<ActionResult> {
  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid reorder payload" };
  }
  const { orderedIds } = parsed.data;

  try {
    // Sanity: only update ids that actually exist. Discard unknown ids
    // rather than failing the whole reorder.
    const existing = db
      .select({ id: tasks.id })
      .from(tasks)
      .where(inArray(tasks.id, orderedIds))
      .all();
    const existingSet = new Set(existing.map((row) => row.id));
    const filtered = orderedIds.filter((id) => existingSet.has(id));
    if (filtered.length === 0) {
      return { ok: true };
    }

    const updateOne = (id: string, position: number) =>
      db.update(tasks).set({ position, updatedAt: nowIso() }).where(eq(tasks.id, id)).run();

    const tx = db.transaction(() => {
      for (let i = 0; i < filtered.length; i++) {
        updateOne(filtered[i]!, i);
      }
    });
    tx();

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    console.error("[stride] reorderTasks failed", error);
    return { ok: false, error: "Could not save the new order." };
  }
}
