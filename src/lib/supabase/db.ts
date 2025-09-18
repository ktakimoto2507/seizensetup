// src/lib/supabase/db.ts
import { supabase } from "./client";

// 住所入力の型（line2 は使いません）
export type AddressInput = {
  postalCode?: string;
  prefecture?: string;
  city?: string;
  town?: string;
  line1?: string;
};

// 受益者（名前と比率）
export type BeneficiaryInput = { name: string; percent: number };

/**
 * Assets画面からの保存：
 * - profiles.address / profiles.address_json に住所を保存
 * - assets_prefs.allocations に beneficiaries をJSONで保存
 *
 * ※ 既存のスキーマ（profiles: id/email/full_name/address/address_json, assets_prefs: user_id/allocations/risk_profile）に合わせています
 * ※ beneficiaries 用の新テーブルは作りません
 */
export async function saveAssets(
  address: AddressInput,
  beneficiaries: BeneficiaryInput[]
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");
  const user_id = user.id;

  // 表示用の住所（1本の文字列）
  const addressText = [
    address.prefecture,
    address.city,
    address.town,
    address.line1,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  // JSONでも保持（将来の編集や分割表示に使える）
  const addressJson = {
    postalCode: address.postalCode ?? null,
    prefecture: address.prefecture ?? null,
    city: address.city ?? null,
    town: address.town ?? null,
    line1: address.line1 ?? null,
  };

  // profiles は Step1 で作ったスキーマに合わせ、PKは id
  {
    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user_id,
          address: addressText || null,
          address_json: addressJson,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    if (error) throw error;
  }

  // 配分は assets_prefs.allocations に JSON として保存（上書きでOK）
  {
    const allocations = { beneficiaries };
    const { error } = await supabase
      .from("assets_prefs")
      .upsert(
        {
          user_id,
          allocations,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    if (error) throw error;
  }
}

/**
 * KYC 画像を Storage(user-assets) にアップロードし、
 * パスを public.kyc_files に1行保存する
 */
export async function saveKycSubmission(input: {
  doc_type: "driver" | "myNumber" | "passport";
  front: File;             // 必須
  back?: File | null;      // パスポート時は null でOK
  selfie: File;            // 必須
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const uid = user.id;

  const bucket = "user-assets";  // 既に作成済みのバケット名
  const stamp = Date.now();

  async function uploadOne(label: string, file?: File | null) {
    if (!file) return null;
    const ext = (file.name?.split(".").pop() || "bin").toLowerCase();
    const path = `${uid}/kyc/${stamp}_${label}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
      contentType: file.type || undefined,
    });
    if (error) throw error;
    return path;
  }

  const [front_path, back_path, selfie_path] = await Promise.all([
    uploadOne("front", input.front),
    uploadOne("back",  input.back),
    uploadOne("selfie", input.selfie),
  ]);

  const { error: insertErr } = await supabase.from("kyc_files").insert({
    user_id: uid,
    doc_type: input.doc_type,
    front_path,
    back_path,
    selfie_path,
    status: "submitted",
  });
  if (insertErr) throw insertErr;

  return { ok: true as const, front_path, back_path, selfie_path };
}

export type UpsertProfileArgs = {
  email: string;
  full_name?: string | null;
  birthday?: string | null;    // "YYYY-MM-DD"
  address?: string | null;
  address_json?: any | null;
};

/** ログイン中ユーザーの profiles を user_id で upsert */
export async function upsertProfile(args: UpsertProfileArgs) {
  const { data: userData, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  const user_id = userData.user?.id;
  if (!user_id) throw new Error("Not authenticated");

  const row = {
    user_id,
    email: args.email,
    full_name: args.full_name ?? null,
    birthday: args.birthday ?? null,
    address: args.address ?? null,
    address_json: args.address_json ?? null,
  };

  const { error } = await supabase
    .from("profiles")
    .upsert(row, { onConflict: "user_id" });

  if (error) throw error;
}
