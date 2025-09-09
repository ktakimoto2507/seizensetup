'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { TestResult } from '@/lib/types';
import { storage } from '@/lib/storage';

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function Machina00Page() {
  const startedAt = useRef(new Date());
  const [size] = useState({ w: 320, h: 200 });
  const target = useMemo(() => ({ x: rand(20, 300), y: rand(20, 180) }), []);
  const [click, setClick] = useState<{ x: number; y: number } | null>(null);
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    if (!click) return;
    const dx = target.x - click.x;
    const dy = target.y - click.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const s = Math.max(0, Math.round(100 - dist)); // 近いほど高得点
    setScore(s);

    const result: TestResult = {
      id: 'machina00',
      startedAt: startedAt.current.toISOString(),
      finishedAt: new Date().toISOString(),
      score: s,
      detail: { target, click, dist: Math.round(dist) },
    };
    const history = storage.loadJSON<TestResult[]>('ss_results') || [];
    history.push(result);
    storage.saveJSON('ss_results', history);
  }, [click, target]);

  return (
    <main className="rounded-2xl bg-white p-6 shadow grid gap-4">
      <h1 className="text-xl font-bold">machina00：座標あてゲーム</h1>
      <p className="text-sm text-gray-600">グレーの枠内をクリックして、隠れた的の位置を当てよう。</p>

      <div
        className="relative rounded border bg-gray-50"
        style={{ width: size.w, height: size.h }}
        onClick={(e) => {
          const rect = (e.target as HTMLDivElement).getBoundingClientRect();
          const x = Math.round(e.clientX - rect.left);
          const y = Math.round(e.clientY - rect.top);
          setClick({ x, y });
        }}
      >
        {/* クリック位置 */}
        {click && (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
            style={{ left: click.x, top: click.y, width: 10, height: 10 }}
            title={`あなた: (${click.x}, ${click.y})`}
          />
        )}
      </div>

      {score !== null && (
        <div className="rounded border p-4">
          <p>
            結果：<b>{score}</b> 点（的は <code>({target.x}, {target.y})</code>）
          </p>
          <div className="mt-2 flex gap-3">
            <a className="btn-ghost" href="/home">ホームへ戻る</a>
            <button className="btn-primary" onClick={() => location.reload()}>もう一度</button>
          </div>
        </div>
      )}
    </main>
  );
}
