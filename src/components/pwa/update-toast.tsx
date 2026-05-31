"use client";

import * as React from "react";
import { toast } from "sonner";

/**
 * Listens for the custom `stride:sw-update` event dispatched by
 * `<ServiceWorkerRegistration />` when a new service worker has finished
 * installing. Renders a sticky toast with a "Refresh" action; on confirm
 * we post `SKIP_WAITING` to the new worker, which will fire
 * `controllerchange` and trigger a single page reload.
 */
export function UpdateToast() {
  React.useEffect(() => {
    let dismiss: (() => void) | null = null;

    const handler = (event: Event) => {
      const ce = event as CustomEvent<{ worker: ServiceWorker }>;
      const worker = ce.detail?.worker;
      if (!worker) return;

      // Avoid stacking multiple toasts if updatefound fires repeatedly.
      dismiss?.();

      const id = toast.message("A new version of Stride is available", {
        description: "Refresh to load the latest improvements.",
        duration: Number.POSITIVE_INFINITY,
        action: {
          label: "Refresh",
          onClick: () => {
            worker.postMessage({ type: "SKIP_WAITING" });
          },
        },
      });
      dismiss = () => toast.dismiss(id);
    };

    window.addEventListener("stride:sw-update", handler);
    return () => {
      window.removeEventListener("stride:sw-update", handler);
      dismiss?.();
    };
  }, []);

  return null;
}
