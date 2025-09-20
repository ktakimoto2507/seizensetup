// lib/supabase/storage.ts
import { supabase } from "@/lib/supabase/client";

export async function uploadUserAsset(userId: string, file: File, filename: string) {
  const path = `${userId}/${filename}`; // ← ポリシーに合うパス
  const { data, error } = await supabase.storage
    .from("user-assets")
    .upload(path, file, { upsert: true, cacheControl: "3600" });

  if (error) throw error;
  return data.path;     // 例: "uid/kyc/front.png"
}

export async function getSignedUrl(path: string, expiresSec = 60) {
  const { data, error } = await supabase.storage
    .from("user-assets")
    .createSignedUrl(path, expiresSec);
  if (error) throw error;
  return data.signedUrl;
}
