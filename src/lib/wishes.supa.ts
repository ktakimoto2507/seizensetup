"use client";
import { supabase } from "@/lib/supabase/db";

export type Bequest = { label: string; note?: string };
export type DigitalNotes = { policy?: string; contacts?: { service: string; note?: string }[] };
export type Wishes = {
  messages: string;
  bequests: Bequest[];
  digital_notes: DigitalNotes;
};

async function uid() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const id = data.user?.id;
  if (!id) throw new Error("Not authenticated");
  return id;
}

export async function getWishes(): Promise<Wishes> {
  const user_id = await uid();
  const { data, error } = await supabase
    .from("ending_wishes")
    .select("messages, bequests, digital_notes")
    .eq("user_id", user_id)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return (
    data ?? {
      messages:
`# 私の希望（例）
- 葬送：家族葬／宗派は問わず。香典・供花は丁重に辞退。
- 連絡：まず妻○○、次に兄△△。友人A/Bへは落ち着いてからでOK。
- 医療/介護：延命は過度に希望しない（詳細は別紙）。

# 誰に何を残したいか（例）
- 「大阪の倉庫Aの什器」→ 長男へ（起業支援のため）
- 「祖父の時計」→ 次女へ（成人祝いとして）
- 「写真アルバム」→ 家族共有（データ化の方針は下記）`,
      bequests: [
        { label: "祖父の時計", note: "次女へ（成人祝い）" },
        { label: "大阪の倉庫Aの什器", note: "長男へ（起業支援）" },
      ],
      digital_notes: {
        policy: "ID/パスワードは本アプリに保存しない。各サービスの退会/解約方針のみ記録。",
        contacts: [
          { service: "楽天・AmazonなどEC", note: "定期便の停止手順を家族に共有" },
          { service: "SNS（X/Instagram）", note: "追悼化の可否と希望を明記" },
        ],
      },
    }
  );
}

export async function saveWishes(payload: Wishes) {
  const user_id = await uid();
  const row = {
    user_id,
    messages: payload.messages ?? "",
    bequests: payload.bequests ?? [],
    digital_notes: payload.digital_notes ?? {},
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("ending_wishes").upsert(row, { onConflict: "user_id" });
  if (error) throw error;
}
