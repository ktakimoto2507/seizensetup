// next.config.ts
import type { NextConfig } from "next";
import nextPWA from "next-pwa";

const withPWA = nextPWA({
  dest: "public",            // SWとキャッシュ出力先
  register: true,            // 自動登録
  skipWaiting: true,         // 即時有効化
  disable: process.env.NODE_ENV === "development", // 開発時は無効に
  fallbacks: { document: "/offline" },             // オフライン時の代替ページ
});

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },   // ← 既存を維持
  typescript: { ignoreBuildErrors: false } // ← 既存を維持
  // 必要なら他のNext設定をここに追加
};

export default withPWA(nextConfig);
