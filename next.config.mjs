// next.config.mjs
import nextPWA from "next-pwa";

const withPWA = nextPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: { document: "/offline" },
  // Exclude App Router's build manifest from precache to avoid 404 warnings
  buildExcludes: [/app-build-manifest\.json$/],
});

/** @type {import("next").NextConfig} */
const config = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

export default withPWA(config);
