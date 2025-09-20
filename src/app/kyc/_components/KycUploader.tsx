// src/app/kyc/_components/KycUploader.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";     // ← エイリアス無ければ相対パスに変更
import { uploadUserAsset, getSignedUrl } from "@/lib/supabase/storage";

export default function KycUploader() {
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    setMsg(null); setErr(null); setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("ログインしてください");

      // 1) Storage に保存（user-assets/{uid}/kyc/front.png）
      const savedPath = await uploadUserAsset(user.id, f, "kyc/front.png");

      // 2) 署名付き URL でプレビュー
      const url = await getSignedUrl(savedPath, 60);
      setPreview(url);

      // 3) DB にも保存（onboarding_progress.kyc_front_path など）
      await supabase.from("onboarding_progress").upsert({
        user_id: user.id,
        kyc_front_path: savedPath,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      setMsg("KYC 画像を保存しました");
    } catch (e: any) {
      setErr(e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <input type="file" accept="image/*" onChange={onFile} disabled={saving} />
      {preview && <img src={preview} alt="preview" className="mt-2 max-w-sm rounded" />}
      {msg && <p className="text-green-700">{msg}</p>}
      {err && <p className="text-red-700">{err}</p>}
    </div>
  );
}
