import type { Metadata } from "next";

import { OfflineShell } from "@/app/offline/offline-shell";

export const metadata: Metadata = {
  title: "Offline",
  description: "You're offline. Stride keeps working with your most recent tasks.",
  // Don't index the offline shell; it's only ever served by the SW.
  robots: { index: false, follow: false },
};

/**
 * Offline fallback page. The service worker (`src/app/sw.ts`) routes
 * navigation requests here when both network and the runtime page cache
 * miss — typically a first-ever cold visit while offline.
 *
 * The page is a static, dependency-free server component so Serwist can
 * precache it at build time. The interactive piece (reading the
 * IndexedDB-cached task list) is delegated to `<OfflineShell />`.
 */
export default function OfflinePage() {
  return <OfflineShell />;
}
