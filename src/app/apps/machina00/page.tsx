"use client";

import { useEffect, useRef, useState } from "react";
import { appendResult } from "@/lib/results";

type Phase = "idle" | "running" | "finished";
type Difficulty = "easy" | "normal" | "hard";

type StepLog = {
  litIndex: number;          // 点灯セルのindex
  clickedIndex?: number;     // 押したセルのindex
  hit: boolean;              // 正解クリックしたか
  reactionMs?: number;       // 反応時間（ヒット時）
};

const DIFF: Record<
  Difficulty,
  { rows: number; cols: number; intervalMs: number; rounds: number; label: string }
> = {
  easy:   { rows: 4, cols: 4, intervalMs: 900, rounds: 20, label: "初級" },
  normal: { rows: 5, cols: 5, intervalMs: 800, rounds: 22, label: "中級" },
  hard:   { rows: 6, cols: 6, intervalMs: 650, rounds: 24, label: "上級" },
};

function makeSequence(cellCount: number, rounds: number) {
  // ランダムだが「同じ場所が連続しない」ようにする
  const seq: number[] = [];
  let prev = -1;
  for (let i = 0; i < rounds; i++) {
    let n = Math.floor(Math.random() * cellCount);
    if (n === prev) n = (n + 1) % cellCount;
    seq.push(n);
    prev = n;
  }
  return seq;
}

