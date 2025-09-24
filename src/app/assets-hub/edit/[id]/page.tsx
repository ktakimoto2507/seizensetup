"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getAssets, updateAsset, type Asset, AssetTypeEnum } from "@/lib/assets.supa";

// フォームスキーマ（amount は coerce.number で統一）
const FormSchema = z.object({
  type: AssetTypeEnum,
  name: z.string().min(1, "名称は必須です"),
  amount: z.coerce.number().finite().nonnegative(),
  currency: z.enum(["JPY", "USD"]),
  note: z.string().max(1000).optional().nullable(),
});
type FormValues = z.infer<typeof FormSchema>;

export default function AssetEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = useMemo(() => String((params as { id?: string })?.id || ""), [params]);

  const [current, setCurrent] = useState<Asset | null>(null);
  const [notFound, setNotFound] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema) as unknown as import("react-hook-form").Resolver<FormValues>,
    defaultValues: {
      type: "bank",
      name: "",
      amount: 0,
      currency: "JPY",
      note: "",
    },
  });

  // 既存データのロード（非同期対応）
  useEffect(() => {
    let alive = true;
    (async () => {
      const list = await getAssets();                         // ← await を追加
      const found = list.find((a: Asset) => a.id === id) || null; // ← a: Asset を明示

      if (!alive) return;
      if (!found) {
        setNotFound(true);
        return;
      }
      setCurrent(found);
      reset({
        type: found.type,
        name: found.name,
        amount: found.amount,
        currency: found.currency,
        note: found.note ?? "",
      });
    })().catch((e) => {
      console.error(e);
      if (alive) setNotFound(true);
    });

    return () => {
      alive = false;
    };
  }, [id, reset]);


  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    if (!id) return;
    await updateAsset(id, {
      type: values.type,
      name: values.name.trim(),
      amount: values.amount,
      currency: values.currency,
      note: values.note?.trim() || "",
    });
    router.push("/assets-hub/list");
  };

  if (notFound) {
    return (
      <main className="max-w-xl mx-auto px-4 py-10 space-y-6">
        <h1 className="text-xl font-semibold">データが見つかりません</h1>
        <p className="text-gray-700">指定された資産は存在しないか、削除されています。</p>
        <a href="/assets-hub/list" className="rounded-xl border px-4 py-2 hover:bg-gray-50">
          ← 一覧へ戻る
        </a>
      </main>
    );
  }

  if (!current) {
    return (
      <main className="max-w-xl mx-auto px-4 py-10">
        <div className="animate-pulse text-gray-500">読み込み中...</div>
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-semibold">資産を編集</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* type */}
        <label className="block">
          <span className="block text-sm text-gray-700 mb-1">種類</span>
          <select className="w-full rounded-xl border px-3 py-2" {...register("type")}>
            <option value="bank">銀行預金</option>
            <option value="security">証券（株/投信/債券）</option>
            <option value="real_estate">不動産</option>
            <option value="insurance">保険</option>
            <option value="pension">年金</option>
            <option value="digital">デジタル資産</option>
            <option value="other">その他</option>
          </select>
        </label>

        {/* name */}
        <label className="block">
          <span className="block text-sm text-gray-700 mb-1">名称</span>
          <input
            type="text"
            className="w-full rounded-xl border px-3 py-2"
            placeholder="例）三井住友 普通預金、楽天証券 NISA口座 など"
            {...register("name")}
          />
          {errors.name && <span className="text-red-600 text-sm">{errors.name.message}</span>}
        </label>

        {/* amount / currency */}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-sm text-gray-700 mb-1">金額</span>
            <input
              inputMode="decimal"
              className="w-full rounded-xl border px-3 py-2"
              placeholder="0"
              {...register("amount")}
            />
            {errors.amount && (
              <span className="text-red-600 text-sm">
                {String(errors.amount.message || "金額を正しく入力してください")}
              </span>
            )}
          </label>

          <label className="block">
            <span className="block text-sm text-gray-700 mb-1">通貨</span>
            <select className="w-full rounded-xl border px-3 py-2" {...register("currency")}>
              <option value="JPY">JPY</option>
              <option value="USD">USD</option>
            </select>
          </label>
        </div>

        {/* note */}
        <label className="block">
          <span className="block text-sm text-gray-700 mb-1">メモ（任意）</span>
          <textarea
            rows={3}
            className="w-full rounded-xl border px-3 py-2"
            placeholder="補足・注意点など"
            {...register("note")}
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700 disabled:opacity-60"
          >
            保存する
          </button>
          <a href="/assets-hub/list" className="rounded-xl border px-4 py-2 hover:bg-gray-50">
            キャンセル
          </a>
        </div>
      </form>

      <p className="text-xs text-gray-500">※ 現段階ではブラウザ保存（localStorage）。後日サーバ保存に切替予定です。</p>
    </main>
  );
}
