"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, CardHeader, CardContent, Input } from "@/components/ui";
import { useAppStore, getPersisted, importPersisted, Persisted } from "@/lib/store";
import { Stepper } from "@/components/stepper";

export default function DataPage() {
  // ストア�E�表示更新のために参�E�E�E
  const state = useAppStore();
  const [jsonText, setJsonText] = useState("");
  const [msg, setMsg] = useState<string>("");

  // 現在チE�Eタを常にJSONとして表示
  useEffect(() => {
    setJsonText(JSON.stringify(getPersisted(), null, 2));
  }, [state]); // 何かが変わるたびに更新

  // JSONをダウンローチE
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
    setMsg("JSONをダウンロードしました、E);
  }

  // クリチE�Eボ�Eドにコピ�E
  async function copyJSON() {
    try {
      await navigator.clipboard.writeText(jsonText);
      setMsg("クリチE�Eボ�Eドにコピ�Eしました、E);
    } catch {
      setMsg("コピ�Eに失敗しました、E);
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
        setMsg("ファイルから読み込みました、E);
      } catch {
        setMsg("読み込みに失敗しました�E�ESON形式を確認してください�E�、E);
      }
    };
    reader.readAsText(f, "utf-8");
    e.currentTarget.value = ""; // 同じファイルでも�E選択できるように
  }

  // チE��ストエリアから復允E
  function restoreFromTextarea() {
    try {
      const data = JSON.parse(jsonText) as Persisted;
      importPersisted(data);
      setMsg("チE��ストから復允E��ました、E);
    } catch {
      setMsg("復允E��失敗しました�E�ESON形式を確認してください�E�、E);
    }
  }

  // 全リセチE��
  function resetAll() {
    useAppStore.getState().resetAll();
    setMsg("すべてのチE�Eタを�E期化しました、E);
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <Stepper />

      <Card>
        <CardHeader>チE�Eタのエクスポ�EチE/ インポ�EチE/CardHeader>
        <CardContent><div className="space-y-4">
          <p className="text-sm text-gray-700">
            下�EJSONは現在の入力データのスナップショチE��です。バチE��アチE�Eとして保存したり、別ブラウザで読み込んで続きから再開できます、E
          </p>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={downloadJSON}>JSONをダウンローチE/Button>
            <Button type="button" onClick={copyJSON}>JSONをコピ�E</Button>
            <label className="inline-flex items-center gap-2 border rounded px-3 py-2 cursor-pointer">
              <input type="file" accept="application/json" className="hidden" onChange={handleFile} />
              JSONファイルから読み込み
            </label>
            <Button type="button" onClick={resetAll}>全リセチE��</Button>
          </div>

          <textarea
            className="w-full min-h-[280px] border rounded p-3 font-mono text-sm"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" onClick={restoreFromTextarea}>チE��ストから復允E/Button>
          </div>

          {msg && <p className="text-sm text-green-700">{msg}</p>}
        </div></CardContent>
      </Card>
    </div>
  );
}

