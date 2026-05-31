/**
 * Replays the offline mutation queue against the server. Driven by the
 * browser's `online` event and the `<UpdateAndSync />` component.
 *
 * Replay is sequential and oldest-first so dependent operations land in
 * the right order (e.g. an update referencing a task that was created
 * while offline).
 */
import {
  clearCompletedTasks,
  createTask,
  deleteTask,
  toggleTaskDone,
  updateTask,
} from "@/lib/actions/tasks";
import {
  listQueuedMutations,
  type QueuedMutation,
  removeQueuedMutation,
  updateQueuedMutation,
} from "@/lib/pwa/db";
import { emitQueueChanged } from "@/lib/pwa/hooks";
import type { ActionResult } from "@/lib/types";

const MAX_ATTEMPTS = 3;

/** Dispatch a queued mutation to the matching server action. */
async function dispatch(mutation: QueuedMutation): Promise<ActionResult<unknown>> {
  switch (mutation.kind) {
    case "create":
      return createTask(mutation.payload);
    case "update":
      return updateTask(mutation.payload);
    case "delete":
      return deleteTask(mutation.payload);
    case "toggle":
      return toggleTaskDone(mutation.payload);
    case "clearCompleted":
      return clearCompletedTasks();
  }
}

export interface DrainResult {
  succeeded: number;
  failed: number;
  remaining: number;
}

/**
 * Drains the queue once. Resolves with a summary so the UI can toast
 * progress. Network errors leave the entry in place; persistent server
 * errors increment `attempts` and eventually drop the entry to avoid an
 * infinite retry loop.
 */
export async function drainQueue(): Promise<DrainResult> {
  const result: DrainResult = { succeeded: 0, failed: 0, remaining: 0 };
  const pending = await listQueuedMutations();

  for (const mutation of pending) {
    try {
      const r = await dispatch(mutation);
      if (r.ok) {
        await removeQueuedMutation(mutation.id);
        result.succeeded += 1;
        continue;
      }
      // Server returned a non-ok result (validation, not-found, etc.). Bump
      // the attempts counter; drop after MAX_ATTEMPTS so we don't loop.
      const nextAttempts = mutation.attempts + 1;
      if (nextAttempts >= MAX_ATTEMPTS) {
        await removeQueuedMutation(mutation.id);
        result.failed += 1;
        console.warn(
          `[stride] dropping queued ${mutation.kind} after ${nextAttempts} failed attempts:`,
          r.error,
        );
      } else {
        await updateQueuedMutation({
          ...mutation,
          attempts: nextAttempts,
          lastError: r.error,
        });
        result.remaining += 1;
      }
    } catch (error) {
      // Network failure (we went offline mid-replay). Stop draining and
      // wait for the next `online` event.
      console.warn("[stride] drain interrupted:", error);
      result.remaining = pending.length - result.succeeded - result.failed;
      break;
    }
  }

  emitQueueChanged();
  return result;
}
