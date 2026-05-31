import { z } from "zod";

import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";

const isoDateString = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "Invalid date",
  });

/** Shared field-level rules so create/update stay in sync. */
const titleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(140, "Title must be 140 characters or fewer");

const descriptionSchema = z
  .string()
  .trim()
  .max(2000, "Description must be 2000 characters or fewer")
  .optional()
  .or(z.literal(""))
  .transform((v) => (v && v.length > 0 ? v : undefined));

const prioritySchema = z.enum(TASK_PRIORITIES);
const statusSchema = z.enum(TASK_STATUSES);

const dueDateSchema = z
  .union([isoDateString, z.literal("")])
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

export const createTaskSchema = z.object({
  /**
   * Optional client-generated id. Used by the offline mutation queue so
   * a task created while offline keeps the same id once the queued create
   * is replayed against the server. The server falls back to a fresh
   * nanoid when this is absent.
   */
  id: z.string().min(1).max(64).optional(),
  title: titleSchema,
  description: descriptionSchema,
  priority: prioritySchema.default("medium"),
  status: statusSchema.default("todo"),
  dueDate: dueDateSchema,
});

export const updateTaskSchema = z.object({
  id: z.string().min(1),
  title: titleSchema.optional(),
  description: descriptionSchema,
  priority: prioritySchema.optional(),
  status: statusSchema.optional(),
  dueDate: dueDateSchema,
});

export const idSchema = z.object({ id: z.string().min(1) });

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
