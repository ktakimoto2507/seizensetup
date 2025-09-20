// src/app/sync-provider.tsx
"use client";

import type { ReactNode } from "react";

/**
 * 将来「ローカル→Supabaseの同期」や「認証状態監視」などを入れる器。
 * いまはそのまま children を返すだけのダミー。
 */
export default function SyncProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
