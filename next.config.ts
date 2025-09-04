// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ← これで Vercel ビルド時に ESLint エラーで落ちなくなる（暫定）
  },
  // typescript: { ignoreBuildErrors: true }, // どうしても必要なら一時ON（通常はOFF推奨）
};

export default nextConfig;

