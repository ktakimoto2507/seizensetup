"use client";

import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addAsset, AssetTypeEnum } from "@/lib/assets.supa";

// ① amount を安全に数値へ（空文字や未入力は 0）
const FormSchema = z.object({
  type: AssetTypeEnum,
  name: z.string().min(1, "名称は必須です"),
  amount: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? 0 : Number(v)),
    z.number().finite().nonnegative()
  ),
  currency: z.enum(["JPY", "USD"]),
  note: z.string().max(1000).optional().nullable(),
});
type FormValues = z.infer<typeof FormSchema>;

export default function AssetNewPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // ② Resolver の型を明示
    resolver: zodResolver(FormSchema) as Resolver<FormValues>,
    defaultValues: {
      type: "bank",
      currency: "JPY",
      amount: 0,        // ③ 初期値を数値で
      note: "",
    },
  });

  // ④ SubmitHandler で型を固定
  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    await addAsset({
      type: values.type,
      name: values.name.trim(),
      amount: values.amount,
      currency: values.currency,
      note: values.note?.trim() || "",
    });
    router.push("/assets-hub/list");
  };

  return (
    <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-semibold">資産を追加</h1>

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
            追加する
          </button>
          <a href="/assets-hub" className="rounded-xl border px-4 py-2 hover:bg-gray-50">
            キャンセル
          </a>
        </div>
      </form>

      <p className="text-xs text-gray-500">※ 現段階ではブラウザ保存（localStorage）。後日サーバ保存に切替予定です。</p>
    </main>
  );
}
