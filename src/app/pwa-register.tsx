// src/app/pwa-register.tsx
"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    // ★ 開発では登録しない
    if (process.env.NODE_ENV !== "production") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => console.log("SW registered"))
        .catch((e) => console.error("SW register failed", e));
    }
  }, []);

  return null;
}
