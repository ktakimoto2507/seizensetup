"use client";

import { supabase } from "@/lib/supabase/db";

export type Allocation = { id?: string; name: string; percent: number };

async function getUid(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const uid = data.user?.id;
  if (!uid) throw new Error("Not authenticated");
  return uid;
}

export async function getAllocations(): Promise<Allocation[]> {
  const uid = await getUid();
  const { data, error } = await supabase
    .from("beneficiaries")
    .select("id,name,percent,sort_order")
    .eq("user_id", uid)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id as string,
    name: String(r.name ?? ""),
    percent: Number(r.percent ?? 0),
  }));
}

export async function saveAllocations(bens: { name: string; percent: number }[]): Promise<void> {
  const uid = await getUid();

  // 1) 全削除（本人分のみ）
  const { error: delErr } = await supabase.from("beneficiaries").delete().eq("user_id", uid);
  if (delErr) throw delErr;

  // 2) 再挿入（表示順 sort_order 付与）
  if (bens.length) {
    const rows = bens.map((b, i) => ({
      user_id: uid,
      name: (b.name ?? "").trim() || `受益者${i + 1}`,
      percent: Math.max(0, Math.min(100, Math.round(b.percent || 0))),
      sort_order: i,
    }));
    const { error: insErr } = await supabase.from("beneficiaries").insert(rows);
    if (insErr) throw insErr;
  }

  // 3) assets_prefs.allocations も同期（JSON）
  const { error: upErr } = await supabase
    .from("assets_prefs")
    .upsert(
      {
        user_id: uid,
        allocations: { beneficiaries: bens },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  if (upErr) throw upErr;
}
