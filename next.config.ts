import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // better-sqlite3 ships a native binary; mark it external so Next does not
  // attempt to bundle it into the server build.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
