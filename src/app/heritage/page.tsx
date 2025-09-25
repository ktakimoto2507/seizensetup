"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardHeader, CardContent } from "@/components/ui"; // Inputは未使用のため外しました
import { getAllocations, saveAllocations, type Allocation } from "@/lib/heritage.supa";

// 合計100%を維持する調整ロジック
function adjust(items: Allocation[], id: string, newValue: number): Allocation[] {
  const clamped = Math.max(0, Math.min(100, Math.round(newValue)));
  const idx = items.findIndex((b) => b.id === id);
  if (idx < 0) return items;
  const others = items.filter((_, i) => i !== idx);
  const remaining = 100 - clamped;
  const sumOthers = others.reduce((s, b) => s + b.percent, 0) || 1;
  const redistributed = others.map((b) => ({
    ...b,
    percent: Math.round((b.percent / sumOthers) * remaining),
  }));
  const diff = 100 - (clamped + redistributed.reduce((s, b) => s + b.percent, 0));
  if (redistributed.length > 0) redistributed[0].percent += diff;

  const res: Allocation[] = [];
  let j = 0;
  for (let i = 0; i < items.length; i++) {
    if (i === idx) res.push({ ...items[i], percent: clamped });
    else res.push(redistributed[j++]);
  }
  return res;
}

function localUid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function HeritagePage() {
  const router = useRouter();
  const [rows, setRows] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const didInit = useRef(false);

  // 初回ロード
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    (async () => {
      try {
        const list = await getAllocations();
        if (list.length === 0) {
          setRows([{ id: localUid(), name: "受益者A", percent: 100 }]);
        } else {
          setRows(list.map((b) => ({ id: b.id || localUid(), name: b.name, percent: b.percent })));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const total = useMemo(() => rows.reduce((s, b) => s + b.percent, 0), [rows]);
  const totalOk = total === 100;

  function addOne() {
    const next = [...rows, { id: localUid(), name: `受益者${String.fromCharCode(65 + rows.length)}`, percent: 0 }];
    // 均等化
    const even = Math.floor(100 / next.length);
    const res = next.map((b) => ({ ...b, percent: even }));
    let rem = 100 - res.reduce((s, b) => s + b.percent, 0);
    for (let i = 0; i < res.length && rem > 0; i++, rem--) res[i].percent += 1;
    setRows(res);
  }

  function removeOne(id: string) {
    const left = rows.filter((b) => b.id !== id);
    if (left.length === 0) return;
    const sum = left.reduce((s, b) => s + b.percent, 0) || 1;
    const res = left.map((b) => ({ ...b, percent: Math.round((b.percent / sum) * 100) }));
    const diff = 100 - res.reduce((s, b) => s + b.percent, 0);
    if (res.length > 0) res[0].percent += diff;
    setRows(res);
  }

  async function onSave() {
    if (!totalOk) {
      alert("合計が100%になるよう調整してください");
      return;
    }
    setSaving(true);
    try {
      await saveAllocations(rows.map(({ name, percent }) => ({ name: name.trim(), percent })));
      alert("分配を保存しました");
      router.refresh();
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "保存に失敗しました";
      alert(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="max-w-2xl mx-auto p-4">読み込み中…</div>;

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-semibold">相続・分配</h1>
      <Card>
        <CardHeader>受益者配分（合計 {total}%）</CardHeader>
        <CardContent>
          <div className={`text-sm mb-3 ${totalOk ? "text-green-700" : "text-red-700"}`}>
            {totalOk ? "合計は100%です" : "合計が100%になるよう調整してください"}
          </div>

          <div className="space-y-4">
            {rows.map((b) => (
              <div key={b.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <input
                    className="border rounded px-2 py-1 w-40"
                    value={b.name}
                    onChange={(e) =>
                      setRows(rows.map((x) => (x.id === b.id ? { ...x, name: e.target.value } : x)))
                    }
                    placeholder="受益者名"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{b.percent}%</span>
                    <button
                      type="button"
                      className="text-sm px-2 py-1 rounded border"
                      onClick={() => removeOne(b.id!)}
                      disabled={rows.length <= 1}
                      title={rows.length <= 1 ? "受益者は最低1名必要です" : "削除"}
                    >
                      削除
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={b.percent}
                  onChange={(e) => setRows(adjust(rows, b.id!, Number(e.target.value)))}
                  className="w-full"
                />
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-between">
            <button type="button" className="text-sm px-3 py-1 rounded border" onClick={addOne}>
              受益者を追加
            </button>
            <div className="text-sm text-gray-600">受益者数：{rows.length}</div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        <Button type="button" onClick={() => router.back()}>戻る</Button>
        <Button type="button" onClick={onSave} disabled={saving || !totalOk}>
          {saving ? "保存中…" : "保存する"}
        </Button>
      </div>
    </main>
  );
}
