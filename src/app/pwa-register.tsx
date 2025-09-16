"use client";
import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const register = () => {
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .then((reg) => console.info("SW registered:", reg.scope))
          .catch((err) => console.error("SW registration failed:", err));
      };
      if (document.readyState === "complete") register();
      else window.addEventListener("load", register, { once: true });
    }
  }, []);
  return null;
}