export default function MachinaGrid() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);

  const [rows, setRows] = useState(4);
  const [cols, setCols] = useState(4);
  const [intervalMs, setIntervalMs] = useState(900);
  const [rounds, setRounds] = useState(20);

  const [sequence, setSequence] = useState<number[]>([]);
  const [step, setStep] = useState(0); // 0-based
  const [litIndex, setLitIndex] = useState<number | null>(null);

  const [logs, setLogs] = useState<StepLog[]>([]);
  const logsRef = useRef<StepLog[]>([]);
  const clickLockedRef = useRef(false);      // 現ステップで既に判定したか
  const stepStartTimeRef = useRef<number>(0);
  const intervalRef = useRef<number | null>(null);

  const startedAtRef = useRef<string>("");
  const finishedAtRef = useRef<string>("");

  // logs の最新値を常に参照できるように同期
  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  // 難易度選択＝開始
  function start(diff: Difficulty) {
    const cfg = DIFF[diff];
    setDifficulty(diff);
    setRows(cfg.rows);
    setCols(cfg.cols);
    setIntervalMs(cfg.intervalMs);
    setRounds(cfg.rounds);

    // 乱数はユーザー操作後に生成 → SSR ずれなし
    const seq = makeSequence(cfg.rows * cfg.cols, cfg.rounds);
    setSequence(seq);
    setLogs([]);
    setStep(0);
    setLitIndex(seq[0]); // 初手を即点灯
    clickLockedRef.current = false;
    stepStartTimeRef.current = performance.now();
    startedAtRef.current = new Date().toISOString();

    // 走らせる（タイマーは step を進めるだけ）
    setPhase("running");
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      setStep((s) => s + 1);
    }, cfg.intervalMs) as unknown as number;
  }

  // step が進むたびに：前ステップのミス補完 → 終了判定 → 新しい点灯＆測定開始
  useEffect(() => {
    if (phase !== "running") return;

    // 直前ステップ（step-1）のミス補完（未クリックなら × を入れる）
    if (step > 0 && step <= rounds) {
      const prevIdx = step - 1;
      setLogs((prev) => {
        const arr = prev.slice();
        if (!arr[prevIdx]) {
          arr[prevIdx] = { litIndex: sequence[prevIdx], hit: false };
        }
        return arr;
      });
    }

    // 最後まで到達したら終了処理
    if (step >= rounds) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      // 念のため最終ミス補完をケア
      setLogs((prev) => {
        const arr = prev.slice();
        if (!arr[rounds - 1]) {
          arr[rounds - 1] = { litIndex: sequence[rounds - 1], hit: false };
        }
        return arr;
      });
      // 次フレームで finish（最新 logsRef を確実に参照するため）
      requestAnimationFrame(() => finishGame());
      return;
    }

    // 現在ステップの点灯とタイム計測の開始
    setLitIndex(sequence[step]);
    clickLockedRef.current = false;
    stepStartTimeRef.current = performance.now();
  }, [step, phase, rounds, sequence]);

  function onCellClick(index: number) {
    if (phase !== "running") return;
    if (clickLockedRef.current) return; // このステップは1回だけ

    const now = performance.now();
    const reactionMs = Math.max(0, now - stepStartTimeRef.current);
    const hit = index === litIndex;

    const curStep = step;
    setLogs((prev) => {
      const next = prev.slice();
      next[curStep] = {
        litIndex: sequence[curStep],
        hit,
        clickedIndex: index,
        reactionMs: hit ? reactionMs : undefined,
      };
      return next;
    });

    clickLockedRef.current = true;
  }

  function finishGame() {
    const total = rounds;
    const hits = logsRef.current.filter((l) => l?.hit).length;
    const accuracy = Math.round((hits / total) * 100);

    const reactions = logsRef.current
      .filter((l) => l?.hit && typeof l.reactionMs === "number")
      .map((l) => l.reactionMs!);
    const avgReaction = reactions.length
      ? Math.round(reactions.reduce((a, b) => a + b, 0) / reactions.length)
      : null;

    finishedAtRef.current = new Date().toISOString();

    appendResult({
      id: "machina00",
      startedAt: startedAtRef.current,
      finishedAt: finishedAtRef.current,
      score: accuracy,
      detail: {
        difficulty,
        rows,
        cols,
        intervalMs,
        rounds,
        accuracy,
        hits,
        avgReactionMs: avgReaction,
        steps: logsRef.current,
      },
    });

    setPhase("finished");
  }

  function restart() {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    setPhase("idle");
    setDifficulty(null);
    setSequence([]);
    setStep(0);
    setLitIndex(null);
    setLogs([]);
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, []);

  // UI
  const gridTemplateColumns = { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` };

  return (
    <main className="rounded-2xl bg-white p-6 shadow max-w-3xl mx-auto grid gap-5">
      <h1 className="text-xl font-bold">座標当て（グリッド反応）</h1>

      {phase === "idle" && (
        <div className="grid gap-3">
          <div className="text-sm text-gray-700 space-y-2">
            <p>
              <b>ルール：</b>下の〇グリッドの中で、<b>黒い●</b>が<b>一定間隔</b>でパッパッパと移動します。点灯中にその●をクリックしてください。
            </p>
            <ul className="list-disc ml-5">
              <li>難易度を選ぶと即開始（初級/中級/上級）。</li>
              <li>各難易度ごとに<b>グリッドサイズ</b>と<b>切替間隔</b>、<b>ステップ数</b>が変わります。</li>
              <li>スコアは<b>正答率</b>（%）。詳細にヒット数・平均反応時間を記録します。</li>
            </ul>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
              onClick={() => start("easy")}
            >
              初級（4×4 / 0.9秒）
            </button>
            <button
              className="rounded-xl border px-4 py-2 hover:bg-gray-50"
              onClick={() => start("normal")}
            >
              中級（5×5 / 0.8秒）
            </button>
            <button
              className="rounded-xl border px-4 py-2 hover:bg-gray-50"
              onClick={() => start("hard")}
            >
              上級（6×6 / 0.65秒）
            </button>
            <a className="ml-auto rounded-xl border px-4 py-2 hover:bg-gray-50" href="/home">
              HOMEへ
            </a>
          </div>
          {/* 例示（静的なサンプル） */}
          <div className="rounded-xl border bg-gray-50 p-3">
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="aspect-square flex items-center justify-center">
                  <div className="h-6 w-6 rounded-full border border-gray-300" />
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">（例：初級 4×4 グリッド）</p>
          </div>
        </div>
      )}

      {phase === "running" && (
        <>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              難易度：<b>{difficulty ? DIFF[difficulty].label : "-"}</b> ／
              ステップ：<b>{step + 1 <= rounds ? step + 1 : rounds}</b> / {rounds}
            </div>
            <button className="rounded-xl border px-3 py-1.5 hover:bg-gray-50" onClick={restart}>
              中断してやり直す
            </button>
          </div>

          {/* グリッド本体：広め＆見やすく */}
          <div className="grid gap-3 rounded-2xl border bg-white p-4" style={gridTemplateColumns}>
            {Array.from({ length: rows * cols }).map((_, i) => {
              const lit = i === litIndex;
              return (
                <button
                  key={i}
                  className="aspect-square flex items-center justify-center"
                  onClick={() => onCellClick(i)}
                  aria-label={lit ? "ターゲット" : "グリッドセル"}
                >
                  <div
                    className={[
                      "h-10 w-10 rounded-full transition",
                      lit ? "bg-black shadow" : "border border-gray-300 bg-white",
                    ].join(" ")}
                  />
                </button>
              );
            })}
          </div>

          <p className="text-xs text-gray-500">
            ヒント：各ステップの判定は<span className="font-semibold">1回だけ</span>。押し逃しはミスとしてカウントされます。
          </p>
        </>
      )}

      {phase === "finished" && (
        <ResultPanel logs={logs} rounds={rounds} difficulty={difficulty} onRetry={restart} />
      )}
    </main>
  );
}

function ResultPanel({
  logs,
  rounds,
  difficulty,
  onRetry,
}: {
  logs: StepLog[];
  rounds: number;
  difficulty: Difficulty | null;
  onRetry: () => void;
}) {
  const hits = logs.filter((l) => l.hit).length;
  const accuracy = Math.round((hits / rounds) * 100);
  const reactions = logs
    .filter((l) => l.hit && typeof l.reactionMs === "number")
    .map((l) => l.reactionMs!);
  const avgReaction = reactions.length
    ? Math.round(reactions.reduce((a, b) => a + b, 0) / reactions.length)
    : null;

  return (
    <div className="rounded-2xl border p-5 space-y-3">
      <h2 className="text-lg font-semibold">結果</h2>
      <p>
        スコア：<b className="text-lg">{accuracy}</b> 点（正答率）
      </p>
      <p>
        ヒット数：<b>{hits}</b> / {rounds}
      </p>
      <p>
        平均反応時間：<b>{avgReaction != null ? `${avgReaction}ms` : "—"}</b>
      </p>
      <p className="text-sm text-gray-600">難易度：{difficulty ? DIFF[difficulty].label : "-"}</p>

      <details className="text-sm text-gray-700">
        <summary className="cursor-pointer select-none">各ステップの内訳</summary>
        <ul className="mt-2 list-disc ml-5 space-y-1">
          {logs.map((l, i) => (
            <li key={i}>
              #{i + 1}：{l.hit ? "○" : "×"}
              {l.hit && l.reactionMs != null ? `（${l.reactionMs}ms）` : ""}
            </li>
          ))}
        </ul>
      </details>

      <div className="flex gap-3">
        <button
          className="rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
          onClick={onRetry}
        >
          もう一度
        </button>
        <a className="rounded-xl border px-4 py-2 hover:bg-gray-50" href="/home">
          HOMEへ
        </a>
      </div>
    </div>
  );
}
