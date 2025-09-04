// src/app/data/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, CardHeader, CardContent } from "@/components/ui";
import { useAppStore, getPersisted, importPersisted, Persisted } from "@/lib/store";
import { Stepper } from "@/components/stepper";

export default function DataPage() {
  // zustand の変更を検知するだけに利用（値は使わない）
  const state = useAppStore();

  // 表示用JSONとメッセージ
  const [jsonText, setJsonText] = useState<string>("{}");
  const [msg, setMsg] = useState<string>("");

  // store が変わるたびに最新スナップショットを整形して表示
  useEffect(() => {
    try {
      setJsonText(JSON.stringify(getPersisted(), null, 2));
    } catch {
      setJsonText("{}");
    }
  }, [state]);

  // 画面内の JSON をきれいに整形（壊れていてもそのまま返す）
  const pretty = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(jsonText), null, 2);
    } catch {
      return jsonText;
    }
  }, [jsonText]);

  // JSON をダウンロード
  function downloadJSON() {
    try {
      const blob = new Blob([pretty], { type: "application/json;charset=utf-8" });
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
    } catch {
      setMsg("保存に失敗しました。");
    }
  }

  // クリップボードへコピー
  async function copyJSON() {
    try {
      await navigator.clipboard.writeText(pretty);
      setMsg("クリップボードにコピーしました。");
    } catch {
      setMsg("クリップボードへのコピーに失敗しました。");
    }
  }

  // JSONファイルを読み込んで store に反映
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const data = JSON.parse(text) as Persisted;
        importPersisted(data);
        setMsg("JSONを読み込みました。");
      } catch {
        setMsg("読み込みに失敗しました。JSONの形式を確認してください。");
      } finally {
        // 同じファイルを連続選択できるようリセット
        e.currentTarget.value = "";
      }
    };
    reader.readAsText(f, "utf-8");
  }

  // 画面のテキストエリアから store に反映
  function restoreFromTextarea() {
    try {
      const data = JSON.parse(jsonText) as Persisted;
      importPersisted(data);
      setMsg("テキストから反映しました。");
    } catch {
      setMsg("反映に失敗しました。JSONの形式を確認してください。");
    }
  }

  // 全リセット
  function resetAll() {
    try {
      useAppStore.getState().resetAll();
      setMsg("全データをリセットしました。");
    } catch {
      setMsg("リセットに失敗しました。");
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <Stepper />

      <Card>
        <CardHeader>データのエクスポート / インポート</CardHeader>
        <CardContent>
          {/* CardContent に className を直接渡さず、内側でレイアウト */}
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              下の JSON は現在の入力データのスナップショットです。バックアップとして保存したり、
              JSON ファイルから読み込んで続きから再開できます。
            </p>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={downloadJSON}>JSONをダウンロード</Button>
              <Button type="button" onClick={copyJSON}>JSONをコピー</Button>

              <label className="inline-flex items-center gap-2 border rounded px-3 py-2 cursor-pointer">
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={handleFile}
                />
                JSONファイルから読み込み
              </label>

              <Button type="button" onClick={resetAll}>全リセット</Button>
            </div>

            <textarea
              className="w-full min-h-[280px] border rounded p-3 font-mono text-sm"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              spellCheck={false}
            />

            <div className="flex justify-end">
              <Button type="button" onClick={restoreFromTextarea}>
                テキストから反映
              </Button>
            </div>

            {msg && <p className="text-sm text-green-700">{msg}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
