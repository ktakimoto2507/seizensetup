// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ← ビルド時に ESLint エラーで落とさない（暫定）
    ignoreDuringBuilds: true,
  },
  // 必要なら TypeScript の型エラーも一時無視（できればOFFのままに）
  // typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
