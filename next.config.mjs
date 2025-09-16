// next.config.mjs
import nextPWA from "next-pwa";

const withPWA = nextPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: { document: "/offline" },
  buildExcludes: [/app-build-manifest\.json$/],   // ★ これを追加
});

/** @type {import("next").NextConfig} */   // ← これが型注釈（補完は効く）
const config = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

export default withPWA(config);
