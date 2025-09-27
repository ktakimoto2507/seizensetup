// src/lib/share.repo.ts
"use client";

import { supabase } from "@/lib/supabase/client";
import type { ShareResource, ShareScope } from "@/types/share";

/** 現在ユーザーが ownerId の resource を閲覧可能か（RLSを前提に確認） */
export async function canView(ownerId: string, resource: ShareResource) {
  const me = (await supabase.auth.getUser()).data.user?.id;
  if (!me) return false;
  if (me === ownerId) return true;

  // share_grants を SELECT。RLSにより自分宛のグラントだけ見える。
  const { data, error } = await supabase
    .from("share_grants")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("resource_type", resource)
    .in("scope", ["read", "write", "manage"])
    .limit(1);

  if (error) return false;
  return (data?.length ?? 0) > 0;
}

/** オーナーとして、特定メンバーに read グラントを付与/更新（idempotent） */
export async function upsertReadGrant(memberId: string, resource: ShareResource) {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("share_grants")
    .upsert(
      {
        owner_id: uid,
        member_id: memberId,
        resource_type: resource,
        scope: "read" as ShareScope,
      },
      { onConflict: "owner_id,member_id,resource_type" }
    )
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

/** オーナーとして、特定メンバーから resource のグラントを剥奪 */
export async function revokeGrant(memberId: string, resource: ShareResource) {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("share_grants")
    .delete()
    .eq("owner_id", uid)
    .eq("member_id", memberId)
    .eq("resource_type", resource);

  if (error) throw error;
}
// --- ここから下をファイル末尾に追記してください ---

/** メンバー単位のREADグラント一覧（オーナー視点） */
export async function listGrantsByMembers(memberIds: string[]) {
  if (!memberIds.length) return [] as { member_id: string; resource_type: ShareResource }[];
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("share_grants")
    .select("member_id, resource_type")
    .eq("owner_id", uid)
    .in("member_id", memberIds);

  if (error) throw error;
  return (data ?? []) as { member_id: string; resource_type: ShareResource }[];
}

/** チェックボックス用：ONならupsert、OFFならrevoke */
export async function setGrant(memberId: string, resource: ShareResource, enabled: boolean) {
  if (enabled) {
    await upsertReadGrant(memberId, resource);
  } else {
    await revokeGrant(memberId, resource);
  }
}
