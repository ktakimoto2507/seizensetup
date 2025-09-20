/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true }, // ← これで Vercel の build 中に ESLint を無視
  // typescript は落とさないほうが安全
  typescript: { ignoreBuildErrors: false },
};
export default nextConfig; // mjs/ts の場合
// module.exports = nextConfig; // js の場合はこちら
