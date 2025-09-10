"use client";
import { useMemo, useRef, useState } from "react";
import { appendResult } from "@/lib/results";

const BOX = 300;

export default function Machina00Page() {
  const target = useMemo(
    () => ({ x: Math.floor(Math.random() * BOX), y: Math.floor(Math.random() * BOX) }),
    []
  );
  const [lastDist, setLastDist] = useState<number | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const startedAt = useRef<string | null>(null);
  const startedMs = useRef<number | null>(null);

  function onStart() {
    startedAt.current = new Date().toISOString();
    startedMs.current = Date.now();
    setLastDist(null);
    setScore(null);
  }

  function onClickBox(e: React.MouseEvent<HTMLDivElement>) {
    if (!startedMs.current) onStart();
    const rect = (e.target as HTMLDivElement).getBoundingClientRect();
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);
    const dx = x - target.x;
    const dy = y - target.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    setLastDist(dist);

    // 150px を誤差基準に 0..100 へ正規化（小さいほど高得点）
    const sc = Math.max(0, Math.min(100, Math.round(100 - (dist / 150) * 100)));
    setScore(sc);

    appendResult({
      id: "machina00",
      startedAt: startedAt.current ?? new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      score: sc,
      detail: { click: { x, y }, target, distance: Math.round(dist), timeMs: Date.now() - (startedMs.current ?? Date.now()) },
    });
  }

  return (
    <main className="grid gap-4 rounded-2xl bg-white p-6 shadow">
      <h1 className="text-xl font-bold">machina00：座標あて</h1>
      <p className="text-sm text-gray-600">ボックス内をクリックして、隠れたターゲット座標に近づけてください。</p>

      <div
        className="relative rounded border bg-gray-50"
        style={{ width: BOX, height: BOX, cursor: "crosshair" }}
        onClick={onClickBox}
        title="クリックで判定"
      />

      <div className="text-sm">
        {lastDist == null ? (
          <span className="text-gray-600">まだクリックしていません。</span>
        ) : (
          <span>
            距離推定：<b>{Math.round(lastDist)}px</b> ／ スコア：<b>{score}</b>
          </span>
        )}
      </div>

      <div className="flex gap-3">
        <button className="rounded-xl border px-4 py-2 hover:bg-gray-50" onClick={onStart}>リセット</button>
        <a className="rounded-xl border px-4 py-2 hover:bg-gray-50" href="/home">HOMEへ戻る</a>
      </div>
    </main>
  );
}
