"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { drainQueue } from "@/lib/pwa/sync";

/**
 * Drains the offline mutation queue when the browser regains
 * connectivity. Also runs once on mount in case a previous session left
 * pending entries behind.
 *
 * After a successful drain we call `router.refresh()` so the dashboard
 * picks up server-confirmed state (this is the equivalent of the
 * `revalidatePath` that would have fired had the mutation succeeded
 * online in the first place).
 */
export function AutoSync() {
  const router = useRouter();

  React.useEffect(() => {
    let drainInFlight = false;

    const drain = async () => {
      if (drainInFlight) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      drainInFlight = true;
      try {
        const result = await drainQueue();
        if (result.succeeded > 0) {
          toast.success(
            `Synced ${result.succeeded} pending change${result.succeeded === 1 ? "" : "s"}`,
          );
          router.refresh();
        }
        if (result.failed > 0) {
          toast.error(
            `${result.failed} change${result.failed === 1 ? "" : "s"} couldn't be synced and were dropped`,
          );
        }
      } finally {
        drainInFlight = false;
      }
    };

    void drain();

    const onOnline = () => void drain();
    window.addEventListener("online", onOnline);

    // Some browsers (notably Safari on iOS) don't reliably fire `online`
    // after waking from sleep. Re-check when the page becomes visible.
    const onVisibility = () => {
      if (document.visibilityState === "visible") void drain();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router]);

  return null;
}
