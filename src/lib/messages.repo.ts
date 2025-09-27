// src/lib/messages.repo.ts
"use client";

import { supabase } from "@/lib/supabase/client";
import type { LegacyMessage } from "@/types/share";

/** 自分のメッセージ一覧（owner） */
export async function listMyMessages(): Promise<LegacyMessage[]> {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("legacy_messages")
    .select("*")
    .eq("owner_id", uid)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as LegacyMessage[];
}

/** メッセージ作成（owner） */
export async function createMessage(input: {
  title: string;
  body: string;
  visibility: "private" | "shared";
}): Promise<LegacyMessage> {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("legacy_messages")
    .insert({ owner_id: uid, ...input })
    .select("*")
    .single();

  if (error) throw error;
  return data as LegacyMessage;
}

/** ビューア（家族）として、ownerId の shared メッセージを一覧（RLSが判定） */
export async function listSharedMessagesOf(ownerId: string): Promise<LegacyMessage[]> {
  const { data, error } = await supabase
    .from("legacy_messages")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as LegacyMessage[];
}
