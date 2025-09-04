"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, CardHeader, CardContent, Input } from "@/components/ui";
import { useAppStore, getPersisted, importPersisted, Persisted } from "@/lib/store";
import { Stepper } from "@/components/stepper";

export default function DataPage() {
  // 繧ｹ繝医い・郁｡ｨ遉ｺ譖ｴ譁ｰ縺ｮ縺溘ａ縺ｫ蜿ら・・・
  const state = useAppStore();
  const [jsonText, setJsonText] = useState("");
  const [msg, setMsg] = useState<string>("");

  // 迴ｾ蝨ｨ繝・・繧ｿ繧貞ｸｸ縺ｫJSON縺ｨ縺励※陦ｨ遉ｺ
  useEffect(() => {
    setJsonText(JSON.stringify(getPersisted(), null, 2));
  }, [state]); // 菴輔°縺悟､峨ｏ繧九◆縺ｳ縺ｫ譖ｴ譁ｰ

  // JSON繧偵ム繧ｦ繝ｳ繝ｭ繝ｼ繝・
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
    setMsg("JSON繧偵ム繧ｦ繝ｳ繝ｭ繝ｼ繝峨＠縺ｾ縺励◆縲・);
  }

  // 繧ｯ繝ｪ繝・・繝懊・繝峨↓繧ｳ繝斐・
  async function copyJSON() {
    try {
      await navigator.clipboard.writeText(jsonText);
      setMsg("繧ｯ繝ｪ繝・・繝懊・繝峨↓繧ｳ繝斐・縺励∪縺励◆縲・);
    } catch {
      setMsg("繧ｳ繝斐・縺ｫ螟ｱ謨励＠縺ｾ縺励◆縲・);
    }
  }

  // 繝輔ぃ繧､繝ｫ縺九ｉ隱ｭ縺ｿ霎ｼ縺ｿ
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as Persisted;
        importPersisted(data);
        setMsg("繝輔ぃ繧､繝ｫ縺九ｉ隱ｭ縺ｿ霎ｼ縺ｿ縺ｾ縺励◆縲・);
      } catch {
        setMsg("隱ｭ縺ｿ霎ｼ縺ｿ縺ｫ螟ｱ謨励＠縺ｾ縺励◆・・SON蠖｢蠑上ｒ遒ｺ隱阪＠縺ｦ縺上□縺輔＞・峨・);
      }
    };
    reader.readAsText(f, "utf-8");
    e.currentTarget.value = ""; // 蜷後§繝輔ぃ繧､繝ｫ縺ｧ繧ょ・驕ｸ謚槭〒縺阪ｋ繧医≧縺ｫ
  }

  // 繝・く繧ｹ繝医お繝ｪ繧｢縺九ｉ蠕ｩ蜈・
  function restoreFromTextarea() {
    try {
      const data = JSON.parse(jsonText) as Persisted;
      importPersisted(data);
      setMsg("繝・く繧ｹ繝医°繧牙ｾｩ蜈・＠縺ｾ縺励◆縲・);
    } catch {
      setMsg("蠕ｩ蜈・↓螟ｱ謨励＠縺ｾ縺励◆・・SON蠖｢蠑上ｒ遒ｺ隱阪＠縺ｦ縺上□縺輔＞・峨・);
    }
  }

  // 蜈ｨ繝ｪ繧ｻ繝・ヨ
  function resetAll() {
    useAppStore.getState().resetAll();
    setMsg("縺吶∋縺ｦ縺ｮ繝・・繧ｿ繧貞・譛溷喧縺励∪縺励◆縲・);
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <Stepper />

      <Card>
        <CardHeader>繝・・繧ｿ縺ｮ繧ｨ繧ｯ繧ｹ繝昴・繝・/ 繧､繝ｳ繝昴・繝・/CardHeader>
        <CardContent><div className="space-y-4">
          <p className="text-sm text-gray-700">
            荳九・JSON縺ｯ迴ｾ蝨ｨ縺ｮ蜈･蜉帙ョ繝ｼ繧ｿ縺ｮ繧ｹ繝翫ャ繝励す繝ｧ繝・ヨ縺ｧ縺吶ゅヰ繝・け繧｢繝・・縺ｨ縺励※菫晏ｭ倥＠縺溘ｊ縲∝挨繝悶Λ繧ｦ繧ｶ縺ｧ隱ｭ縺ｿ霎ｼ繧薙〒邯壹″縺九ｉ蜀埼幕縺ｧ縺阪∪縺吶・
          </p>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={downloadJSON}>JSON繧偵ム繧ｦ繝ｳ繝ｭ繝ｼ繝・/Button>
            <Button type="button" onClick={copyJSON}>JSON繧偵さ繝斐・</Button>
            <label className="inline-flex items-center gap-2 border rounded px-3 py-2 cursor-pointer">
              <input type="file" accept="application/json" className="hidden" onChange={handleFile} />
              JSON繝輔ぃ繧､繝ｫ縺九ｉ隱ｭ縺ｿ霎ｼ縺ｿ
            </label>
            <Button type="button" onClick={resetAll}>蜈ｨ繝ｪ繧ｻ繝・ヨ</Button>
          </div>

          <textarea
            className="w-full min-h-[280px] border rounded p-3 font-mono text-sm"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" onClick={restoreFromTextarea}>繝・く繧ｹ繝医°繧牙ｾｩ蜈・/Button>
          </div>

          {msg && <p className="text-sm text-green-700">{msg}</p>}
        </div></CardContent>
      </Card>
    </div>
  );
}


