"use client";

import * as React from "react";
import { Plus, Sparkles, Trash } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/tasks/empty-state";
import { TaskFilters, type TaskFiltersValue } from "@/components/tasks/task-filters";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskList } from "@/components/tasks/task-list";
import { TaskStats } from "@/components/tasks/task-stats";
import { TasksProvider, useTasks } from "@/components/tasks/tasks-store";
import { PRIORITY_WEIGHT, STATUS_WEIGHT, type TaskStatus } from "@/lib/constants";
import type { Task } from "@/lib/types";

interface DashboardProps {
  initialTasks: Task[];
}

/**
 * Top-level wrapper. Lifts the `TasksProvider` so every descendant
 * (cards, dialogs) shares the same offline-aware client state.
 */
export function Dashboard({ initialTasks }: DashboardProps) {
  return (
    <TasksProvider initialTasks={initialTasks}>
      <DashboardInner />
    </TasksProvider>
  );
}

function DashboardInner() {
  const { tasks, clearCompleted } = useTasks();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [filters, setFilters] = React.useState<TaskFiltersValue>({
    query: "",
    status: "all",
    priority: "all",
  });

  // Honor `?action=new-task` (the install-time PWA shortcut). We strip the
  // query param after handling so refreshing doesn't re-open the dialog.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "new-task") {
      setCreateOpen(true);
      params.delete("action");
      const qs = params.toString();
      const url = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
      window.history.replaceState(null, "", url);
    }
  }, []);

  const counts = React.useMemo(() => {
    const c = { all: tasks.length, todo: 0, in_progress: 0, done: 0 } as Record<
      "all" | TaskStatus,
      number
    >;
    for (const t of tasks) c[t.status] += 1;
    return c;
  }, [tasks]);

  const completedCount = counts.done;

  const visibleTasks = React.useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return tasks
      .filter((t) => {
        if (filters.status !== "all" && t.status !== filters.status) return false;
        if (filters.priority !== "all" && t.priority !== filters.priority) return false;
        if (q && !`${t.title} ${t.description ?? ""}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort(compareTasks);
  }, [tasks, filters]);

  const isEmpty = tasks.length === 0;
  const isFiltered =
    !isEmpty &&
    visibleTasks.length === 0 &&
    (filters.query !== "" || filters.status !== "all" || filters.priority !== "all");

  return (
    <div className="space-y-6 sm:space-y-8">
      <Greeting />

      <TaskStats tasks={tasks} />

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold sm:text-lg">Your tasks</h2>
          <div className="flex items-center gap-2">
            {completedCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void clearCompleted()}
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
          <TaskList tasks={visibleTasks} />
        )}
      </section>
    </div>
  );
}

function compareTasks(a: Task, b: Task): number {
  // Status weight desc (in_progress first, done last)
  const statusDiff = STATUS_WEIGHT[b.status] - STATUS_WEIGHT[a.status];
  if (statusDiff !== 0) return statusDiff;

  // Priority weight desc
  const priorityDiff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
  if (priorityDiff !== 0) return priorityDiff;

  // Due date asc (sooner first), tasks without due dates last
  if (a.dueDate && b.dueDate) {
    const d = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    if (d !== 0) return d;
  } else if (a.dueDate) {
    return -1;
  } else if (b.dueDate) {
    return 1;
  }

  // Newest created first
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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
