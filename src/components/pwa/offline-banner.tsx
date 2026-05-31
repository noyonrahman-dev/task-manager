"use client";

import * as React from "react";
import { CloudOff, RefreshCw } from "lucide-react";

import { useOnline, useQueueDepth } from "@/lib/pwa/hooks";
import { cn } from "@/lib/utils";

/**
 * A slim, sticky banner that announces connectivity state and queued
 * mutations. Lives just under the site header; only renders when there's
 * something useful to say so it never gets in the way.
 */
export function OfflineBanner() {
  const online = useOnline();
  const queueDepth = useQueueDepth();

  // Three flavours, in order of priority:
  //   1. Offline + nothing queued → "you're offline" (calm)
  //   2. Offline + N queued       → "offline · N pending" (firmer)
  //   3. Online  + N queued       → "syncing N change(s)…" (transient)
  const visible = !online || queueDepth > 0;

  if (!visible) return null;

  let label: string;
  let Icon = CloudOff;
  let tone = "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30";

  if (!online && queueDepth > 0) {
    label = `Offline · ${queueDepth} change${queueDepth === 1 ? "" : "s"} queued`;
  } else if (!online) {
    label = "You're offline. Recent edits are saved locally.";
  } else {
    label = `Syncing ${queueDepth} change${queueDepth === 1 ? "" : "s"}…`;
    Icon = RefreshCw;
    tone =
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "sticky top-14 z-30 border-b text-xs sm:text-sm",
        "supports-[backdrop-filter]:bg-background/60 backdrop-blur",
        tone,
      )}
    >
      <div className="container flex items-center gap-2 py-1.5">
        <Icon
          className={cn(
            "size-3.5 shrink-0",
            online && queueDepth > 0 ? "animate-spin [animation-duration:1.4s]" : null,
          )}
        />
        <span className="truncate font-medium">{label}</span>
      </div>
    </div>
  );
}
