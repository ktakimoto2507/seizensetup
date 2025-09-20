// types/next-pwa.d.ts
declare module "next-pwa" {
  import type { NextConfig } from "next";
  type PWAOptions = {
    dest?: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
    fallbacks?: { document?: string };
    [key: string]: unknown;
  };
  const init: (options?: PWAOptions) => (config: NextConfig) => NextConfig;
  export default init;
}
