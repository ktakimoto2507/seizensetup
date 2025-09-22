"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";

const labels = ["登録", "本人確認", "資産/配分", "確認"];

export function Stepper() {
  const step = useAppStore((s) => s.step); // 0-based 前提（0=登録, 1=本人確認, 2=資産/配分, 3=確認）
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // SSR中は -1 にして「全部非アクティブ」＝ サーバHTMLと水和直後の見た目を一致
  const curr = mounted ? step : -1;

  return (
    <div className="flex items-center justify-center gap-4 text-sm my-4">
      {labels.map((label, i) => {
        const active = i === curr;
        const done   = i < curr;

        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full grid place-items-center ${
                active ? "bg-green-600 text-white"
                : done ? "bg-green-200"
                : "bg-gray-200"
              }`}
              title={label}
              aria-current={active ? "step" : undefined}
            >
              {i + 1}
            </div>
            <span className={active ? "font-semibold" : "text-gray-600"}>{label}</span>
            {i < labels.length - 1 && (
              <div className={`w-8 h-[2px] ${done ? "bg-emerald-300" : "bg-gray-300"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
