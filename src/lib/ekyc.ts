// 実運用ではここを eKYC ベンダーの SDK / REST に差し替え
export type DocType = "driver" | "myNumber" | "passport";

export type EkycPayload = {
  docType: DocType;
  front: File;         // 表
  back?: File | null;  // 裏（パスポートは不要）
  selfie: File;        // 顔写真
  addressConfirmed: boolean;
};

export type EkycResult = {
  ok: boolean;
  score?: number;  // 顔照合などのスコア（モック）
  reason?: string;
};

export async function submitEkyc(payload: EkycPayload): Promise<EkycResult> {
  // 例: REST
  // const form = new FormData();
  // form.append("docType", payload.docType);
  // form.append("front", payload.front);
  // if (payload.back) form.append("back", payload.back);
  // form.append("selfie", payload.selfie);
  // form.append("addressConfirmed", String(payload.addressConfirmed));
  // const res = await fetch("/api/ekyc", { method: "POST", body: form });
  // return await res.json();

  // ---- モック ----
  await new Promise((r) => setTimeout(r, 700));
  if (!payload.addressConfirmed) return { ok: false, reason: "住所不一致" };
  return { ok: true, score: 0.97 };
}
