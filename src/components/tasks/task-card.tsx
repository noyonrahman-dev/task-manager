"use client";

import * as React from "react";
import {
  CalendarDays,
  Check,
  Circle,
  CircleDot,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { format, formatDistanceToNowStrict, isPast, isToday } from "date-fns";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { cn, parseDueDate } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  /** Optional optimistic toggle handler. Falls back to direct server action. */
  onToggleDone?: (id: string) => void;
  onDelete?: (id: string) => void;
  /** Whether drag-to-reorder is currently allowed. Disables the grip handle. */
  draggable?: boolean;
}

const STATUS_ICON: Record<TaskStatus, React.ComponentType<{ className?: string }>> = {
  todo: Circle,
  in_progress: CircleDot,
  done: Check,
};

export function TaskCard({
  task,
  onToggleDone,
  onDelete,
  draggable = true,
}: TaskCardProps) {
  const [editing, setEditing] = React.useState(false);
  const [, startTransition] = React.useTransition();

  const sortable = useSortable({
    id: task.id,
    disabled: !draggable,
  });
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = sortable;

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

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

  const due = parseDueDate(task.dueDate);
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
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex gap-2 rounded-xl border bg-card p-4 shadow-sm transition-all animate-fade-in",
        "hover:border-border hover:shadow-md",
        isDone && "opacity-70",
        isDragging && "z-10 shadow-lg ring-2 ring-ring/40",
      )}
    >
      {/* Drag handle — only this surface initiates a drag, so checkbox / menu
          interactions on the card are unaffected. */}
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={draggable ? "Drag to reorder" : "Reordering disabled while filters are active"}
        disabled={!draggable}
        {...attributes}
        {...listeners}
        className={cn(
          "-ml-1 mt-0.5 grid size-7 shrink-0 cursor-grab touch-none place-items-center rounded-md text-muted-foreground/50 transition-colors",
          "hover:bg-accent hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "active:cursor-grabbing",
          "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground/50",
          // On hover-capable devices, hide until the row is hovered/focused;
          // on touch devices keep it always visible so it's reachable.
          "sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
          isDragging && "sm:opacity-100",
        )}
      >
        <GripVertical className="size-4" />
      </button>

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
