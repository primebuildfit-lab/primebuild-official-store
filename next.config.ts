import type { NextConfig } from "next";

/**
 * Next.js configuration for PrimeBuild Official Store.
 *
 * Desktop (Tauri) packaging only: when PBOS_DESKTOP_BUILD is set, emit a
 * self-contained `.next/standalone` server so the Tauri bundle can run the app
 * offline from a bundled Node runtime. Unset (normal web) builds are unchanged —
 * this is opt-in and never alters app behavior.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(process.env.PBOS_DESKTOP_BUILD ? { output: "standalone" as const } : {}),
};

export default nextConfig;
