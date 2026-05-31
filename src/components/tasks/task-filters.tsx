"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export type StatusFilter = TaskStatus | "all";
export type PriorityFilter = TaskPriority | "all";

export interface TaskFiltersValue {
  query: string;
  status: StatusFilter;
  priority: PriorityFilter;
}

interface TaskFiltersProps {
  value: TaskFiltersValue;
  counts: Record<StatusFilter, number>;
  onChange: (next: TaskFiltersValue) => void;
}

export function TaskFilters({ value, counts, onChange }: TaskFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value.query}
            onChange={(e) => onChange({ ...value, query: e.target.value })}
            placeholder="Search tasks…"
            className="pl-9"
            aria-label="Search tasks"
          />
        </div>
        <select
          value={value.priority}
          onChange={(e) =>
            onChange({ ...value, priority: e.target.value as PriorityFilter })
          }
          aria-label="Filter by priority"
          className={cn(
            "flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
        >
          <option value="all">All priorities</option>
          {TASK_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </option>
          ))}
        </select>
      </div>

      <div
        role="tablist"
        aria-label="Filter by status"
        className="flex w-full overflow-x-auto rounded-lg border bg-muted/40 p-1 text-sm"
      >
        <FilterTab
          isActive={value.status === "all"}
          onClick={() => onChange({ ...value, status: "all" })}
          label="All"
          count={counts.all}
        />
        {TASK_STATUSES.map((s) => (
          <FilterTab
            key={s}
            isActive={value.status === s}
            onClick={() => onChange({ ...value, status: s })}
            label={STATUS_LABEL[s]}
            count={counts[s]}
          />
        ))}
      </div>
    </div>
  );
}

function FilterTab({
  isActive,
  onClick,
  label,
  count,
}: {
  isActive: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isActive
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
          isActive
            ? "bg-muted text-muted-foreground"
            : "bg-muted/60 text-muted-foreground/80",
        )}
      >
        {count}
      </span>
    </button>
  );
}
