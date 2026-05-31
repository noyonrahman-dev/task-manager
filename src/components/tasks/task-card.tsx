"use client";

import * as React from "react";
import {
  CalendarDays,
  Check,
  Circle,
  CircleDot,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { format, formatDistanceToNowStrict, isPast, isToday } from "date-fns";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { StatusBadge } from "@/components/tasks/status-badge";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import {
  deleteTask,
  toggleTaskDone,
  updateTask,
} from "@/lib/actions/tasks";
import { STATUS_LABEL, TASK_STATUSES, type TaskStatus } from "@/lib/constants";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  /** Optional optimistic toggle handler. Falls back to direct server action. */
  onToggleDone?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const STATUS_ICON: Record<TaskStatus, React.ComponentType<{ className?: string }>> = {
  todo: Circle,
  in_progress: CircleDot,
  done: Check,
};

export function TaskCard({ task, onToggleDone, onDelete }: TaskCardProps) {
  const [editing, setEditing] = React.useState(false);
  const [, startTransition] = React.useTransition();

  const isDone = task.status === "done";

  function handleToggle() {
    if (onToggleDone) {
      onToggleDone(task.id);
      return;
    }
    startTransition(async () => {
      const r = await toggleTaskDone({ id: task.id });
      if (!r.ok) toast.error(r.error ?? "Could not update task");
    });
  }

  function handleStatusChange(status: TaskStatus) {
    if (status === task.status) return;
    startTransition(async () => {
      const r = await updateTask({ id: task.id, status });
      if (!r.ok) {
        toast.error(r.error ?? "Could not update task");
      } else {
        toast.success(`Moved to ${STATUS_LABEL[status]}`);
      }
    });
  }

  function handleDelete() {
    if (onDelete) {
      onDelete(task.id);
      return;
    }
    startTransition(async () => {
      const r = await deleteTask({ id: task.id });
      if (!r.ok) toast.error(r.error ?? "Could not delete task");
      else toast.success("Task deleted");
    });
  }

  const due = task.dueDate ? new Date(task.dueDate) : null;
  const overdue = due ? !isDone && isPast(due) && !isToday(due) : false;
  const dueLabel = due
    ? isToday(due)
      ? "Today"
      : overdue
        ? `Overdue · ${formatDistanceToNowStrict(due, { addSuffix: true })}`
        : format(due, "MMM d")
    : null;

  return (
    <div
      className={cn(
        "group flex gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all animate-fade-in",
        "hover:border-border hover:shadow-md",
        isDone && "opacity-70",
      )}
    >
      <div className="pt-0.5">
        <Checkbox
          checked={isDone}
          onCheckedChange={handleToggle}
          aria-label={isDone ? "Mark as not done" : "Mark as done"}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3
              className={cn(
                "truncate text-sm font-medium leading-snug sm:text-base",
                isDone && "text-muted-foreground line-through",
              )}
            >
              {task.title}
            </h3>
            {task.description ? (
              <p
                className={cn(
                  "mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm",
                  isDone && "line-through",
                )}
              >
                {task.description}
              </p>
            ) : null}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 sm:data-[state=open]:opacity-100"
                aria-label="Task options"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onSelect={() => setEditing(true)}>
                <Pencil /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Move to
              </DropdownMenuLabel>
              {TASK_STATUSES.map((s) => {
                const Icon = STATUS_ICON[s];
                return (
                  <DropdownMenuItem
                    key={s}
                    disabled={s === task.status}
                    onSelect={() => handleStatusChange(s)}
                  >
                    <Icon /> {STATUS_LABEL[s]}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={handleDelete}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={task.status} />
          {dueLabel ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs",
                overdue ? "text-destructive" : "text-muted-foreground",
              )}
            >
              <CalendarDays className="size-3.5" />
              {dueLabel}
            </span>
          ) : null}
        </div>
      </div>

      <TaskFormDialog task={task} open={editing} onOpenChange={setEditing} />
    </div>
  );
}
