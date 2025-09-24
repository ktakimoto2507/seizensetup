// src/lib/assets.supa.ts
"use client";

import { z } from "zod";
// 既存の型を再利用（assets.ts と同じ形を維持）
export const AssetTypeEnum = z.enum([
  "bank", "security", "real_estate", "insurance", "pension", "digital", "other",
]);
export const AssetSchema = z.object({
  id: z.string().uuid(),
  type: AssetTypeEnum,
  name: z.string(),
  amount: z.number().finite().nonnegative(),
  currency: z.enum(["JPY","USD"]),
  note: z.string().nullable().optional(),
  updatedAt: z.string(), // ISO
});
export type Asset = z.infer<typeof AssetSchema>;

// ← あなたの Supabase クライアントの実装に合わせて調整してください
// 例: export const supabase = createClient(...)
// ここでは named export "supabase" を想定
import { supabase } from "@/lib/supabase/db";

// DB行 <-> UI型 変換
type DbRow = {
  id: string;
  user_id: string;
  type: Asset["type"];
  name: string;
  amount: string | number;   // numeric は string で返ることがある
  currency: "JPY" | "USD";
  note: string | null;
  updated_at: string;
};
const fromRow = (r: DbRow): Asset => ({
  id: r.id,
  type: r.type,
  name: r.name,
  amount: typeof r.amount === "string" ? Number(r.amount) : r.amount,
  currency: r.currency,
  note: r.note ?? "",
  updatedAt: r.updated_at,
});

async function getUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const uid = data.user?.id;
  if (!uid) throw new Error("Not authenticated");
  return uid;
}

// ---- Public API (assets.ts と同じ関数名/引数/戻り値) ----
export async function getAssets(): Promise<Asset[]> {
  const uid = await getUserId();
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("user_id", uid)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromRow).filter(a => AssetSchema.safeParse(a).success);
}

export async function addAsset(input: Omit<Asset, "id" | "updatedAt">): Promise<Asset> {
  const uid = await getUserId();
  const payload = {
    user_id: uid,
    type: input.type,
    name: input.name,
    amount: input.amount,     // numeric
    currency: input.currency,
    note: input.note ?? null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("assets")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return fromRow(data as DbRow);
}

export async function updateAsset(
  id: string,
  patch: Partial<Omit<Asset, "id" | "updatedAt">>
): Promise<Asset | null> {
  const uid = await getUserId();
  const payload: any = {
    ...(patch.type ? { type: patch.type } : {}),
    ...(patch.name ? { name: patch.name } : {}),
    ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
    ...(patch.currency ? { currency: patch.currency } : {}),
    note: patch.note ?? null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("assets")
    .update(payload)
    .eq("id", id)
    .eq("user_id", uid)        // RLS でも保護されるが明示
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as DbRow) : null;
}

export async function deleteAsset(id: string): Promise<boolean> {
  const uid = await getUserId();
  const { error, count } = await supabase
    .from("assets")
    .delete({ count: "estimated" })
    .eq("id", id)
    .eq("user_id", uid);
  if (error) throw error;
  return (count ?? 0) > 0;
}
