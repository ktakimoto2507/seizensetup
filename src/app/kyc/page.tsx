"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Stepper } from "@/components/stepper";
import { useAppStore } from "@/lib/store";
import type { DocType, EkycPayload } from "@/lib/ekyc";
import { submitEkyc } from "@/lib/ekyc";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function usePreviewURL(file: File | null) {
  const [url, setUrl] = useState<string>("");
  const prev = useRef<string>("");

  useEffect(() => {
    if (prev.current) URL.revokeObjectURL(prev.current);
    if (file) {
      const next = URL.createObjectURL(file);
      prev.current = next;
      setUrl(next);
    } else {
      prev.current = "";
      setUrl("");
    }
    return () => {
      if (prev.current) URL.revokeObjectURL(prev.current);
    };
  }, [file]);

  return url;
}

// ルートガード：step<1 なら /onboarding へ
function useKycGuard() {
  const router = useRouter();
  const step = useAppStore((s) => s.step);
  useEffect(() => {
    if (step < 1) router.replace("/onboarding");
  }, [step, router]);
}

export default function KycPage() {
  useKycGuard();

  const router = useRouter();
  const setStep = useAppStore((s) => s.setStep);

  const [docType, setDocType] = useState<DocType>("driver");
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [addrConfirmed, setAddrConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  // このページに来たらステップ=1
  useEffect(() => setStep(1), [setStep]);

  const frontURL = usePreviewURL(front);
  const backURL = usePreviewURL(back);
  const selfieURL = usePreviewURL(selfie);

  const backNeeded = docType !== "passport";
  const ready = useMemo(() => {
    const hasAll = !!front && (!!back || !backNeeded) && !!selfie && addrConfirmed;
    return hasAll;
  }, [backNeeded, front, back, selfie, addrConfirmed]);

  const progress = useMemo(() => {
    let n = 0;
    if (front) n += 25;
    if (backNeeded) {
      if (back) n += 25;
    } else {
      n += 25;
    }
    if (selfie) n += 25;
    if (addrConfirmed) n += 25;
    return n;
  }, [backNeeded, front, back, selfie, addrConfirmed]);

  async function handleNext() {
    setError("");
    if (!ready) {
      setError("必要な項目が揃っていません。");
      return;
    }
    if (!front || !selfie) return;
    const payload: EkycPayload = { docType, front, back, selfie, addressConfirmed: addrConfirmed };
    setSubmitting(true);
    try {
      const result = await submitEkyc(payload);
      if (!result.ok) {
        setError(result.reason ?? "本人確認に失敗しました。");
        setSubmitting(false);
        return;
      }
      setStep(2);
      router.push("/assets");
    } catch {
      setError("接続に失敗しました。時間をおいて再試行してください。");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      <Stepper />

      <Card>
        <CardHeader>本人確認（KYC）</CardHeader>
        <CardContent className="space-y-6">
          {/* 進捗 */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-700">進捗</span>
              <span className="text-gray-700">{progress}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-2 bg-green-600" style={{ width: `${progress}%`, transition: "width .2s ease" }} />
            </div>
          </div>

          {/* 書類種別 */}
          <div>
            <label className="block mb-1 font-medium">提出する書類</label>
            <div className="grid grid-cols-3 gap-2 text-sm">
              {(["driver","myNumber","passport"] as DocType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDocType(t)}
                  className={`border rounded px-3 py-2 ${docType === t ? "border-green-600" : "border-gray-300"}`}
                >
                  {t === "driver" ? "運転免許証" : t === "myNumber" ? "マイナンバーカード" : "パスポート"}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {docType === "passport"
                ? "パスポートは裏面の提出は不要です。"
                : docType === "myNumber"
                ? "マイナンバーの個人番号はマスキングしてください。"
                : "運転免許証は表・裏をご提出ください。"}
            </p>
          </div>

          {/* 表面 */}
          <div>
            <label className="block mb-1 font-medium">書類（表面）</label>
            <div className="flex items-center gap-3">
              <Input type="file" accept="image/*" capture="environment" onChange={(e) => setFront(e.target.files?.[0] ?? null)} />
              {front && (
                <button type="button" className="text-sm px-3 py-1 rounded border" onClick={() => setFront(null)}>
                  削除
                </button>
              )}
            </div>
            {frontURL && <div className="mt-2"><img src={frontURL} alt="front preview" className="max-h-40 rounded border" /></div>}
          </div>

          {/* 裏面（パスポートは不要） */}
          {backNeeded && (
            <div>
              <label className="block mb-1 font-medium">書類（裏面）</label>
              <div className="flex items-center gap-3">
                <Input type="file" accept="image/*" capture="environment" onChange={(e) => setBack(e.target.files?.[0] ?? null)} />
                {back && (
                  <button type="button" className="text-sm px-3 py-1 rounded border" onClick={() => setBack(null)}>
                    削除
                  </button>
                )}
              </div>
              {backURL && <div className="mt-2"><img src={backURL} alt="back preview" className="max-h-40 rounded border" /></div>}
            </div>
          )}

          {/* セルフィー */}
          <div>
            <label className="block mb-1 font-medium">セルフィー（顔写真）</label>
            <div className="flex items-center gap-3">
              <Input type="file" accept="image/*" capture="user" onChange={(e) => setSelfie(e.target.files?.[0] ?? null)} />
              {selfie && (
                <button type="button" className="text-sm px-3 py-1 rounded border" onClick={() => setSelfie(null)}>
                  削除
                </button>
              )}
            </div>
            {selfieURL && <div className="mt-2"><img src={selfieURL} alt="selfie preview" className="max-h-40 rounded border" /></div>}
            <p className="text-xs text-gray-500 mt-1">眼鏡やマスクは外し、明るい場所で撮影してください。</p>
          </div>

          {/* 住所一致チェック */}
          <div className="flex items-start gap-2">
            <input id="addr" type="checkbox" className="mt-1" checked={addrConfirmed} onChange={(e) => setAddrConfirmed(e.target.checked)} />
            <label htmlFor="addr" className="text-sm text-gray-700">住所が本人確認書類と一致していることを確認しました</label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 justify-end">
            <Button type="button" onClick={() => router.back()}>戻る</Button>
            <Button type="button" disabled={!ready || submitting} onClick={handleNext}>
              {submitting ? "確認中..." : "次へ（資産/配分へ）"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
