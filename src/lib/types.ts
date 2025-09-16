// src/lib/types.ts

/** ゲームの難易度 */
export type Difficulty = "easy" | "normal" | "hard";

/** 各ステップのログ（点灯セル→クリック結果など） */
export type StepLog = {
  litIndex: number;
  clickedIndex?: number;
  hit: boolean;
  reactionMs?: number;
};

/** 成績の保存フォーマット（必要に応じて拡張可） */
export type TestResult = {
  app?: "ex00" | "machina00" | "deus00" | string;
  id?: string; // ← 互換用（将来は削除推奨）
  difficulty?: Difficulty | string;
  score?: number;
  rounds?: number;
  durationMs?: number;
  startedAt?: string;   // ISO
  finishedAt?: string;  // ISO
  steps?: StepLog[];
  // 任意の追加情報
  meta?: Record<string, unknown>;
};
