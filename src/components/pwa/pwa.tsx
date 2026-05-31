"use client";

import { AutoSync } from "@/components/pwa/auto-sync";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { UpdateToast } from "@/components/pwa/update-toast";

/**
 * Side-effect-only PWA wiring. Mounted once from the root layout.
 *
 * The visible offline banner is rendered separately by `<OfflineBanner />`
 * directly in the layout so it sits in the natural document flow under
 * the site header (sticky positioning needs the right DOM order).
 */
export function Pwa() {
  return (
    <>
      <ServiceWorkerRegistration />
      <UpdateToast />
      <AutoSync />
    </>
  );
}
