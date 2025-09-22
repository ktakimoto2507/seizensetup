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

/* ★ 追加：受益者を beneficiaries テーブルに保存（全置換） */
async function replaceBeneficiariesForUser(user_id: string, bens: BeneficiaryInput[]) {
  const { error: delErr } = await supabase
    .from("beneficiaries")
    .delete()
    .eq("user_id", user_id);
  if (delErr) throwSB(delErr, "beneficiaries.delete");

  // 2) 一括挿入（表示順を sort_order に保持）
  if (bens.length) {
    const rows = bens.map((b, i) => ({
      user_id,
      name: b.name,
      percent: b.percent,
      sort_order: i,
    }));
    const { error: insErr } = await supabase.from("beneficiaries").insert(rows);
    if (insErr) throwSB(insErr, "beneficiaries.insert");
  }
}

export async function saveAssets(
  address: AddressInput,
  beneficiaries: BeneficiaryInput[]
) {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr) throwSB(authErr, "auth.getUser");
  if (!user) throw new Error("not signed in");
  const user_id = user.id;

  // 表示用の住所（1本の文字列）
  const addressText = [address.prefecture, address.city, address.town, address.line1]
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
    if (error) throwSB(error, "profiles.upsert");
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
    if (error) throwSB(error, "assets_prefs.upsert");
  }
  // ★ ココ！ 関数の末尾で呼ぶ（同じスコープに user_id / beneficiaries がある）
  await replaceBeneficiariesForUser(user_id, beneficiaries);
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
  address_confirmed?: boolean; // ← 追加
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
    address_confirmed: !!input.address_confirmed, // ← ここで保存
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
  phone?: string; // ← 追加
};
// 既存 upsertProfile 内で「未定義は送らない」ように整形してから upsert
function compact<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== "")
  ) as Partial<T>;
}
/** ログイン中ユーザーの profiles を user_id で upsert */
export async function upsertProfile(args: UpsertProfileArgs) {
  const payload = compact(args); // ← undefined を落とす
  // 例: user_id はサーバ側でトリガー or セッションから付与している前提なら省略可
  const { data: userData, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  const user_id = userData.user?.id;
  if (!user_id) throw new Error("Not authenticated");

  const row = {
    id: user_id,
    email: args.email,
    full_name: args.full_name ?? null,
    birthday: args.birthday ?? null,
    address: args.address ?? null,
    address_json: args.address_json ?? null,
  };

  const { error } = await supabase
    .from("profiles")
    .upsert(row, { onConflict: "id" });

  if (error) throw error;
}

export async function upsertAssets(args: {
  address_json: {
    postalCode?: string;
    prefecture?: string;
    city?: string;
    town?: string;
    line1?: string;
  };
  beneficiaries: Array<{ id: string; name: string; percent: number }>;
}) {
  const { data: userData, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  const user_id = userData.user?.id;
  if (!user_id) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("assets")
    .upsert(
      {
        user_id,
        address_json: args.address_json,
        beneficiaries: args.beneficiaries,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  if (error) throw error;
}

function throwSB(error: any, where: string) {
  const msg =
    error?.message ||
    error?.error_description ||
    error?.hint ||
    JSON.stringify(error);
  throw new Error(`[${where}] ${msg}`);
}
