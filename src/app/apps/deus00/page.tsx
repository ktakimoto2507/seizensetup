"use client";

import { useEffect, useRef, useState } from "react";
import { appendResult } from "@/lib/results";

// 百人一首（サンプル）
const POEMS = [
  { poet: "天智天皇", text: "秋の田の　かりほの庵の　苫をあらみ　わが衣手は　露にぬれつつ" },
  { poet: "在原業平", text: "ちはやぶる　神代もきかず　竜田川　からくれなゐに　水くくるとは" },
  { poet: "小野小町", text: "花の色は　移りにけりな　いたづらに　わが身世にふる　ながめせしまに" },
  { poet: "柿本人麻呂", text: "あしびきの　山鳥の尾の　しだり尾の　ながながし夜を　ひとりかも寝む" },
  { poet: "凡河内躬恒", text: "心あてに　折らばや折らむ　初霜の　置きまどはせる　白菊の花" },
];

/* ---------- 正規化ヘルパー（採点用） ----------
   - カタカナ→ひらがな
   - 旧仮名づかい：「ゐ/ヰ → い」「ゑ/ヱ → え」
   - 空白・句読点などは無視
------------------------------------------------ */
function toHiragana(s: string) {
  return s.replace(/[\u30A1-\u30F6]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}
function normalizeJP(s: string) {
  return toHiragana(s)
    .replace(/[ゐヰ]/g, "い")
    .replace(/[ゑヱ]/g, "え")
    .replace(/[ \u3000、。・，．,.\n\r\t]/g, "")
    .trim();
}
function accuracyPercent(targetRaw: string, inputRaw: string) {
  const t = normalizeJP(targetRaw);
  const i = normalizeJP(inputRaw);
  const n = t.length;
  if (!n) return 0;
  let hit = 0;
  for (let idx = 0; idx < Math.min(n, i.length); idx++) {
    if (t[idx] === i[idx]) hit++;
  }
  return Math.round((hit / n) * 100);
}
function charsPerMinute(chars: number, ms: number) {
  const minutes = ms / 60000;
  return minutes > 0 ? Math.round((chars / minutes) * 10) / 10 : 0;
}

export default function TypingPoem() {
  const [poem, setPoem] = useState<typeof POEMS[number] | null>(null);
  const [input, setInput] = useState("");
  const [metrics, setMetrics] = useState<{ wpm: number; accuracy: number } | null>(null);
  const startedAt = useRef<string>("");
  const beginTime = useRef<number | null>(null);

  // ★ マウント後にだけランダム選択 → SSRとズレない
  useEffect(() => {
    setPoem(POEMS[Math.floor(Math.random() * POEMS.length)]);
    startedAt.current = new Date().toISOString();
  }, []);

  function onFocus() {
    if (beginTime.current == null) beginTime.current = performance.now();
  }

  function grade() {
    if (!poem) return;
    const end = performance.now();
    const start = beginTime.current ?? end;
    const elapsed = end - start;

    const wpm = charsPerMinute(input.length, elapsed);
    const acc = accuracyPercent(poem.text, input);
    setMetrics({ wpm, accuracy: acc });

    const score = Math.round((acc * 0.75) + Math.min(wpm, 300) * 0.083);

    appendResult({
      app: "deus00",
      startedAt: startedAt.current,
      finishedAt: new Date().toISOString(),
      score,
      meta: { 
        poet: poem.poet,
        text: poem.text,
        input,
        wpm,
        accuracy: acc,
      },
      // detail: { poet: poem.poet, text: poem.text, input, wpm, accuracy: acc },
    });
  }

  if (!poem) {
    return (
      <main className="rounded-2xl bg-white p-6 shadow max-w-2xl mx-auto grid gap-4">
        <h1 className="text-xl font-bold">タイピング測定（百人一首）</h1>
        <p className="text-sm text-gray-600">読み込み中…</p>
      </main>
    );
  }

  return (
    <main className="rounded-2xl bg-white p-6 shadow max-w-2xl mx-auto grid gap-4">
      <h1 className="text-xl font-bold">タイピング測定（百人一首）</h1>
      <p className="text-sm text-gray-600">WPM（Words Per Minute）は 1分あたりの入力文字数の目安です。</p>
      <p className="text-sm text-emerald-700">
        ※ 旧仮名づかいの「ゐ」「ゑ」は「い」「え」として扱います。空白や句読点は無視されます。
      </p>

      <div className="rounded bg-emerald-50 border border-emerald-200 p-4 leading-7">{poem.text}</div>

      <textarea
        className="min-h-32 w-full rounded border p-3"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onFocus={onFocus}
        placeholder="ここに入力…（例：ちはやぶる…）"
      />

      <div className="flex gap-3">
        <button
          className="rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
          onClick={grade}
        >
          採点
        </button>
        <a className="rounded-xl border px-4 py-2 hover:bg-gray-50" href="/home">
          HOMEへ
        </a>
      </div>

      {metrics && (
        <div className="rounded border p-4">
          <p>作者：<b>{poem.poet}</b></p>
          <p>WPM：<b>{metrics.wpm}</b></p>
          <p>正確性：<b>{metrics.accuracy}%</b></p>
          <div className="mt-2 flex gap-3">
            <a className="rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700" href="/apps/deus00">
              もう一度
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
