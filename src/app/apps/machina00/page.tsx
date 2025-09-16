"use client";

import { useEffect, useRef, useState } from "react";
import { appendResult } from "@/lib/results";

type Phase = "idle" | "running" | "finished";
type Difficulty = "easy" | "normal" | "hard";

type StepLog = {
  litIndex: number;          // 正解となるセルの index（そのステップで辿るべき座標）
  clickedIndex?: number;     // 実際に押したセル
  hit: boolean;              // 正解だったか
  reactionMs?: number;       // 反応時間（ヒット時）
};

// ★ rounds を 5/6/7 に（“5つくらい”）
const DIFF: Record<
  Difficulty,
  { rows: number; cols: number; intervalMs: number; rounds: number; label: string }
> = {
  easy:   { rows: 4, cols: 4, intervalMs: 900, rounds: 5, label: "初級" },
  normal: { rows: 5, cols: 5, intervalMs: 800, rounds: 6, label: "中級" },
  hard:   { rows: 6, cols: 6, intervalMs: 700, rounds: 7, label: "上級" },
};

// （同じ場所が連続しない）ランダム軌跡を作る
function makeSequence(cellCount: number, rounds: number) {
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
  const [rounds, setRounds] = useState(5);

  const [sequence, setSequence] = useState<number[]>([]);
  const [step, setStep] = useState(0); // 再現フェーズでのクリック回数（0-based）
  const [litIndex, setLitIndex] = useState<number | null>(null);

  const [logs, setLogs] = useState<StepLog[]>([]);
  const logsRef = useRef<StepLog[]>([]);
  useEffect(() => { logsRef.current = logs; }, [logs]);

  // 記憶フェーズ用のタイマー群
  const previewTimersRef = useRef<number[]>([]);
  const clickLockedRef = useRef(false); // 再現フェーズ：1ステップ1クリックに制限
  const stepStartTimeRef = useRef<number>(0);

  const startedAtRef = useRef<string>("");
  const finishedAtRef = useRef<string>("");

  // 記憶 → 再現
  const [mode, setMode] = useState<"memorize" | "replay">("memorize");

  function clearPreviewTimers() {
    previewTimersRef.current.forEach((id) => window.clearTimeout(id));
    previewTimersRef.current = [];
  }

  function start(diff: Difficulty) {
    const cfg = DIFF[diff];
    setDifficulty(diff);
    setRows(cfg.rows);
    setCols(cfg.cols);
    setIntervalMs(cfg.intervalMs);
    setRounds(cfg.rounds);

    const seq = makeSequence(cfg.rows * cfg.cols, cfg.rounds);
    setSequence(seq);
    setLogs([]);
    setStep(0);
    setMode("memorize");
    setLitIndex(null);
    clickLockedRef.current = false;
    startedAtRef.current = new Date().toISOString();

    // 記憶フェーズ：順に点灯 → 消灯 を繰り返す
    clearPreviewTimers();
    let i = 0;
    const onMs = Math.max(350, Math.floor(cfg.intervalMs * 0.7));
    const offMs = Math.max(200, Math.floor(cfg.intervalMs * 0.3));

    const showNext = () => {
      if (i >= cfg.rounds) {
        // 記憶フェーズ終了 → 再現フェーズへ
        setLitIndex(null);
        setMode("replay");
        clickLockedRef.current = false;
        stepStartTimeRef.current = performance.now();
        return;
      }
      setLitIndex(seq[i]);
      const t1 = window.setTimeout(() => {
        setLitIndex(null);
        const t2 = window.setTimeout(() => {
          i++;
          showNext();
        }, offMs);
        previewTimersRef.current.push(t2);
      }, onMs);
      previewTimersRef.current.push(t1);
    };

    showNext();
    setPhase("running");
  }

  function onCellClick(index: number) {
    if (phase !== "running" || mode !== "replay") return;
    if (clickLockedRef.current) return;

    const now = performance.now();
    const reactionMs = Math.max(0, now - stepStartTimeRef.current);

    const correct = sequence[step];
    const hit = index === correct;

    setLogs((prev) => {
      const next = prev.slice();
      next[step] = {
        litIndex: correct,
        clickedIndex: index,
        hit,
        reactionMs: hit ? Math.round(reactionMs) : undefined,
      };
      return next;
    });

    clickLockedRef.current = true;

    const nextStep = step + 1;
    if (nextStep >= rounds) {
      // 全手終了
      finishGame();
    } else {
      setStep(nextStep);
      // 次ステップの計測開始
      stepStartTimeRef.current = performance.now();
      clickLockedRef.current = false;
    }
  }

  function finishGame() {
    clearPreviewTimers();
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
      app: "machina00",
      startedAt: startedAtRef.current,
      finishedAt: finishedAtRef.current,
      score: accuracy,
      meta: {
        difficulty,
        rows,
        cols,
        intervalMs,
        rounds,
        accuracy,
        hits,
        avgReactionMs: avgReaction,
        sequence,              // 実際の正解軌跡
        steps: logsRef.current // ユーザー入力ログ
      },
    });

    setPhase("finished");
  }

  function restart() {
    clearPreviewTimers();
    setPhase("idle");
    setDifficulty(null);
    setSequence([]);
    setStep(0);
    setLitIndex(null);
    setLogs([]);
    setMode("memorize");
  }

  useEffect(() => () => clearPreviewTimers(), []);

  // UI
  const gridTemplateColumns = { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` };

  return (
    <main className="rounded-2xl bg-white p-6 shadow max-w-3xl mx-auto grid gap-5">
      <h1 className="text-xl font-bold">座標当て（記憶 → 再現）</h1>

      {phase === "idle" && (
        <div className="grid gap-3">
          <div className="text-sm text-gray-700 space-y-2">
            <p>
              <b>ルール：</b>最初に<b>●が順番に点灯（記憶）</b>します。終わったら<b>同じ順番</b>でセルをクリック（再現）してください。
            </p>
            <ul className="list-disc ml-5">
              <li>難易度を選ぶと即開始（初級/中級/上級）。</li>
              <li>難易度で<b>グリッド</b>と<b>手数</b>が変わります（初級5手/中級6手/上級7手）。</li>
              <li>スコアは<b>正答率</b>（%）。平均反応時間も記録します。</li>
            </ul>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700" onClick={() => start("easy")}>
              初級（4×4 / 5手）
            </button>
            <button className="rounded-xl border px-4 py-2 hover:bg-gray-50" onClick={() => start("normal")}>
              中級（5×5 / 6手）
            </button>
            <button className="rounded-xl border px-4 py-2 hover:bg-gray-50" onClick={() => start("hard")}>
              上級（6×6 / 7手）
            </button>
            <a className="ml-auto rounded-xl border px-4 py-2 hover:bg-gray-50" href="/home">HOMEへ</a>
          </div>

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
              モード：<b>{mode === "memorize" ? "記憶中" : "再現中"}</b> ／
              進行：<b>{mode === "replay" ? step + 1 : 0}</b> / {rounds}
            </div>
            <button className="rounded-xl border px-3 py-1.5 hover:bg-gray-50" onClick={restart}>
              中断してやり直す
            </button>
          </div>

          {/* グリッド */}
          <div className="grid gap-3 rounded-2xl border bg-white p-4" style={gridTemplateColumns}>
            {Array.from({ length: rows * cols }).map((_, i) => {
              const lit = i === litIndex; // 記憶フェーズのみ点灯
              return (
                <button
                  key={i}
                  className={`aspect-square flex items-center justify-center ${mode === "memorize" ? "cursor-default" : ""}`}
                  onClick={() => onCellClick(i)}
                  aria-label={lit ? "ターゲット" : "グリッドセル"}
                  disabled={mode === "memorize"}
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
            {mode === "memorize"
              ? "●の順番を覚えてください。終わったら自動で再現モードに切り替わります。"
              : "順番に1回ずつクリックしてください。"}
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
      <p>スコア：<b className="text-lg">{accuracy}</b> 点（正答率）</p>
      <p>ヒット数：<b>{hits}</b> / {rounds}</p>
      <p>平均反応時間：<b>{avgReaction != null ? `${avgReaction}ms` : "—"}</b></p>
      <p className="text-sm text-gray-600">難易度：{difficulty ? DIFF[difficulty].label : "-"}</p>

      <details className="text-sm text-gray-700">
        <summary className="cursor-pointer select-none">各ステップの内訳</summary>
        <ul className="mt-2 list-disc ml-5 space-y-1">
          {logs.map((l, i) => (
            <li key={i}>
              #{i + 1}：{l.hit ? "○" : "×"}
              {l.clickedIndex != null ? `（押した: ${l.clickedIndex} / 正解: ${l.litIndex}${l.reactionMs != null ? `, ${l.reactionMs}ms` : ""}）` : ""}
            </li>
          ))}
        </ul>
      </details>

      <div className="flex gap-3">
        <button className="rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700" onClick={onRetry}>
          もう一度
        </button>
        <a className="rounded-xl border px-4 py-2 hover:bg-gray-50" href="/home">HOMEへ</a>
      </div>
    </div>
  );
}
