"use client";

import { useEffect, useMemo, useState } from "react";

type Snapshot = {
  ss_account?: any;
  ss_profile?: any;
  ss_results?: any;
  ss_session?: any;
  ss_onboarded?: any;
};

const ALLOWED_KEYS = ["ss_account", "ss_profile", "ss_results", "ss_session", "ss_onboarded"] as const;

export default function DataPage() {
  const [hydrated, setHydrated] = useState(false);
  const [text, setText] = useState<string>("{}");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // 現在の localStorage からスナップショットを作る
  const makeSnapshot = (): Snapshot => {
    if (typeof window === "undefined") return {};
    const snap: Snapshot = {};
    for (const k of ALLOWED_KEYS) {
      const v = window.localStorage.getItem(k);
      if (v != null) {
        try {
          (snap as any)[k] = JSON.parse(v);
        } catch {
          // 壊れたJSONはそのまま文字列で保持
          (snap as any)[k] = v;
        }
      }
    }
    return snap;
  };

  // 初回ロード：JSON文字列をテキストエリアに表示
  useEffect(() => {
    const snap = makeSnapshot();
    setText(JSON.stringify(snap, null, 2));
    setHydrated(true);
  }, []);

  const filename = useMemo(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `seizensetup_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(
      d.getMinutes()
    )}${pad(d.getSeconds())}.json`;
  }, []);

  function showMsg(s: string) {
    setErr(null);
    setMsg(s);
    setTimeout(() => setMsg(null), 1800);
  }
  function showErr(s: string) {
    setMsg(null);
    setErr(s);
    setTimeout(() => setErr(null), 2500);
  }

  // JSON をダウンロード
  function downloadJSON() {
    try {
      const blob = new Blob([text], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showMsg("JSONをダウンロードしました。");
    } catch {
      showErr("ダウンロードに失敗しました。");
    }
  }

  // クリップボードへコピー
  async function copyJSON() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // フォールバック
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      showMsg("クリップボードにコピーしました。");
    } catch {
      showErr("コピーに失敗しました。");
    }
  }

  // テキストエリアのJSONを localStorage に反映
  function importFromText() {
    try {
      const obj = JSON.parse(text) as Snapshot;
      if (typeof obj !== "object" || obj === null) {
        showErr("JSONの形式が正しくありません。");
        return;
      }
      for (const k of ALLOWED_KEYS) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) {
          window.localStorage.setItem(k, JSON.stringify((obj as any)[k]));
        }
      }
      showMsg("JSONをインポートしました。");
    } catch {
      showErr("JSONのパースに失敗しました。");
    }
  }

  // 全データ削除（任意）
  function clearAll() {
    if (!confirm("localStorage の対象データを全て削除します。よろしいですか？")) return;
    for (const k of ALLOWED_KEYS) window.localStorage.removeItem(k);
    setText(JSON.stringify({}, null, 2));
    showMsg("対象データを削除しました。");
  }

  // 最新スナップショットを再取得
  function refresh() {
    const snap = makeSnapshot();
    setText(JSON.stringify(snap, null, 2));
    showMsg("最新データを読み込みました。");
  }

  if (!hydrated) {
    return (
      <main className="p-6">
        <p className="text-sm text-gray-500">読み込み中…</p>
      </main>
    );
    }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">データのエクスポート / インポート</h1>
        <p className="mt-1 text-sm text-gray-600">
          現在の入力データ（localStorage）をJSONとして保存・復元できます。
        </p>
      </header>

      {msg && <p className="text-sm text-green-700">{msg}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      <section className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <button onClick={downloadJSON} className="rounded-xl border px-4 py-2 hover:bg-gray-50">
            JSONをダウンロード
          </button>
          <button onClick={copyJSON} className="rounded-xl border px-4 py-2 hover:bg-gray-50">
            クリップボードにコピー
          </button>
          <button onClick={refresh} className="rounded-xl border px-4 py-2 hover:bg-gray-50">
            最新データを読み込む
          </button>
          <button onClick={clearAll} className="rounded-xl border px-4 py-2 hover:bg-gray-50 text-red-700 border-red-300">
            すべて削除
          </button>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">JSON（編集してインポート可能）</label>
          <textarea
            className="w-full min-h-64 rounded border p-3 font-mono text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <button onClick={importFromText} className="rounded-xl bg-black px-4 py-2 text-white">
            上のJSONをインポート
          </button>
          <a className="rounded-xl border px-4 py-2 hover:bg-gray-50" href="/home">
            HOMEへ戻る
          </a>
        </div>
      </section>
    </main>
  );
}
