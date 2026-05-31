"use client";

import * as React from "react";
import { CloudOff, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useOnline } from "@/lib/pwa/hooks";
import { readCachedTasks } from "@/lib/pwa/db";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/lib/constants";

export function OfflineShell() {
  const online = useOnline();
  const [tasks, setTasks] = React.useState<Task[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void readCachedTasks().then((cached) => {
      if (!cancelled) setTasks(cached);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The service worker will refresh the page automatically on the next
  // navigation, but offer a manual reload affordance the moment we're
  // back online.
  React.useEffect(() => {
    if (!online) return;
    const t = setTimeout(() => {
      // Soft reload — keeps scroll if possible.
      window.location.reload();
    }, 600);
    return () => clearTimeout(t);
  }, [online]);

  return (
    <div className="container flex flex-col items-stretch gap-8 py-10 sm:py-14">
      <header className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "grid size-10 place-items-center rounded-full",
              online ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600",
            )}
          >
            <CloudOff className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {online ? "Reconnecting…" : "You're offline"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {online
                ? "We just regained connectivity. Refreshing the dashboard."
                : "Stride is showing your most recently synced tasks. Edits made while offline will sync as soon as you reconnect."}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          aria-label="Try to reload"
        >
          <RotateCw className="size-4" />
          Try again
        </Button>
      </header>

      <section
        aria-label="Last-known tasks"
        className="rounded-xl border bg-card/40 shadow-sm"
      >
        <div className="border-b px-4 py-3 text-sm font-medium sm:px-6">
          Last-known tasks
          {tasks ? (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {tasks.length} cached
            </span>
          ) : null}
        </div>
        {tasks === null ? (
          <Skeleton />
        ) : tasks.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground sm:px-6">
            Nothing cached yet — the next time you open Stride online, the
            offline shell will be ready.
          </p>
        ) : (
          <ul className="divide-y">
            {tasks.map((t) => (
              <li
                key={t.id}
                className={cn(
                  "flex items-center justify-between gap-3 px-4 py-3 text-sm sm:px-6",
                  t.status === "done" && "opacity-60",
                )}
              >
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate",
                    t.status === "done" && "line-through",
                  )}
                  title={t.title}
                >
                  {t.title}
                </span>
                <span className="hidden whitespace-nowrap text-xs text-muted-foreground sm:inline">
                  {STATUS_LABEL[t.status]} · {PRIORITY_LABEL[t.priority]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Skeleton() {
  return (
    <ul className="divide-y">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-3 sm:px-6">
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="ml-auto h-3 w-16 animate-pulse rounded bg-muted" />
        </li>
      ))}
    </ul>
  );
}
