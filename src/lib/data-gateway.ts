// src/lib/data-gateway.ts
import { supabase } from "@/lib/supabase/client";

// ローカル保存のキー（既存を流用/統合）
const LOCAL_KEY = "seizensetup_store_v1";
const QUEUE_KEY = "seizensetup_pending_ops_v1";

type PendingOp =
  | { t: "onboarding"; step: string; payload: any; at: string }
  | { t: "kyc"; status: "draft"|"submitted"|"approved"|"rejected"; data: any; at: string }
  | { t: "result"; kind: "ex00"|"deus00"|"machina00"; payload: any; at: string };

const load = <T>(k: string, d: T) => {
  try { return JSON.parse(localStorage.getItem(k) || "") as T; } catch { return d; }
};
const save = (k: string, v: any) => localStorage.setItem(k, JSON.stringify(v));

/** 画面からはこの3つだけ呼べば OK */
export async function recordOnboarding(step: string, payload: any) {
  // 1) ローカルにも残す（既存の store を尊重）
  const store = load<any>(LOCAL_KEY, { onboarding: { steps: [] } });
  store.onboarding ??= { steps: [] };
  store.onboarding.steps = [
    ...store.onboarding.steps.filter((s: any) => s.step !== step),
    { step, payload, completed_at: new Date().toISOString() }
  ];
  save(LOCAL_KEY, store);

  // 2) 後述のフラッシュ用キューに積む（オフラインでもOK）
  enqueue({ t: "onboarding", step, payload, at: new Date().toISOString() });
  flushQueue(); // 非同期でDBへ
}

export async function submitKyc(data: any) {
  // ローカル
  const store = load<any>(LOCAL_KEY, {});
  store.kyc = { status: "submitted", data, updated_at: new Date().toISOString() };
  save(LOCAL_KEY, store);

  // キュー
  enqueue({ t: "kyc", status: "submitted", data, at: new Date().toISOString() });
  flushQueue();
}

export async function saveResult(kind: "ex00"|"deus00"|"machina00", payload: any) {
  // ローカル（既存 results を尊重）
  const store = load<any>(LOCAL_KEY, { results: [] });
  store.results = [{ kind, payload, created_at: new Date().toISOString() }, ...(store.results || [])];
  save(LOCAL_KEY, store);

  enqueue({ t: "result", kind, payload, at: new Date().toISOString() });
  flushQueue();
}

/** キュー制御（失敗時は残す。ログイン&オンラインで自動再送） */
function enqueue(op: PendingOp) {
  const q = load<PendingOp[]>(QUEUE_KEY, []);
  q.push(op); save(QUEUE_KEY, q);
}

export async function flushQueue() {
  const q = load<PendingOp[]>(QUEUE_KEY, []);
  if (!q.length) return;

  // ログイン確認
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid || !navigator.onLine) return;

  const remain: PendingOp[] = [];
  for (const op of q) {
    try {
      if (op.t === "onboarding") {
        const { error } = await supabase
          .from("onboarding_progress")
          .upsert({ user_id: uid, step: op.step, payload: op.payload, completed_at: op.at }, { onConflict: "user_id,step" });
        if (error) throw error;
      } else if (op.t === "kyc") {
        const { error } = await supabase
          .from("kyc_submissions")
          .upsert({ user_id: uid, status: op.status, data: op.data, updated_at: op.at });
        if (error) throw error;
      } else if (op.t === "result") {
        const { error } = await supabase
          .from("results")
          .insert({ user_id: uid, kind: op.kind, payload: op.payload });
        if (error) throw error;
      }
    } catch {
      // 失敗したものだけ残す（ネット切断/一時エラー時）
      remain.push(op);
    }
  }
  save(QUEUE_KEY, remain);
}

/** アプリ起動時に呼ぶ（ログイン/オンラインの度に自動 flush） */
export function startBackgroundSync() {
  // 認証状態が変わったら flush
  supabase.auth.onAuthStateChange(() => { flushQueue(); });

  // オンライン復帰で flush
  window.addEventListener("online", () => { flushQueue(); });

  // 起動直後も一回
  flushQueue();
}
