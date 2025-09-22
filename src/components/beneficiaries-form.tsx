"use client";
import { useMemo, useState, useRef } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase/client";


export type Beneficiary = {
  id?: string;
  name: string;
  percent: number;
  relation?: string;
  relationNote?: string;
};

const RELATION_OPTIONS = [
  "配偶者", "父", "母", "息子", "娘", "兄", "姉", "弟", "妹", "祖父", "祖母", "その他",
] as const;

export default function BeneficiariesForm({
  value,
  onChange,
  userId,
  disabled = false,
}: {
  value: Beneficiary[];
  onChange: (next: Beneficiary[]) => void;
  userId: string;
  disabled?: boolean;
}) {
  const [saving, setSaving] = useState(false);

  const total = useMemo(
    () => value.reduce((s, b) => s + (Number.isFinite(b.percent) ? b.percent : 0), 0),
    [value]
  );

  // ---- helpers ----
  function clamp01(n: number) {
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  // 100%時に右端が見切れないよう固定余白を作る
  function barStyle(p: number): CSSProperties {
    const v = Math.max(0, Math.min(100, Math.round(p || 0)));
    if (v >= 100) {
      return { position: "absolute", left: 0, right: 8 }; // ← 8px 余白
    }
    return { width: `${v}%` };
  }

  // --- Dragging support ---
const draggingIndexRef = useRef<number | null>(null);
const dragRectRef = useRef<DOMRect | null>(null);

function beginDrag(idx: number, rect: DOMRect, clientX: number) {
  if (disabled) return;
  draggingIndexRef.current = idx;
  dragRectRef.current = rect;

  // すぐに1回反映（クリックだけでも反映されるように）
  applyDrag(clientX);

  // ドラッグ中は選択を無効化＆カーソル変更
  try {
    document.body.style.userSelect = "none";
    document.body.style.cursor = "ew-resize";
  } catch {}

  const onMove = (ev: PointerEvent) => applyDrag(ev.clientX);
  const onUp = () => {
    draggingIndexRef.current = null;
    dragRectRef.current = null;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    try {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    } catch {}
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
}

function applyDrag(clientX: number) {
  const idx = draggingIndexRef.current;
  const rect = dragRectRef.current;
  if (idx == null || !rect) return;

  const ratio = (clientX - rect.left) / rect.width;
  const pct = clamp01(Math.round(ratio * 100));
  rebalanceAround(idx, pct);
}

// トラックでの pointerdown ハンドラ
function onTrackPointerDown(
  idx: number,
  e: React.PointerEvent<HTMLDivElement>
) {
  if (disabled) return;
  // 子要素（塗りバー）上でも currentTarget はトラックなのでOK
  const rect = e.currentTarget.getBoundingClientRect();
  beginDrag(idx, rect, e.clientX);
}

  // 編集した行 idx を固定し、他行で合計100%に合わせる
  function rebalanceAround(idx: number, nextPercent: number) {
    const rows = value.slice();
    const fixed = clamp01(nextPercent);
    rows[idx] = { ...rows[idx], percent: fixed };

    const othersIdx = rows.map((_, i) => i).filter((i) => i !== idx);
    const rest = 100 - fixed;

    if (othersIdx.length === 0) {
      onChange([{ ...rows[idx], percent: 100 }]);
      return;
    }

    const currentOthersSum = othersIdx.reduce((s, i) => s + (rows[i].percent || 0), 0);

    let newPercents: number[] = [];
    if (currentOthersSum > 0) {
      newPercents = othersIdx.map((i) => (rows[i].percent || 0) * (rest / currentOthersSum));
    } else {
      newPercents = othersIdx.map(() => rest / othersIdx.length);
    }

    const rounded = newPercents.map((n) => clamp01(n));
    const diff = rest - rounded.reduce((s, n) => s + n, 0);
    if (diff !== 0) {
      for (let k = 0; k < Math.abs(diff); k++) {
        const t = k % rounded.length;
        rounded[t] = clamp01(rounded[t] + (diff > 0 ? 1 : -1));
      }
    }

    const next = rows.slice();
    othersIdx.forEach((i, k) => {
      next[i] = { ...next[i], percent: rounded[k] };
    });
    onChange(next);
  }

  function updateField(idx: number, patch: Partial<Beneficiary>) {
    if (disabled) return;
    const next = value.map((b, i) => (i === idx ? { ...b, ...patch } : b));
    onChange(next);
  }

  function onChangeName(idx: number, name: string) {
    updateField(idx, { name });
  }

  function onChangeRelation(idx: number, relation: string) {
    if (relation !== "その他") {
      updateField(idx, { relation, relationNote: undefined });
    } else {
      updateField(idx, { relation });
    }
  }

  function onChangeRelationNote(idx: number, note: string) {
    updateField(idx, { relationNote: note });
  }

  function onChangePercent(idx: number, raw: string) {
    if (disabled) return;
    const v = Number(raw.replace(/[^\d.-]/g, ""));
    const p = Number.isFinite(v) ? v : 0;
    rebalanceAround(idx, p);
  }

  function addRow() {
    if (disabled) return;
    const next = [
      ...value,
      { name: "", percent: 0, relation: undefined, relationNote: undefined },
    ];
    onChange(next);
  }

  function removeRow(idx: number) {
    if (disabled) return;
    const removed = value[idx]?.percent || 0;
    const rest = value.filter((_, i) => i !== idx);

    if (rest.length === 0) {
      onChange([]);
      return;
    }

    const sum = rest.reduce((s, b) => s + (b.percent || 0), 0);
    const redistributed = rest.map((b) => ({
      ...b,
      percent:
        sum > 0
          ? (b.percent || 0) + removed * ((b.percent || 0) / sum)
          : 100 / rest.length,
    }));

    let rounded = redistributed.map((b) => ({ ...b, percent: clamp01(b.percent) }));
    let diff = 100 - rounded.reduce((s, b) => s + b.percent, 0);
    for (let k = 0; k < Math.abs(diff); k++) {
      const t = k % rounded.length;
      rounded[t].percent = clamp01(rounded[t].percent + (diff > 0 ? 1 : -1));
    }
    onChange(rounded);
  }

  async function saveToDB() {
    if (disabled) return;
    setSaving(true);
    try {
      await supabase.from("beneficiaries").delete().eq("user_id", userId);
      if (value.length) {
        const rows = value.map((b, i) => ({
          user_id: userId,
          name: b.name ?? "",
          percent: Number(b.percent) || 0,
          sort_order: i,
          relation: b.relation ?? null,
          relation_note: b.relationNote ?? null,
        }));
        const { error } = await supabase.from("beneficiaries").insert(rows);
        if (error) throw error;
      }
      try {
        const raw = localStorage.getItem("seizensetup_store_v1");
        const obj = raw ? JSON.parse(raw) : {};
        obj.beneficiaries = value.map((b) => ({
          name: b.name,
          percent: Number(b.percent) || 0,
          relation: b.relation ?? undefined,
          relationNote: b.relationNote ?? undefined,
        }));
        localStorage.setItem("seizensetup_store_v1", JSON.stringify(obj));
      } catch {}
      alert("受益者配分を保存しました。");
    } catch (e) {
      console.error(e);
      alert("保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow ring-1 ring-emerald-200/70">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">受益者配分</h2>
        <div className="text-xs text-gray-600">合計 {total}%</div>
      </div>

      <div className="space-y-3">
        {value.map((b, i) => {
          const showNote = b.relation === "その他";
          return (
            <div key={i} className="space-y-2 rounded-lg border border-emerald-100/70 p-3">
              {/* 氏名 + 続き柄 */}
              <div className="grid grid-cols-12 gap-2 items-center">
                <input
                  className="col-span-5 md:col-span-5 rounded border px-3 py-2 disabled:bg-gray-50 disabled:text-gray-600"
                  placeholder={`受益者${i + 1} 氏名`}
                  value={b.name}
                  onChange={(e) => onChangeName(i, e.target.value)}
                  disabled={disabled}
                />

                <select
                  className="col-span-3 md:col-span-3 rounded border px-3 py-2 disabled:bg-gray-50 disabled:text-gray-600"
                  value={b.relation ?? ""}
                  onChange={(e) => onChangeRelation(i, e.target.value)}
                  disabled={disabled}
                >
                  <option value="">続き柄を選択</option>
                  {RELATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>

                {showNote ? (
                  <input
                    className="col-span-4 md:col-span-4 rounded border px-3 py-2 disabled:bg-gray-50 disabled:text-gray-600"
                    placeholder="続き柄（自由入力）"
                    value={b.relationNote ?? ""}
                    onChange={(e) => onChangeRelationNote(i, e.target.value)}
                    disabled={disabled}
                  />
                ) : (
                  <div className="col-span-4 md:col-span-4 text-xs text-gray-500" />
                )}
              </div>

              {/* パーセンテージ行（バー + 数値 + 単位） */}
              <div className="grid grid-cols-12 gap-2 items-center">
                {/* バー：1カラム縮め、入力欄のスペースを確保 */}
                <div
                className={`col-span-8 md:col-span-9 relative h-2.5 w-full rounded-full bg-gray-100 overflow-hidden ${
                    disabled ? "" : "cursor-ew-resize select-none touch-none"
                }`}
                onPointerDown={(e) => onTrackPointerDown(i, e)}
                >
                <div
                    className={`absolute left-0 top-0 bottom-0 rounded-full ${
                    b.percent >= 50 ? "bg-emerald-600" : "bg-emerald-500"
                    }`}
                    style={barStyle(b.percent)}
                />
                </div>


                {/* 数値入力：広めの固定幅（100が切れない） */}
                <div className="col-span-3 md:col-span-2 flex items-center justify-end gap-1">
                  <input
                    className="rounded border px-2 py-1 text-right tabular-nums disabled:bg-gray-50 disabled:text-gray-600 w-[78px] md:w-[90px]"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min={0}
                    max={100}
                    value={String(b.percent ?? 0)}
                    onChange={(e) => onChangePercent(i, e.target.value)}
                    disabled={disabled}
                  />
                </div>

                {/* 単位 */}
                <div className="col-span-1 text-sm text-gray-600">%</div>

                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="col-span-12 md:col-span-12 mt-2 rounded-lg border px-2 py-1 text-sm hover:bg-gray-50"
                  >
                    行を削除
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!disabled && (
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={addRow}
            className="rounded-xl border border-emerald-600 px-3 py-1.5 text-emerald-700 hover:bg-emerald-50 text-sm"
          >
            行を追加
          </button>

          <button
            type="button"
            onClick={saveToDB}
            disabled={saving}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-white disabled:opacity-60 hover:bg-emerald-700 text-sm"
          >
            {saving ? "保存中…" : "受益者配分を保存"}
          </button>
        </div>
      )}

      {disabled && (
        <p className="mt-3 text-[11px] leading-4 text-gray-500">
          ※ 編集ボタンを押すと、受益者配分と続き柄を編集できます。
        </p>
      )}
    </div>
  );
}
