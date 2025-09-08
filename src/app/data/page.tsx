"use client";

import { useEffect, useState } from "react";
import { Stepper } from "@/components/stepper";
import { useAppStore, getPersisted, importPersisted, Persisted } from "@/lib/store";

// UI コンポーネントはファイル単位で明示的にインポート
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function DataPage() {
  // 画面の再描画トリガーとしてストアを読む
  const state = useAppStore();

  const [jsonText, setJsonText] = useState("");
  const [msg, setMsg] = useState<string>("");

  // 現在のデータを JSON 表示
  useEffect(() => {
    setJsonText(JSON.stringify(getPersisted(), null, 2));
  }, [state]);

  // JSON ダウンロード
  function downloadJSON() {
    const blob = new Blob([jsonText], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `seizensetup-backup-${ts}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setMsg("JSONを保存しました。");
  }

  // クリップボードへコピー
  async function copyJSON() {
    try {
      await navigator.clipboard.writeText(jsonText);
      setMsg("クリップボードにコピーしました。");
    } catch {
      setMsg("クリップボードへのコピーに失敗しました。");
    }
  }

  // JSONファイル読込
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as Persisted;
        importPersisted(data);
        setMsg("ファイルから復元しました。");
      } catch {
        setMsg("復元に失敗しました（JSON形式をご確認ください）。");
      }
    };
    reader.readAsText(f, "utf-8");
    e.currentTarget.value = ""; // 同じファイルを再選択できるように
  }

  // テキストエリアから復元
  function restoreFromTextarea() {
    try {
      const data = JSON.parse(jsonText) as Persisted;
      importPersisted(data);
      setMsg("テキストから復元しました。");
    } catch {
      setMsg("復元に失敗しました（JSON形式をご確認ください）。");
    }
  }

  // 全リセット
  function resetAll() {
    useAppStore.getState().resetAll();
    setMsg("すべてリセットしました。");
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <Stepper />

      <Card>
        <CardHeader>データのエクスポート / インポート</CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              下の JSON は現在の入力データのスナップショットです。バックアップとして保存したり、
              別ブラウザで読み込んで続きから再開できます。
            </p>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={downloadJSON}>JSONをダウンロード</Button>
              <Button type="button" onClick={copyJSON}>JSONをコピー</Button>
              <label className="inline-flex items-center gap-2 border rounded px-3 py-2 cursor-pointer">
                <input type="file" accept="application/json" className="hidden" onChange={handleFile} />
                JSONファイルから読み込み
              </label>
              <Button type="button" onClick={resetAll}>全リセット</Button>
            </div>

            <textarea
              className="w-full min-h-[280px] border rounded p-3 font-mono text-sm"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" onClick={restoreFromTextarea}>テキストから復元</Button>
            </div>

            {msg && <p className="text-sm text-green-700">{msg}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
