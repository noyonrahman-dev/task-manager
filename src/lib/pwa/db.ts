/**
 * IndexedDB schema and accessors used for offline support.
 *
 * Two object stores:
 *   - `mutations` — pending writes that failed because we were offline.
 *     Drained automatically when the browser regains connectivity.
 *   - `tasks` — last-known list of tasks for the offline shell. Acts as
 *     a fallback when the cached HTML response is missing or stale.
 *
 * The DB is lazily opened on first use; opening on the server is a no-op
 * because `indexedDB` only exists in the browser.
 */
import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import type { Task } from "@/lib/types";
import type { CreateTaskInput, UpdateTaskInput } from "@/lib/validations/task";

export type QueuedMutation =
  | {
      id: string;
      kind: "create";
      payload: CreateTaskInput & { id: string };
      createdAt: string;
      attempts: number;
      lastError?: string;
    }
  | {
      id: string;
      kind: "update";
      payload: UpdateTaskInput;
      createdAt: string;
      attempts: number;
      lastError?: string;
    }
  | {
      id: string;
      kind: "delete";
      payload: { id: string };
      createdAt: string;
      attempts: number;
      lastError?: string;
    }
  | {
      id: string;
      kind: "toggle";
      payload: { id: string };
      createdAt: string;
      attempts: number;
      lastError?: string;
    }
  | {
      id: string;
      kind: "clearCompleted";
      payload: Record<string, never>;
      createdAt: string;
      attempts: number;
      lastError?: string;
    };

export type MutationKind = QueuedMutation["kind"];

interface StrideDB extends DBSchema {
  mutations: {
    key: string;
    value: QueuedMutation;
    indexes: { "by-created-at": string };
  };
  tasks: {
    key: string;
    value: Task;
    indexes: { "by-position": number };
  };
}

const DB_NAME = "stride";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<StrideDB>> | null = null;

/** Lazily open the IDB connection. Safe to call from a server context — it
 * just resolves to `null` when `indexedDB` isn't available. */
async function getDb(): Promise<IDBPDatabase<StrideDB> | null> {
  if (typeof indexedDB === "undefined") return null;
  if (!dbPromise) {
    dbPromise = openDB<StrideDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("mutations")) {
          const store = db.createObjectStore("mutations", { keyPath: "id" });
          store.createIndex("by-created-at", "createdAt");
        }
        if (!db.objectStoreNames.contains("tasks")) {
          const store = db.createObjectStore("tasks", { keyPath: "id" });
          store.createIndex("by-position", "position");
        }
      },
      blocked() {
        // Another tab is holding an old version open. Logging is enough —
        // the DB will eventually upgrade when the other tab closes.
        console.warn("[stride] IndexedDB upgrade blocked by another tab");
      },
      blocking() {
        // We're holding a connection that's blocking another tab's upgrade;
        // close ours so the upgrade can proceed.
        dbPromise = null;
      },
    });
  }
  return dbPromise;
}

/* ------------------------------------------------------------------ */
/* Mutation queue                                                     */
/* ------------------------------------------------------------------ */

export async function enqueueMutation(mutation: QueuedMutation): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.put("mutations", mutation);
}

/** Drain order = oldest first, so dependent ops (e.g. update after create) replay correctly. */
export async function listQueuedMutations(): Promise<QueuedMutation[]> {
  const db = await getDb();
  if (!db) return [];
  return db.getAllFromIndex("mutations", "by-created-at");
}

export async function removeQueuedMutation(id: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete("mutations", id);
}

export async function updateQueuedMutation(mutation: QueuedMutation): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.put("mutations", mutation);
}

export async function getQueueDepth(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  return db.count("mutations");
}

/* ------------------------------------------------------------------ */
/* Tasks cache (last-known)                                           */
/* ------------------------------------------------------------------ */

export async function cacheTasks(tasks: Task[]): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const tx = db.transaction("tasks", "readwrite");
  await tx.objectStore("tasks").clear();
  for (const t of tasks) {
    await tx.objectStore("tasks").put(t);
  }
  await tx.done;
}

export async function readCachedTasks(): Promise<Task[]> {
  const db = await getDb();
  if (!db) return [];
  return db.getAllFromIndex("tasks", "by-position");
}
