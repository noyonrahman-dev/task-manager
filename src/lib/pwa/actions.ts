/**
 * Offline-aware wrappers around the `tasks` server actions.
 *
 * Strategy: optimistic UI is handled in the dashboard via `useOptimistic`;
 * these wrappers only deal with the network round-trip. They try the server
 * action first and, if the network fails (or the device is offline), they
 * persist the mutation in IndexedDB so it can be replayed when connectivity
 * returns.
 */
import { nanoid } from "nanoid";

import {
  clearCompletedTasks,
  createTask,
  deleteTask,
  toggleTaskDone,
  updateTask,
} from "@/lib/actions/tasks";
import { enqueueMutation, type QueuedMutation } from "@/lib/pwa/db";
import { emitQueueChanged } from "@/lib/pwa/hooks";
import type { ActionResult, Task } from "@/lib/types";
import type { CreateTaskInput, UpdateTaskInput } from "@/lib/validations/task";

const QUEUED_OK: ActionResult<undefined> = { ok: true, queued: true };

/**
 * Run a server action, falling back to the offline queue when the network
 * call cannot complete. We treat any thrown error as a candidate for
 * queueing only when the browser reports it's offline; genuine server
 * errors (4xx/5xx) bubble up via a regular `{ ok: false }` result so
 * callers don't have to deal with rejected promises.
 */
async function runOrQueue<TInput, TOutput>(
  serverAction: (input: TInput) => Promise<ActionResult<TOutput>>,
  input: TInput,
  queued: QueuedMutation,
): Promise<ActionResult<TOutput | undefined>> {
  try {
    return await serverAction(input);
  } catch (error) {
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    if (offline) {
      await enqueueMutation(queued);
      emitQueueChanged();
      return QUEUED_OK as ActionResult<TOutput | undefined>;
    }
    // Online but the request still failed (transient blip, deploy in
    // progress, …). Surface a structured failure rather than a thrown
    // promise so the caller can revert optimistic state without ceremony.
    const message =
      error instanceof Error ? error.message : "Network error. Please try again.";
    return { ok: false, error: message };
  }
}

function nowIso() {
  return new Date().toISOString();
}

function makeQueuedId() {
  return `q_${nanoid()}`;
}

/* ------------------------------------------------------------------ */
/* Public wrappers                                                     */
/* ------------------------------------------------------------------ */

export async function runCreate(
  input: CreateTaskInput & { id: string },
): Promise<ActionResult<Task | undefined>> {
  return runOrQueue(createTask, input, {
    id: makeQueuedId(),
    kind: "create",
    payload: input,
    createdAt: nowIso(),
    attempts: 0,
  });
}

export async function runUpdate(
  input: UpdateTaskInput,
): Promise<ActionResult<Task | undefined>> {
  return runOrQueue(updateTask, input, {
    id: makeQueuedId(),
    kind: "update",
    payload: input,
    createdAt: nowIso(),
    attempts: 0,
  });
}

export async function runDelete(input: { id: string }): Promise<ActionResult<undefined>> {
  return runOrQueue(deleteTask, input, {
    id: makeQueuedId(),
    kind: "delete",
    payload: input,
    createdAt: nowIso(),
    attempts: 0,
  });
}

export async function runToggle(input: { id: string }): Promise<ActionResult<Task | undefined>> {
  return runOrQueue(toggleTaskDone, input, {
    id: makeQueuedId(),
    kind: "toggle",
    payload: input,
    createdAt: nowIso(),
    attempts: 0,
  });
}

export async function runClearCompleted(): Promise<ActionResult<{ count: number } | undefined>> {
  return runOrQueue(
    () => clearCompletedTasks(),
    undefined as never,
    {
      id: makeQueuedId(),
      kind: "clearCompleted",
      payload: {},
      createdAt: nowIso(),
      attempts: 0,
    },
  );
}
