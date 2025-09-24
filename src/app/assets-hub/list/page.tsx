"use client";

import { useEffect, useMemo, useState } from "react";
import { getAssets, deleteAsset, type Asset } from "@/lib/assets";

type Currency = "JPY" | "USD";

function groupBy<T, K extends string | number>(arr: T[], getKey: (t: T) => K): Record<K, T[]> {
  return arr.reduce((acc, item) => {
    const k = getKey(item);
    (acc[k] ||= []).push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

function sumByCurrency(items: Asset[]): Record<Currency, number> {
  const acc: Record<Currency, number> = { JPY: 0, USD: 0 };
  for (const a of items) acc[a.currency] += a.amount;
  return acc;
}

function fmtMoney(v: number, cur: Currency) {
  // 通貨ごとにローカライズ（日本ユーザー前提）
  const locale = cur === "JPY" ? "ja-JP" : "en-US";
  return v.toLocaleString(locale, { style: "currency", currency: cur });
}

export default function AssetListPage() {
  const [items, setItems] = useState<Asset[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // 初期読み込み & 削除後リロード
    setItems(getAssets());
  }, [refreshKey]);

  const byType = useMemo(() => groupBy(items, (a) => a.type), [items]);
  const total = useMemo(() => sumByCurrency(items), [items]);

  const handleDelete = (id: string) => {
    const ok = confirm("この資産を削除します。よろしいですか？");
    if (!ok) return;
    const done = deleteAsset(id);
    if (done) setRefreshKey((n) => n + 1);
  };

  const isEmpty = items.length === 0;

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">登録済み資産の一覧</h1>
        <a
          href="/assets-hub/new"
          className="rounded-xl bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700"
        >
          ＋ 追加
        </a>
      </header>

      {/* サマリー（通貨別合計） */}
      <section className="rounded-2xl bg-white p-4 shadow">
        <h2 className="font-medium mb-3">合計</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border p-3">
            <div className="text-gray-600">JPY 合計</div>
            <div className="text-lg font-semibold">{fmtMoney(total.JPY, "JPY")}</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-gray-600">USD 合計</div>
            <div className="text-lg font-semibold">{fmtMoney(total.USD, "USD")}</div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">※ 異なる通貨は別々に合計しています。</p>
      </section>

      {/* 空状態 */}
      {isEmpty && (
        <section className="rounded-2xl border border-dashed p-6 text-center text-gray-600">
          まだ資産がありません。{" "}
          <a href="/assets-hub/new" className="text-emerald-700 underline">
            こちらから追加
          </a>
          してください。
        </section>
      )}

      {/* タイプ別グループ */}
      {!isEmpty &&
        Object.entries(byType).map(([type, list]) => {
          const subt = sumByCurrency(list);
          return (
            <section key={type} className="rounded-2xl bg-white p-4 shadow">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">
                  {labelOf(type as Asset["type"])}（{list.length}件）
                </h3>
                <div className="text-sm text-gray-600">
                  {subt.JPY ? `JPY: ${fmtMoney(subt.JPY, "JPY")} ` : ""}
                  {subt.USD ? ` / USD: ${fmtMoney(subt.USD, "USD")}` : ""}
                </div>
              </div>

              <ul className="divide-y">
                {list.map((a) => (
                  <li key={a.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium break-words">{a.name}</div>
                      <div className="text-sm text-gray-600">
                        {fmtMoney(a.amount, a.currency)}・更新: {new Date(a.updatedAt).toLocaleString()}
                      </div>
                      {a.note ? (
                        <div className="text-sm text-gray-500 mt-1 break-words">メモ：{a.note}</div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* 編集は次回実装予定 */}
                      {/* <a href={`/assets-hub/edit/${a.id}`} className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50">編集</a> */}
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="rounded-lg border px-3 py-1 text-sm hover:bg-red-50 border-red-600 text-red-700"
                      >
                        削除
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

      <div className="flex items-center justify-between">
        <a href="/assets-hub" className="rounded-xl border px-4 py-2 hover:bg-gray-50">
          ← ハブへ戻る
        </a>
        <a
          href="/assets-hub/new"
          className="rounded-xl border px-4 py-2 hover:bg-emerald-50 border-emerald-600 text-emerald-700"
        >
          追加する
        </a>
      </div>
    </main>
  );
}

function labelOf(type: Asset["type"]) {
  switch (type) {
    case "bank":
      return "銀行預金";
    case "security":
      return "証券（株/投信/債券）";
    case "real_estate":
      return "不動産";
    case "insurance":
      return "保険";
    case "pension":
      return "年金";
    case "digital":
      return "デジタル資産";
    default:
      return "その他";
  }
}
