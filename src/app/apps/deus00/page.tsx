"use client";
import { useEffect, useRef, useState } from "react";
import { appendResult } from "@/lib/results";

const SAMPLE = "Time flies like an arrow; code flows like a river.";

function calcMetrics(startMs: number, typed: string) {
  const elapsedMin = Math.max(0.001, (Date.now() - startMs) / 60000);
  const correct = typed.split("").filter((ch, i) => ch === SAMPLE[i]).length;
  const accuracy = typed.length === 0 ? 0 : Math.round((correct / typed.length) * 100);
  const wpm = Math.round((typed.length / 5) / elapsedMin);
  return { wpm, accuracy };
}

export default function Deus00Page() {
  const [typed, setTyped] = useState("");
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [done, setDone] = useState(false);
  const startedAtIso = useRef<string | null>(null);
  const startMsRef = useRef<number | null>(null);
  const savedRef = useRef(false); // 二重保存防止

  function ensureStart() {
    if (startMsRef.current == null) {
      startMsRef.current = Date.now();
      startedAtIso.current = new Date().toISOString();
    }
  }

  useEffect(() => {
    if (startMsRef.current != null) {
      const m = calcMetrics(startMsRef.current, typed);
      setWpm(m.wpm);
      setAccuracy(m.accuracy);
      if (typed.length >= SAMPLE.length) setDone(true);
    }
  }, [typed]);

  useEffect(() => {
    if (done && startMsRef.current != null && !savedRef.current) {
      savedRef.current = true;
      appendResult({
        id: "deus00",
        startedAt: startedAtIso.current ?? new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        score: accuracy, // スコアは正確性%
        detail: { wpm, accuracy, targetLength: SAMPLE.length },
      });
    }
  }, [done, wpm, accuracy]);

  return (
    <main className="grid gap-4 rounded-2xl bg-white p-6 shadow">
      <h1 className="text-xl font-bold">deus00：タイピング計測</h1>
      <p className="text-sm text-gray-600">下の文を正確にタイプしてください。終わると自動で結果を保存します。</p>

      <div className="rounded bg-gray-100 p-4 leading-7 font-mono">{SAMPLE}</div>

      <textarea
        className="min-h-32 w-full rounded border p-3 font-mono"
        placeholder="ここにタイプ…"
        value={typed}
        onChange={(e) => {
          ensureStart();
          setTyped(e.target.value);
        }}
      />

      <div className="flex gap-4 text-sm">
        <div>WPM：<b>{wpm}</b></div>
        <div>正確性：<b>{accuracy}%</b></div>
        {done && <div className="text-green-700">完了！結果を保存しました。</div>}
      </div>

      <div>
        <a className="rounded-xl border px-4 py-2 hover:bg-gray-50" href="/home">HOMEへ戻る</a>
      </div>
    </main>
  );
}
