"use client";

/**
 * Client-side tasks store.
 *
 * Why not `useOptimistic`? Because the optimistic state it tracks is
 * automatically discarded once a transition resolves. That works when
 * every mutation triggers a `revalidatePath` (online), but breaks for
 * offline mutations that succeed locally without a server round-trip —
 * the optimistic update would vanish the moment the action settled.
 *
 * Instead we hold the canonical list in a regular `useState`, layer
 * optimistic edits straight on top, and reconcile when the server pushes
 * fresh `initialTasks` via prop change (after a successful action's
 * `revalidatePath`).
 */
import * as React from "react";
import { nanoid } from "nanoid";
import { toast } from "sonner";

import type { TaskStatus } from "@/lib/constants";
import {
  runClearCompleted,
  runCreate,
  runDelete,
  runToggle,
  runUpdate,
} from "@/lib/pwa/actions";
import { cacheTasks } from "@/lib/pwa/db";
import type { Task } from "@/lib/types";
import type { UpdateTaskInput } from "@/lib/validations/task";

export interface NewTaskInput {
  title: string;
  description?: string;
  priority: Task["priority"];
  status: TaskStatus;
  dueDate?: string;
}

export type TaskPatch = Omit<UpdateTaskInput, "id">;

interface TasksStore {
  tasks: Task[];
  createTask: (input: NewTaskInput) => Promise<{ ok: boolean }>;
  updateTask: (id: string, patch: TaskPatch) => Promise<{ ok: boolean }>;
  toggleTask: (id: string) => Promise<{ ok: boolean }>;
  removeTask: (id: string) => Promise<{ ok: boolean }>;
  clearCompleted: () => Promise<{ ok: boolean }>;
}

const TasksContext = React.createContext<TasksStore | null>(null);

export function useTasks(): TasksStore {
  const ctx = React.useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used within <TasksProvider>");
  return ctx;
}

const QUEUED_TOAST = {
  title: "Saved offline",
  description: "We'll sync your changes the moment you're back online.",
};

function nowIso() {
  return new Date().toISOString();
}

