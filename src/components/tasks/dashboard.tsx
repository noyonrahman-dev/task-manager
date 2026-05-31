"use client";

import * as React from "react";
import { Plus, Sparkles, Trash } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/tasks/empty-state";
import { TaskFilters, type TaskFiltersValue } from "@/components/tasks/task-filters";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskList } from "@/components/tasks/task-list";
import { TaskStats } from "@/components/tasks/task-stats";
import { type TaskStatus } from "@/lib/constants";
import {
  clearCompletedTasks,
  deleteTask,
  reorderTasks,
  toggleTaskDone,
} from "@/lib/actions/tasks";
import type { Task } from "@/lib/types";

interface DashboardProps {
  initialTasks: Task[];
}

type OptimisticAction =
  | { type: "toggle"; id: string }
  | { type: "delete"; id: string }
  | { type: "clear-completed" }
  | { type: "reorder"; tasks: Task[] };

function optimisticReducer(state: Task[], action: OptimisticAction): Task[] {
  switch (action.type) {
    case "toggle": {
      return state.map((t) => {
        if (t.id !== action.id) return t;
        const next: TaskStatus = t.status === "done" ? "todo" : "done";
        return {
          ...t,
          status: next,
          completedAt: next === "done" ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString(),
        };
      });
    }
    case "delete":
      return state.filter((t) => t.id !== action.id);
    case "clear-completed":
      return state.filter((t) => t.status !== "done");
    case "reorder":
      return action.tasks;
    default:
      return state;
  }
}

export function Dashboard({ initialTasks }: DashboardProps) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [filters, setFilters] = React.useState<TaskFiltersValue>({
    query: "",
    status: "all",
    priority: "all",
  });
  const [optimisticTasks, applyOptimistic] = React.useOptimistic(
    initialTasks,
    optimisticReducer,
  );
  const [, startTransition] = React.useTransition();

  function handleToggle(id: string) {
    startTransition(async () => {
      applyOptimistic({ type: "toggle", id });
      const r = await toggleTaskDone({ id });
      if (!r.ok) toast.error(r.error ?? "Could not update task");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      applyOptimistic({ type: "delete", id });
      const r = await deleteTask({ id });
      if (!r.ok) toast.error(r.error ?? "Could not delete task");
      else toast.success("Task deleted");
    });
  }

  function handleClearCompleted() {
    startTransition(async () => {
      applyOptimistic({ type: "clear-completed" });
      const r = await clearCompletedTasks();
      if (!r.ok) toast.error(r.error ?? "Could not clear completed tasks");
      else if (r.data && r.data.count > 0) {
        toast.success(`Cleared ${r.data.count} completed task${r.data.count === 1 ? "" : "s"}`);
      }
    });
  }

  function handleReorder(nextVisible: Task[]) {
    // Helper: mirror the filter logic used to build `visibleTasks` below.
    const isVisible = (t: Task): boolean => {
      if (filters.status !== "all" && t.status !== filters.status) return false;
      if (filters.priority !== "all" && t.priority !== filters.priority) return false;
      const q = filters.query.trim().toLowerCase();
      if (q && !`${t.title} ${t.description ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    };

    // The visible list is a filtered subset of the global list. We rebuild
    // a new global ordering by walking the global list and replacing each
    // "visible slot" (a task that is currently visible) with the next task
    // from `nextVisible`. Hidden tasks keep their global positions.
    const visibleIds = new Set(optimisticTasks.filter(isVisible).map((t) => t.id));
    let cursor = 0;
    const nextGlobal: Task[] = [];
    for (const task of optimisticTasks) {
      if (visibleIds.has(task.id)) {
        const replacement = nextVisible[cursor++];
        if (replacement) nextGlobal.push(replacement);
      } else {
        nextGlobal.push(task);
      }
    }

    startTransition(async () => {
      applyOptimistic({ type: "reorder", tasks: nextGlobal });
      const r = await reorderTasks({ orderedIds: nextGlobal.map((t) => t.id) });
      if (!r.ok) toast.error(r.error ?? "Could not save the new order");
    });
  }

  const counts = React.useMemo(() => {
    const c = { all: optimisticTasks.length, todo: 0, in_progress: 0, done: 0 } as Record<
      "all" | TaskStatus,
      number
    >;
    for (const t of optimisticTasks) c[t.status] += 1;
    return c;
  }, [optimisticTasks]);

  const completedCount = counts.done;

  const visibleTasks = React.useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    // Order matches the global order — drag-and-drop is the source of truth
    // now; we no longer apply automatic priority/status sorting.
    return optimisticTasks.filter((t) => {
      if (filters.status !== "all" && t.status !== filters.status) return false;
      if (filters.priority !== "all" && t.priority !== filters.priority) return false;
      if (q && !`${t.title} ${t.description ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [optimisticTasks, filters]);

  const isEmpty = optimisticTasks.length === 0;
  const isFiltered =
    !isEmpty &&
    visibleTasks.length === 0 &&
    (filters.query !== "" || filters.status !== "all" || filters.priority !== "all");

  return (
    <div className="space-y-6 sm:space-y-8">
      <Greeting />

      <TaskStats tasks={optimisticTasks} />

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold sm:text-lg">Your tasks</h2>
          <div className="flex items-center gap-2">
            {completedCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearCompleted}
                className="text-muted-foreground"
              >
                <Trash className="size-4" />
                Clear completed
              </Button>
            ) : null}
            <TaskFormDialog
              open={createOpen}
              onOpenChange={setCreateOpen}
              trigger={
                <Button size="sm">
                  <Plus className="size-4" />
                  New task
                </Button>
              }
            />
          </div>
        </div>

        <TaskFilters value={filters} counts={counts} onChange={setFilters} />

        {isEmpty ? (
          <EmptyState
            title="No tasks yet"
            description="Capture your first task to start building momentum. Stride keeps it lightweight, you stay focused."
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Sparkles className="size-4" />
                Create your first task
              </Button>
            }
          />
        ) : isFiltered ? (
          <EmptyState
            title="No matches"
            description="Try adjusting the search or filters to find what you're looking for."
            action={
              <Button
                variant="outline"
                onClick={() => setFilters({ query: "", status: "all", priority: "all" })}
              >
                Reset filters
              </Button>
            }
          />
        ) : (
          <TaskList
            tasks={visibleTasks}
            onToggleDone={handleToggle}
            onDelete={handleDelete}
            onReorder={handleReorder}
          />
        )}
      </section>
    </div>
  );
}

function Greeting() {
  // The greeting depends on the user's local time, which would differ
  // between server render and client hydration. Render the time-dependent
  // pieces only after mount to avoid hydration mismatches.
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setNow(new Date());
  }, []);

  if (!now) {
    return (
      <div className="space-y-1" aria-hidden>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Welcome back<span className="text-muted-foreground">.</span>
        </h1>
        <p className="h-5 text-sm text-muted-foreground">&nbsp;</p>
      </div>
    );
  }

  const hour = now.getHours();
  const greeting =
    hour < 5
      ? "Working late?"
      : hour < 12
        ? "Good morning"
        : hour < 18
          ? "Good afternoon"
          : "Good evening";
  const dateString = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {greeting}
        <span className="text-muted-foreground">.</span>
      </h1>
      <p className="text-sm text-muted-foreground">{dateString}</p>
    </div>
  );
}
