import type { MetadataRoute } from "next";

import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";

/**
 * Dynamic Web App Manifest. Served at `/manifest.webmanifest`. Replaces the
 * older static file at `public/manifest.webmanifest`.
 *
 * Tuned for both Android and desktop installs:
 *  - `display: "standalone"` removes browser chrome on install
 *  - `display_override` hints desktop browsers to use a window-controls
 *    overlay (Chrome/Edge) for a more native feel, falling back to plain
 *    standalone when unsupported
 *  - Three icon sizes: 192 (Android), 512 (high-density), and a 512
 *    maskable variant for Android adaptive icons
 *  - One shortcut so the "Create new task" intent is reachable from a
 *    long-press on the home-screen icon (Android) and from jump lists on
 *    Windows / macOS
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/?source=pwa",
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "browser"],
    orientation: "any",
    background_color: "#0a0a0c",
    theme_color: "#6366f1",
    categories: ["productivity", "utilities"],
    lang: "en",
    dir: "ltr",
    prefer_related_applications: false,
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Create new task",
        short_name: "New task",
        description: "Capture something to do",
        url: "/?action=new-task",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