export function TasksProvider({
  initialTasks,
  children,
}: {
  initialTasks: Task[];
  children: React.ReactNode;
}) {
  const [tasks, setTasks] = React.useState<Task[]>(initialTasks);

  // Reconcile when server-revalidated `initialTasks` arrive (post-mutation).
  React.useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Mirror the latest visible list into IndexedDB so the `/offline` shell
  // can render it when the network (and HTML cache) are unavailable.
  React.useEffect(() => {
    void cacheTasks(tasks).catch((error) => {
      console.warn("[stride] failed to cache tasks", error);
    });
  }, [tasks]);

  /** Show the appropriate toast given a server response. */
  function notify(
    result: { ok: boolean; queued?: boolean; error?: string },
    fallbackError: string,
  ) {
    if (result.queued) {
      toast.message(QUEUED_TOAST.title, { description: QUEUED_TOAST.description });
      return;
    }
    if (!result.ok) toast.error(result.error ?? fallbackError);
  }

  const createTask = React.useCallback(
    async (input: NewTaskInput): Promise<{ ok: boolean }> => {
      const id = nanoid();
      const now = nowIso();
      const optimistic: Task = {
        id,
        title: input.title,
        description: input.description ?? null,
        priority: input.priority,
        status: input.status,
        dueDate: input.dueDate ?? null,
        completedAt: input.status === "done" ? now : null,
        createdAt: now,
        updatedAt: now,
      };
      setTasks((prev) => [optimistic, ...prev]);

      const r = await runCreate({
        id,
        title: input.title,
        description: input.description,
        priority: input.priority,
        status: input.status,
        dueDate: input.dueDate,
      });
      if (!r.ok && !r.queued) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
        toast.error(r.error ?? "Could not create task");
        return { ok: false };
      }
      // Reconcile with the server's authoritative copy when we got one.
      if (r.ok && r.data) {
        const server = r.data;
        setTasks((prev) => prev.map((t) => (t.id === id ? server : t)));
      }
      notify(r, "Could not create task");
      return { ok: true };
    },
    [],
  );

  const updateTask = React.useCallback(
    async (id: string, patch: TaskPatch): Promise<{ ok: boolean }> => {
      let original: Task | undefined;
      setTasks((prev) => {
        original = prev.find((t) => t.id === id);
        if (!original) return prev;
        const now = nowIso();
        const next: Task = {
          ...original,
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.description !== undefined ? { description: patch.description ?? null } : {}),
          ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
          ...(patch.status !== undefined ? { status: patch.status } : {}),
          ...(patch.dueDate !== undefined ? { dueDate: patch.dueDate ?? null } : {}),
          updatedAt: now,
        };
        if (patch.status !== undefined) {
          next.completedAt = patch.status === "done" ? (original.completedAt ?? now) : null;
        }
        return prev.map((t) => (t.id === id ? next : t));
      });
      if (!original) return { ok: false };

      const r = await runUpdate({ id, ...patch });
      if (!r.ok && !r.queued) {
        const orig = original;
        setTasks((prev) => prev.map((t) => (t.id === id ? orig : t)));
        toast.error(r.error ?? "Could not update task");
        return { ok: false };
      }
      if (r.ok && r.data) {
        const server = r.data;
        setTasks((prev) => prev.map((t) => (t.id === id ? server : t)));
      }
      notify(r, "Could not update task");
      return { ok: true };
    },
    [],
  );

  const toggleTask = React.useCallback(
    async (id: string): Promise<{ ok: boolean }> => {
      let prevStatus: TaskStatus | undefined;
      let prevCompletedAt: string | null | undefined;
      setTasks((prev) => {
        const target = prev.find((t) => t.id === id);
        if (!target) return prev;
        prevStatus = target.status;
        prevCompletedAt = target.completedAt;
        const next: TaskStatus = target.status === "done" ? "todo" : "done";
        const now = nowIso();
        return prev.map((t) =>
          t.id === id
            ? {
                ...t,
                status: next,
                completedAt: next === "done" ? now : null,
                updatedAt: now,
              }
            : t,
        );
      });
      if (prevStatus === undefined) return { ok: false };

      const r = await runToggle({ id });
      if (!r.ok && !r.queued) {
        const status = prevStatus;
        const completedAt = prevCompletedAt ?? null;
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status, completedAt } : t)),
        );
        toast.error(r.error ?? "Could not update task");
        return { ok: false };
      }
      notify(r, "Could not update task");
      return { ok: true };
    },
    [],
  );

  const removeTask = React.useCallback(
    async (id: string): Promise<{ ok: boolean }> => {
      let original: Task | undefined;
      let originalIndex = -1;
      setTasks((prev) => {
        originalIndex = prev.findIndex((t) => t.id === id);
        if (originalIndex < 0) return prev;
        original = prev[originalIndex];
        return prev.filter((t) => t.id !== id);
      });
      if (!original) return { ok: false };

      const r = await runDelete({ id });
      if (!r.ok && !r.queued) {
        const restore = original;
        const idx = originalIndex;
        setTasks((prev) => {
          const next = prev.slice();
          next.splice(Math.min(idx, next.length), 0, restore);
          return next;
        });
        toast.error(r.error ?? "Could not delete task");
        return { ok: false };
      }
      if (r.ok) toast.success("Task deleted");
      else notify(r, "Could not delete task");
      return { ok: true };
    },
    [],
  );

  const clearCompleted = React.useCallback(async (): Promise<{ ok: boolean }> => {
    let removed: Task[] = [];
    setTasks((prev) => {
      removed = prev.filter((t) => t.status === "done");
      return prev.filter((t) => t.status !== "done");
    });
    if (removed.length === 0) return { ok: true };

    const r = await runClearCompleted();
    if (!r.ok && !r.queued) {
      const restore = removed;
      setTasks((prev) => [...prev, ...restore]);
      toast.error(r.error ?? "Could not clear completed tasks");
      return { ok: false };
    }
    if (r.ok && !r.queued) {
      const count = r.data?.count ?? removed.length;
      if (count > 0) {
        toast.success(`Cleared ${count} completed task${count === 1 ? "" : "s"}`);
      }
    } else {
      notify(r, "Could not clear completed tasks");
    }
    return { ok: true };
  }, []);

  const value = React.useMemo<TasksStore>(
    () => ({ tasks, createTask, updateTask, toggleTask, removeTask, clearCompleted }),
    [tasks, createTask, updateTask, toggleTask, removeTask, clearCompleted],
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}
