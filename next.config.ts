import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts", swDest: "public/sw.js", disable: process.env.NODE_ENV === "development",
  register: false, reloadOnOnline: false,
  // No 73-MiB automatic image download. Fonts/compiled chunks are still precached.
  globPublicPatterns: ["manifest.json", "icon-*.png", "apple-touch-icon.png", "favicon.ico", "mushaf/catalog.json"],
  additionalPrecacheEntries: ["/", "/manifest.json", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png", "/mushaf/catalog.json"].map((url) => ({ url, revision: process.env.APP_RELEASE_VERSION ?? "2026-10-02-v4" })),
});
const config: NextConfig = {
  reactCompiler: true, turbopack: {}, allowedDevOrigins: ["*.e2b.app"],
  async rewrites() { return process.env.SUPABASE_INTERNAL_URL ? [{ source: "/supabase/:path*", destination: `${process.env.SUPABASE_INTERNAL_URL}/:path*` }] : []; },
  async headers() { return [{ source: "/:path*", headers: [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ] }]; },
};
export default withSerwist(config);
