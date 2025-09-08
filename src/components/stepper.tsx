"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";

export function Stepper() {
  // 実ストアの値
  const step = useAppStore((s) => s.step);

  // ✅ マウント前は step=0 を固定して描画 → サーバと一致させてミスマッチ回避
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const renderStep = mounted ? step : 0;

  const labels = ["登録", "本人確認", "資産", "確認"];

  return (
    <div className="flex items-center gap-4">
      {labels.map((label, i) => {
        const active = renderStep === i;
        const done = renderStep > i;
        return (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full grid place-items-center ${
                active ? "bg-green-600 text-white" : done ? "bg-green-200" : "bg-gray-200"
              }`}
              title={label}
            >
              {i + 1}
            </div>
            <span className={active ? "font-semibold" : "text-gray-600"}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
