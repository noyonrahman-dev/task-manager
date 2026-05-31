"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createTask, updateTask } from "@/lib/actions/tasks";
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/constants";
import type { Task } from "@/lib/types";
import { cn, dateToInputValue, parseDateInput, toDateInputValue } from "@/lib/utils";
import { createTaskSchema } from "@/lib/validations/task";

interface FormValues {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  /** ISO `YYYY-MM-DD`, empty string = unset. Kept as a string so RHF state stays serializable. */
  dueDate: string;
}

interface TaskFormDialogProps {
  task?: Task;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultStatus?: TaskStatus;
}

const PRIORITY_BUTTON_STYLES: Record<TaskPriority, string> = {
  urgent:
    "data-[active=true]:bg-priority-urgent/15 data-[active=true]:text-priority-urgent data-[active=true]:border-priority-urgent/40",
  high: "data-[active=true]:bg-priority-high/15 data-[active=true]:text-priority-high data-[active=true]:border-priority-high/40",
  medium:
    "data-[active=true]:bg-priority-medium/20 data-[active=true]:text-priority-medium data-[active=true]:border-priority-medium/40",
  low: "data-[active=true]:bg-priority-low/20 data-[active=true]:text-priority-low data-[active=true]:border-priority-low/40",
};

export function TaskFormDialog({
  task,
  trigger,
  open: controlledOpen,
  onOpenChange,
  defaultStatus = "todo",
}: TaskFormDialogProps) {
  const isEditing = Boolean(task);
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [isSubmitting, startTransition] = React.useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: getDefaults(task, defaultStatus),
  });

  // Reset the form whenever the dialog is (re)opened or the task changes.
  React.useEffect(() => {
    if (open) {
      form.reset(getDefaults(task, defaultStatus));
    }
  }, [open, task, defaultStatus, form]);

  const priority = form.watch("priority");

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const title = (values.title ?? "").trim();
      const description = (values.description ?? "").trim();
      // Convert the YYYY-MM-DD form value into a UTC-anchored ISO string.
      const dueDateIso = parseDateInput(values.dueDate);

      const payload = {
        title,
        description: description || undefined,
        priority: values.priority,
        status: values.status,
        dueDate: dueDateIso ?? undefined,
      };

      const result = isEditing && task
        ? await updateTask({ id: task.id, ...payload })
        : await createTask(payload);

      if (!result.ok) {
        if (result.fieldErrors) {
          for (const [name, messages] of Object.entries(result.fieldErrors)) {
            const message = messages?.[0];
            if (message) {
              form.setError(name as keyof FormValues, { type: "server", message });
            }
          }
        }
        toast.error(result.error ?? "Something went wrong");
        return;
      }
      toast.success(isEditing ? "Task updated" : "Task created");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details below to keep this task accurate."
              : "Capture what needs to be done. You can refine the details later."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              autoFocus
              maxLength={140}
              placeholder="Wire up the new auth endpoint"
              {...form.register("title")}
              aria-invalid={form.formState.errors.title ? true : undefined}
            />
            {form.formState.errors.title ? (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional notes, links, or acceptance criteria…"
              rows={3}
              maxLength={2000}
              {...form.register("description")}
            />
            {form.formState.errors.description ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.description.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label>Priority</Label>
            <div className="grid grid-cols-4 gap-2">
              {TASK_PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  data-active={priority === p}
                  onClick={() => form.setValue("priority", p, { shouldDirty: true })}
                  className={cn(
                    "rounded-md border bg-background px-2 py-1.5 text-xs font-medium transition-colors hover:bg-accent",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    PRIORITY_BUTTON_STYLES[p],
                  )}
                >
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Due date</Label>
              <Controller
                control={form.control}
                name="dueDate"
                render={({ field }) => {
                  const date = field.value ? parseInputDateAsLocal(field.value) : null;
                  return (
                    <DatePicker
                      value={date}
                      onChange={(d) => field.onChange(d ? dateToInputValue(d) : "")}
                      buttonProps={{ id: "dueDate" }}
                    />
                  );
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {isEditing ? "Saving…" : "Creating…"}
                </>
              ) : isEditing ? (
                "Save changes"
              ) : (
                "Create task"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Treat `YYYY-MM-DD` as a calendar day in the user's locale (not UTC), so the
 * Calendar highlights the same day the user picked even if the timezone
 * differs. We round-trip to UTC only when persisting.
 */
function parseInputDateAsLocal(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const y = match[1];
  const m = match[2];
  const d = match[3];
  if (!y || !m || !d) return null;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

function getDefaults(task: Task | undefined, fallbackStatus: TaskStatus): FormValues {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    priority: task?.priority ?? "medium",
    status: task?.status ?? fallbackStatus,
    dueDate: toDateInputValue(task?.dueDate ?? null),
  };
}
