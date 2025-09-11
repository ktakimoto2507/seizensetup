"use client";

import { useEffect, useRef, useState } from "react";
import { appendResult } from "@/lib/results";

/** 記憶プール（必要なら自由に追加してください） */
const WORD_POOL = [
  "さくら","ふじさん","きつね","たんぽぽ","ほしぞら","かみなり","あさひ","ゆきやま","こおり",
  "かわら","おにぎり","えんぴつ","しんかんせん","とけい","おさら","はさみ","とりい","だるま",
  "すいか","もみじ","くじら","うさぎ","たけのこ","こけし","きんぎょ","せんす","かがみ","つき",
  "ゆうひ","あめのひ","ひまわり","たいこ","ふうせん","おりがみ","こま","しゃぼんだま","はなび",
  "しらゆき","こおろぎ","あさがお","やまのぼり","わたあめ","こいのぼり","だんご","よぞら",
  "すずめ","つばめ","ふくろう","せみ","くも","かぜ","なみ","しお","あさつゆ","こだま",
  "もみじば","いちょう","まつぼっくり","どんぐり","れんげ","すいせん","きく","うめ","もも",
  "かき","いちご","りんご","なし","ぶどう","みかん","さくらんぼ","かぼちゃ","なす","にんじん",
  "だいこん","おちゃ","きもの","ゆかた","まんじゅう","せんべい","おこのみやき","おでん","うどん",
  "そば","にぎりずし","てまり","すだち","あめ","ゆき","こゆき","まつり","おみこし","しゃちほこ"
];

type Question = { correct: string; options: string[] };
type Phase = "idle" | "memorize" | "quiz" | "result";

