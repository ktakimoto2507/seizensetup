// src/lib/contacts.repo.ts
"use client";

import { supabase } from "@/lib/supabase/client";
import type { Contact } from "@/types/share";

/** 自分の連絡先一覧（owner） */
export async function listMyContacts(): Promise<Contact[]> {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("owner_id", uid)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Contact[];
}

/** 連絡先作成（owner） */
export async function createContact(input: {
  name: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  note?: string | null;
  is_shared?: boolean;
}): Promise<Contact> {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const payload = {
    owner_id: uid,
    name: input.name,
    role: input.role ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    note: input.note ?? null,
    is_shared: input.is_shared ?? true,
  };

  const { data, error } = await supabase
    .from("contacts")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data as Contact;
}

/** ビューア（家族）として、ownerId の共有ON連絡先を一覧（RLSが判定） */
export async function listSharedContactsOf(ownerId: string): Promise<Contact[]> {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Contact[];
}
