import type { TaskPriority, TaskStatus } from "@/lib/constants";

export type { TaskPriority, TaskStatus };

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActionResult<T = void> {
  ok: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  /**
   * Set by the client-side offline wrapper (`src/lib/pwa/actions.ts`) when
   * the network call failed and the mutation was queued for later replay.
   * Server actions never set this directly.
   */
  queued?: boolean;
}
