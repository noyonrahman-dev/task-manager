"use client";

import * as React from "react";

/**
 * Registers the service worker once on mount.
 *
 * Skipped in development because Serwist intentionally does not generate
 * `public/sw.js` while `next dev` is running — registering would 404.
 *
 * On `updatefound` we dispatch a `stride:sw-update` CustomEvent that
 * carries the waiting worker. `<UpdateToast />` listens for it and surfaces
 * a "Refresh" affordance to the user.
 *
 * On `controllerchange` (i.e. after the user accepts an update and the new
 * worker takes control) we reload the page exactly once.
 */
export function ServiceWorkerRegistration() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    let cancelled = false;
    let refreshing = false;

    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        if (cancelled) return;

        // If a worker is already waiting (new version queued during a
        // previous visit), surface the update prompt immediately.
        if (registration.waiting && navigator.serviceWorker.controller) {
          window.dispatchEvent(
            new CustomEvent("stride:sw-update", {
              detail: { worker: registration.waiting },
            }),
          );
        }

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              window.dispatchEvent(
                new CustomEvent("stride:sw-update", {
                  detail: { worker: newWorker },
                }),
              );
            }
          });
        });
      })
      .catch((error: unknown) => {
        console.error("[stride] service worker registration failed", error);
      });

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  return null;
}
