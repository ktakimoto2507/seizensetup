"use client";
import { useAppStore } from "@/lib/store";

const labels = ["登録", "本人確認", "資産/配分", "確認"];

export function Stepper() {
  const step = useAppStore((s) => s.step);
  return (
    <div className="flex items-center justify-center gap-4 text-sm my-4" suppressHydrationWarning>
      {labels.map((label, i) => {
        const active = i === step;
        const done = i < step;
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
            <span className={`${active ? "font-semibold" : "text-gray-600"}`}>{label}</span>
            {i < labels.length - 1 && <div className="w-8 h-[2px] bg-gray-300" />}
          </div>
        );
      })}
    </div>
  );
}
