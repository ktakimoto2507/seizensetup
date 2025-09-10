"use client";
import { useRef, useState } from "react";
import { appendResult } from "@/lib/results";

const WORD_SETS: string[][] = [
  ["sakura", "neko", "hoshi"],
  ["kumo", "mizu", "yuki"],
  ["kaze", "mori", "tsuki"],
];

export default function Ex00Page() {
  const [words, setWords] = useState<string[] | null>(null);
  const [visible, setVisible] = useState(false);
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const startedAtRef = useRef<string | null>(null);

  function handleStart() {
    startedAtRef.current = new Date().toISOString();
    const idx = Math.floor(Math.random() * WORD_SETS.length);
    setWords(WORD_SETS[idx]);
    setAnswer("");
    setScore(null);
    setVisible(true);
    setTimeout(() => setVisible(false), 5000); // 5秒表示
  }

  function handleCheck() {
    if (!words) return;
    const inputs = answer
      .split(/\s+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const set = new Set(words.map((w) => w.toLowerCase()));
    const hits = inputs.reduce((n, w) => n + (set.has(w) ? 1 : 0), 0);
    const sc = Math.max(0, Math.round((hits / words.length) * 100));
    setScore(sc);

    appendResult({
      id: "ex00",
      startedAt: startedAtRef.current ?? new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      score: sc,
      detail: { shown: words, input: inputs, hits },
    });
  }

  return (
    <main className="grid gap-4 rounded-2xl bg-white p-6 shadow">
      <h1 className="text-xl font-bold">ex00：記憶チェック</h1>
      <p className="text-sm text-gray-600">単語を5秒表示 → 記憶してスペース区切りで入力してください。</p>

      <div className="flex gap-3">
        <button className="rounded-xl border px-4 py-2 hover:bg-gray-50" onClick={handleStart}>
          開始（5秒表示）
        </button>
        <a className="rounded-xl border px-4 py-2 hover:bg-gray-50" href="/home">
          HOMEへ戻る
        </a>
      </div>

      <div className="rounded border bg-gray-50 p-4 text-lg tracking-wider">
        {visible && words ? words.join("   ") : <span className="text-gray-400">（未表示）</span>}
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">入力（スペース区切り）</label>
        <input
          className="w-full rounded border px-3 py-2"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="例）sakura neko hoshi"
        />
      </div>

      <div className="flex gap-3">
        <button
          className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-60"
          onClick={handleCheck}
          disabled={!words}
        >
          採点
        </button>
        {score !== null && <p className="self-center text-sm">スコア：<b>{score}</b> 点</p>}
      </div>
    </main>
  );
}
