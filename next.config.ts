import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

/**
 * Serwist is the spiritual successor to next-pwa. It generates the service
 * worker bundle from `swSrc` and writes it to `swDest`, then exposes the
 * precache manifest via `self.__SW_MANIFEST` at build time.
 *
 * `disable: process.env.NODE_ENV !== "production"` skips SW generation
 * during `next dev`, which is the recommended default — service workers
 * cache aggressively and trip up hot reloading.
 */
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV !== "production",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // better-sqlite3 ships a native binary; mark it external so Next does not
  // attempt to bundle it into the server build.
  serverExternalPackages: ["better-sqlite3"],
};

export default withSerwist(nextConfig);
