// src/lib/family.repo.ts
"use client";

import { supabase } from "@/lib/supabase/client";
import type { FamilyMember } from "@/types/share";

/** 1) 自分の family_groups を確実に用意（存在しなければ作成） */
export async function ensureMyFamilyGroup(): Promise<string> {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const { data: existing, error: e1 } = await supabase
    .from("family_groups")
    .select("id")
    .eq("owner_id", uid)
    .maybeSingle();

  if (e1) throw e1;
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("family_groups")
    .insert({ owner_id: uid })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

/** 2) 招待を作成（メール推奨。name/relation は任意） */
export async function inviteMember(input: {
  email?: string;
  phone?: string;
  name?: string;
  relation?: string;
}) {
  const groupId = await ensureMyFamilyGroup();

  const { data, error } = await supabase
    .from("family_members")
    .insert({
      group_id: groupId,
      email: input.email ?? null,
      phone: input.phone ?? null,
      name: input.name ?? null,
      relation: input.relation ?? null,
      status: "invited",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as FamilyMember;
}

/** 3) 受諾（ログイン中ユーザー=自分を紐付け、active化） */
export async function acceptInvite(memberId: string) {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("family_members")
    .update({
      user_id: uid,
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", memberId)
    .select("*")
    .single();

  if (error) throw error;
  return data as FamilyMember;
}

/** 4) オーナー視点のメンバー一覧 */
export async function listMyMembersAsOwner() {
  const groupId = await ensureMyFamilyGroup();

  const { data, error } = await supabase
    .from("family_members")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as FamilyMember[];
}

/** 5) ビューア（家族）として自分が参加しているメンバー行 */
export async function listMyMembershipsAsViewer() {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("family_members")
    .select("*")
    .eq("user_id", uid)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as FamilyMember[];
}
