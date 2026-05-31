import { CalendarClock, CheckCircle2, ListTodo, Loader2 } from "lucide-react";
import { isToday } from "date-fns";

import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StatCard {
  label: string;
  value: number;
  hint?: string;
  Icon: React.ComponentType<{ className?: string }>;
  iconClassName: string;
}

export function TaskStats({ tasks }: { tasks: Task[] }) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "done").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const dueToday = tasks.filter(
    (t) => t.status !== "done" && t.dueDate && isToday(new Date(t.dueDate)),
  ).length;

  const cards: StatCard[] = [
    {
      label: "All tasks",
      value: total,
      hint: total === 0 ? "Nothing tracked yet" : `${total - completed} open`,
      Icon: ListTodo,
      iconClassName: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    },
    {
      label: "Due today",
      value: dueToday,
      hint: dueToday === 0 ? "You're clear today" : "Needs your focus",
      Icon: CalendarClock,
      iconClassName: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    {
      label: "In progress",
      value: inProgress,
      hint: inProgress === 0 ? "Pick something up" : "Keep going",
      Icon: Loader2,
      iconClassName: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    {
      label: "Completed",
      value: completed,
      hint: completed === 0 ? "Awaiting first win" : "Nice work",
      Icon: CheckCircle2,
      iconClassName: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
  ];

  return (
    <section
      aria-label="Task overview"
      className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
    >
      {cards.map((c) => (
        <div
          key={c.label}
          className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm"
        >
          <div className={cn("grid size-10 place-items-center rounded-lg", c.iconClassName)}>
            <c.Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-muted-foreground">{c.label}</div>
            <div className="flex items-baseline gap-2">
              <div className="text-xl font-semibold tabular-nums">{c.value}</div>
              {c.hint ? (
                <div className="truncate text-xs text-muted-foreground">{c.hint}</div>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