/* ---------- ヘルパー ---------- */
function sampleUnique<T>(arr: T[], n: number, exclude: Set<T> = new Set()): T[] {
  const pool = arr.filter((x) => !exclude.has(x));
  const out: T[] = [];
  while (out.length < n && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    out.push(pool[i]);
    pool.splice(i, 1);
  }
  return out;
}
function shuffled<T>(xs: T[]): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MemoryChoice() {
  const [phase, setPhase] = useState<Phase>("idle");

  // 記憶用セット & クイズ
  const [memorySet, setMemorySet] = useState<string[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<(string | null)[]>([]); // ユーザー選択

  // 進行
  const MEMO_SECONDS = 7; // ← ご要望どおり 7秒
  const [remain, setRemain] = useState(MEMO_SECONDS);
  const timerRef = useRef<number | null>(null);

  // 採点
  const [score, setScore] = useState<number | null>(null);
  const [resultDetail, setResultDetail] = useState<any>(null);

  // 記録時間
  const startedAt = useRef<string>("");
  const finishedAt = useRef<string>("");

  // 初期化（★スタートボタン押下時のみランダム生成 → SSRずれなし）
  function startTest() {
    const mem = sampleUnique(WORD_POOL, 6);
    setMemorySet(mem);

    const qs: Question[] = [];
    const usedCorrect = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const [correct] = sampleUnique(mem, 1, usedCorrect);
      usedCorrect.add(correct);
      const wrongs = sampleUnique(WORD_POOL, 3, new Set<string>(mem));
      qs.push({ correct, options: shuffled([correct, ...wrongs]) });
    }
    setQuestions(qs);
    setAnswers(Array(qs.length).fill(null));

    setPhase("memorize");
    setRemain(MEMO_SECONDS);
    startedAt.current = new Date().toISOString();

    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setRemain((s) => {
        if (s <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          setPhase("quiz");
          return 0;
        }
        return s - 1;
      });
    }, 1000) as unknown as number;
  }

  useEffect(() => {
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, []);

  const [qIndex, setQIndex] = useState(0);

  function choose(option: string) {
    const next = answers.slice();
    next[qIndex] = option;
    setAnswers(next);
  }

  function nextOrFinish() {
    if (qIndex < questions.length - 1) {
      setQIndex(qIndex + 1);
    } else {
      // 採点
      const total = questions.length;
      let correctCount = 0;
      const detail = questions.map((q, i) => {
        const choice = answers[i];
        const ok = choice === q.correct;
        if (ok) correctCount++;
        return { index: i + 1, correct: q.correct, choice, options: q.options, ok };
      });
      const s = Math.round((correctCount / total) * 100);
      setScore(s);
      setResultDetail({ memorySet, detail });

      finishedAt.current = new Date().toISOString();
      appendResult({
        app: "ex00",
        startedAt: startedAt.current,
        finishedAt: finishedAt.current,
        score: s,
        meta: { memorySet, answers: detail },
      });

      setPhase("result");
    }
  }

  function restart() {
    setPhase("idle");
    setMemorySet([]);
    setQuestions([]);
    setAnswers([]);
    setQIndex(0);
    setScore(null);
    setResultDetail(null);
    setRemain(MEMO_SECONDS);
  }

  return (
    <main className="rounded-2xl bg-white p-6 shadow max-w-2xl mx-auto grid gap-4">
      <h1 className="text-xl font-bold">記憶力診断（選択式）</h1>

      {/* 説明（開始前に表示・余白に例示あり） */}
      {phase === "idle" && (
        <div className="grid gap-3">
          <div className="text-sm text-gray-600 space-y-2">
            <p><b>遊び方：</b>「開始」を押すと6つの単語が表示されます。<b>{MEMO_SECONDS}秒</b>で覚えてください。</p>
            <p>続けて <b>5問の四択クイズ</b>が出ます。「さっき見た単語」を選んでください。スコアは正解率（100点満点）。</p>
          </div>
          <div className="rounded-xl border bg-gray-50 p-3">
            <p className="text-xs text-gray-600">例（こんな単語が出ます）：</p>
            <div className="mt-1 grid grid-cols-3 gap-2 text-sm">
              {["さくら","ほしぞら","たけのこ","こけし","ゆきやま","だんご"].map((w,i)=>(
                <div key={i} className="rounded bg-white border px-2 py-1 text-center">{w}</div>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              className="rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
              onClick={startTest}
            >
              開始
            </button>
            <a className="rounded-xl border px-4 py-2 hover:bg-gray-50" href="/home">HOMEへ</a>
          </div>
        </div>
      )}

      {/* 記憶フェーズ */}
      {phase === "memorize" && (
        <>
          <p className="text-sm text-gray-600">記憶フェーズ：残り <b>{remain}</b> 秒</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {memorySet.map((w, i) => (
              <div key={i} className="rounded-xl border bg-emerald-50 border-emerald-200 p-3 text-center">
                {w}
              </div>
            ))}
          </div>
        </>
      )}

      {/* クイズ */}
      {phase === "quiz" && (
        <>
          <p className="text-sm text-gray-600">
            問題 {qIndex + 1} / {questions.length}：次のうち「さっき表示された単語」はどれ？
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {questions[qIndex].options.map((op, i) => {
              const selected = answers[qIndex] === op;
              return (
                <button
                  key={i}
                  className={
                    "rounded-xl border px-4 py-3 text-center " +
                    (selected ? "border-emerald-600 bg-emerald-50" : "hover:bg-emerald-50")
                  }
                  onClick={() => choose(op)}
                >
                  {op}
                </button>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button
              className="rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-60"
              onClick={nextOrFinish}
              disabled={answers[qIndex] == null}
            >
              {qIndex < questions.length - 1 ? "次へ" : "採点する"}
            </button>
            <a className="rounded-xl border px-4 py-2 hover:bg-gray-50" href="/home">HOMEへ</a>
          </div>
        </>
      )}

      {/* 結果 */}
      {phase === "result" && score != null && (
        <div className="rounded border p-4 space-y-2">
          <p>スコア：<b>{score} 点</b></p>
          <details className="text-sm text-gray-700">
            <summary className="cursor-pointer select-none">内訳を見る</summary>
            <div className="mt-2 space-y-1">
              <p>記憶セット：{memorySet.join("、")}</p>
              <ul className="list-disc ml-5">
                {resultDetail?.detail?.map((d: any, i: number) => (
                  <li key={i}>
                    Q{i + 1} {d.ok ? "○" : "×"} / 正解: {d.correct} / 選択: {d.choice ?? "未選択"}
                  </li>
                ))}
              </ul>
            </div>
          </details>
          <div className="mt-2 flex gap-3">
            <button className="rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700" onClick={restart}>
              もう一度
            </button>
            <a className="rounded-xl border px-4 py-2 hover:bg-gray-50" href="/home">
              HOMEへ
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
