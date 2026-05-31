"use client";

import * as React from "react";

import { getQueueDepth } from "@/lib/pwa/db";

/* ------------------------------------------------------------------ */
/* useOnline                                                           */
/* ------------------------------------------------------------------ */

/**
 * Subscribe to the browser's online/offline events. Returns `true` until
 * we have a definite answer (i.e. SSR / initial render) so optimistic UI
 * doesn't flash "offline" between hydration and first effect.
 */
export function useOnline(): boolean {
  const [online, setOnline] = React.useState(true);

  React.useEffect(() => {
    setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return online;
}

/* ------------------------------------------------------------------ */
/* useInstallPrompt                                                    */
/* ------------------------------------------------------------------ */

/**
 * The install-prompt event isn't typed in lib.dom.d.ts.
 * Defining the minimal shape we use keeps the rest of the codebase in
 * `strict` mode without `any`.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: readonly string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

interface InstallPromptState {
  /** True once the browser has fired `beforeinstallprompt`. */
  canInstall: boolean;
  /** Triggers the native install dialog. Returns the user's choice. */
  prompt: () => Promise<"accepted" | "dismissed" | "unavailable">;
  /** True once the app is running in standalone mode (PWA installed). */
  isStandalone: boolean;
}

/**
 * Capture the browser's `beforeinstallprompt` event so the UI can offer
 * a custom "Install" affordance. Once captured, the event is held until
 * the user accepts or dismisses; some browsers only fire it once per
 * session, so we don't re-arm.
 */
export function useInstallPrompt(): InstallPromptState {
  const [event, setEvent] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = React.useState(false);

  React.useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setEvent(null);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // Detect already-installed state (open from home-screen / launcher).
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari uses a non-standard `navigator.standalone`.
      ("standalone" in window.navigator && (window.navigator as Navigator & { standalone?: boolean }).standalone === true);
    setIsStandalone(Boolean(standalone));

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const prompt = React.useCallback(async () => {
    if (!event) return "unavailable" as const;
    await event.prompt();
    const choice = await event.userChoice;
    setEvent(null);
    return choice.outcome;
  }, [event]);

  return { canInstall: event !== null, prompt, isStandalone };
}

/* ------------------------------------------------------------------ */
/* useQueueDepth                                                       */
/* ------------------------------------------------------------------ */

/**
 * Live count of queued offline mutations. Polled lightly because there's
 * no first-class "IDB changed" event; instead we listen for window
 * "stride:queue-changed" custom events that other modules dispatch when
 * they enqueue or drain entries.
 */
export function useQueueDepth(): number {
  const [depth, setDepth] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const d = await getQueueDepth();
      if (!cancelled) setDepth(d);
    };

    refresh();
    const handler = () => {
      void refresh();
    };
    window.addEventListener("stride:queue-changed", handler);
    return () => {
      cancelled = true;
      window.removeEventListener("stride:queue-changed", handler);
    };
  }, []);

  return depth;
}

/** Helper for emitting the queue-changed event from non-React code. */
export function emitQueueChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("stride:queue-changed"));
}
