/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

/**
 * Stride service worker.
 *
 * Built with Serwist (the actively-maintained successor to Workbox / next-pwa).
 * The bundler in `@serwist/next` injects `self.__SW_MANIFEST` at build time
 * with the list of static assets to precache; the file is generated at
 * `public/sw.js` (gitignored) and registered from the client by
 * `<ServiceWorkerRegistration />`.
 */

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // Don't auto-skipWaiting — the update toast in the UI asks the user,
  // then posts a SKIP_WAITING message when they confirm. This avoids the
  // classic "page reloads while I'm typing" anti-pattern.
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    ...defaultCache,
  ],
  /**
   * If the network fails AND the navigation cache misses (e.g. first-ever
   * visit while offline), serve the static `/offline` page. Static assets
   * fall back to whatever Serwist's defaults provide.
   */
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

serwist.addEventListeners();
