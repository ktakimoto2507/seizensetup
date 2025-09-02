"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, CardHeader, CardContent, Input } from "@/components/ui";
import { useAppStore, getPersisted, importPersisted, Persisted } from "@/lib/store";
import { Stepper } from "@/components/stepper";

export default function DataPage() {
  // ストア（表示更新のために参照）
  const state = useAppStore();
  const [jsonText, setJsonText] = useState("");
  const [msg, setMsg] = useState<string>("");

  // 現在データを常にJSONとして表示
  useEffect(() => {
    setJsonText(JSON.stringify(getPersisted(), null, 2));
  }, [state]); // 何かが変わるたびに更新

  // JSONをダウンロード
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
    setMsg("JSONをダウンロードしました。");
  }

  // クリップボードにコピー
  async function copyJSON() {
    try {
      await navigator.clipboard.writeText(jsonText);
      setMsg("クリップボードにコピーしました。");
    } catch {
      setMsg("コピーに失敗しました。");
    }
  }

  // ファイルから読み込み
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as Persisted;
        importPersisted(data);
        setMsg("ファイルから読み込みました。");
      } catch {
        setMsg("読み込みに失敗しました（JSON形式を確認してください）。");
      }
    };
    reader.readAsText(f, "utf-8");
    e.currentTarget.value = ""; // 同じファイルでも再選択できるように
  }

  // テキストエリアから復元
  function restoreFromTextarea() {
    try {
      const data = JSON.parse(jsonText) as Persisted;
      importPersisted(data);
      setMsg("テキストから復元しました。");
    } catch {
      setMsg("復元に失敗しました（JSON形式を確認してください）。");
    }
  }

  // 全リセット
  function resetAll() {
    useAppStore.getState().resetAll();
    setMsg("すべてのデータを初期化しました。");
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <Stepper />

      <Card>
        <CardHeader>データのエクスポート / インポート</CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-700">
            下のJSONは現在の入力データのスナップショットです。バックアップとして保存したり、別ブラウザで読み込んで続きから再開できます。
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
        </CardContent>
      </Card>
    </div>
  );
}
