'use client';
import { useEffect, useRef, useState } from 'react';
import type { TestResult } from '@/lib/types';
import { storage } from '@/lib/storage';

const SAMPLE =
  'ReactとNext.jsでタイピング速度と正確性を測定します。ゆっくりでも正確に入力してみましょう。';

export default function Deus00Page() {
  const startedAt = useRef<Date | null>(null);
  const [target] = useState(SAMPLE);
  const [input, setInput] = useState('');
  const [done, setDone] = useState(false);
  const [metrics, setMetrics] = useState<{ wpm: number; accuracy: number } | null>(null);

  useEffect(() => {
    if (input.length === 1 && !startedAt.current) startedAt.current = new Date();

    if (!done && input === target) {
      setDone(true);
      const finished = new Date();
      const start = startedAt.current ?? finished;
      const ms = finished.getTime() - start.getTime();
      const minutes = Math.max(ms / 60000, 1 / 60);
      const words = target.length / 5;
      const wpm = Math.round(words / minutes);

      let correct = 0;
      for (let i = 0; i < target.length; i++) if (target[i] === input[i]) correct++;
      const acc = Math.round((correct / target.length) * 100);

      setMetrics({ wpm, accuracy: acc });

      const result: TestResult = {
        id: 'deus00',
        startedAt: start.toISOString(),
        finishedAt: finished.toISOString(),
        score: Math.round((wpm / 80) * 60 + (acc / 100) * 40),
        detail: { wpm, accuracy: acc, length: target.length },
      };
      const history = storage.loadJSON<TestResult[]>('ss_results') || [];
      history.push(result);
      storage.saveJSON('ss_results', history);
    }
  }, [input, target, done]);

  return (
    <main className="rounded-2xl bg-white p-6 shadow grid gap-4">
      <h1 className="text-xl font-bold">deus00：タイピング</h1>
      <p className="text-sm text-gray-600">以下の文章を正確に入力してください。</p>
      <div className="rounded bg-gray-100 p-4 leading-7">{target}</div>
      <textarea
        className="min-h-32 w-full rounded border p-3"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="ここに入力"
      />
      {metrics && (
        <div className="rounded border p-4">
          <p>WPM（概算）: <b>{metrics.wpm}</b></p>
          <p>正確性: <b>{metrics.accuracy}%</b></p>
          <div className="mt-2 flex gap-3">
            <a className="btn-ghost" href="/home">ホームへ戻る</a>
            <button className="btn-primary" onClick={() => location.reload()}>もう一度</button>
          </div>
        </div>
      )}
    </main>
  );
}
