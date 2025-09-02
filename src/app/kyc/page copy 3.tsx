"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Stepper } from "@/components/stepper";
import { Button, Card, CardHeader, CardContent, Input } from "@/components/ui";
import { useAppStore } from "@/lib/store";

type DocType = "driver" | "myNumber" | "passport";

function filePreview(file?: File | null) {
  return file ? URL.createObjectURL(file) : "";
}

export default function KycPage() {
  const router = useRouter();
  const setStep = useAppStore((s) => s.setStep);

  const [docType, setDocType] = useState<DocType>("driver");
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [addrConfirmed, setAddrConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // このページに来たらステップ=1
  useEffect(() => setStep(1), [setStep]);

  const ready = useMemo(() => {
    // パスポートの場合は裏面不要にするなど、要件で分岐可能
    const backNeeded = docType !== "passport";
    const hasAll = !!front && (!!back || !backNeeded) && !!selfie && addrConfirmed;
    return hasAll;
  }, [docType, front, back, selfie, addrConfirmed]);

  const progress = useMemo(() => {
    let n = 0;
    if (front) n += 25;
    // パスポートは裏面不要
    if (docType !== "passport") {
      if (back) n += 25;
    } else {
      n += 25; // みなし
    }
    if (selfie) n += 25;
    if (addrConfirmed) n += 25;
    return n;
  }, [docType, front, back, selfie, addrConfirmed]);

  async function handleNext() {
    if (!ready) return;
    setSubmitting(true);

    // 実装ポイント：
    // ここで実際は eKYC SDK / API へ画像を送信し、OCR/顔照合/本人一致を行います。
    // ひとまずモックとして待機 → OK として次のステップへ。
    await new Promise((r) => setTimeout(r, 700));

    setStep(2);
    router.push("/assets");
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
              <div
                className="h-2 bg-green-600"
                style={{ width: `${progress}%`, transition: "width .2s ease" }}
              />
            </div>
          </div>

          {/* 書類の種類 */}
          <div>
            <label className="block mb-1 font-medium">提出する書類</label>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <button
                type="button"
                onClick={() => setDocType("driver")}
                className={`border rounded px-3 py-2 ${docType === "driver" ? "border-green-600" : "border-gray-300"}`}
              >
                運転免許証
              </button>
              <button
                type="button"
                onClick={() => setDocType("myNumber")}
                className={`border rounded px-3 py-2 ${docType === "myNumber" ? "border-green-600" : "border-gray-300"}`}
              >
                マイナンバーカード
              </button>
              <button
                type="button"
                onClick={() => setDocType("passport")}
                className={`border rounded px-3 py-2 ${docType === "passport" ? "border-green-600" : "border-gray-300"}`}
              >
                パスポート
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              パスポートの場合は「裏面」は不要です。
            </p>
          </div>

          {/* 画像アップロード：表 */}
          <div>
            <label className="block mb-1 font-medium">書類（表面）</label>
            <div className="flex items-center gap-3">
              <Input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setFront(e.target.files?.[0] ?? null)}
              />
              {front && (
                <button
                  type="button"
                  className="text-sm px-3 py-1 rounded border"
                  onClick={() => setFront(null)}
                >
                  削除
                </button>
              )}
            </div>
            {front && (
              <div className="mt-2">
                <img src={filePreview(front)} alt="front preview" className="max-h-40 rounded border" />
              </div>
            )}
          </div>

          {/* 画像アップロード：裏（パスポートは不要） */}
          {docType !== "passport" && (
            <div>
              <label className="block mb-1 font-medium">書類（裏面）</label>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setBack(e.target.files?.[0] ?? null)}
                />
                {back && (
                  <button
                    type="button"
                    className="text-sm px-3 py-1 rounded border"
                    onClick={() => setBack(null)}
                  >
                    削除
                  </button>
                )}
              </div>
              {back && (
                <div className="mt-2">
                  <img src={filePreview(back)} alt="back preview" className="max-h-40 rounded border" />
                </div>
              )}
            </div>
          )}

          {/* セルフィー */}
          <div>
            <label className="block mb-1 font-medium">セルフィー（顔写真）</label>
            <div className="flex items-center gap-3">
              <Input
                type="file"
                accept="image/*"
                capture="user"
                onChange={(e) => setSelfie(e.target.files?.[0] ?? null)}
              />
              {selfie && (
                <button
                  type="button"
                  className="text-sm px-3 py-1 rounded border"
                  onClick={() => setSelfie(null)}
                >
                  削除
                </button>
              )}
            </div>
            {selfie && (
              <div className="mt-2">
                <img src={filePreview(selfie)} alt="selfie preview" className="max-h-40 rounded border" />
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              眼鏡やマスクは外し、明るい場所で撮影してください。
            </p>
          </div>

          {/* 住所確認 */}
          <div className="flex items-start gap-2">
            <input
              id="addr"
              type="checkbox"
              className="mt-1"
              checked={addrConfirmed}
              onChange={(e) => setAddrConfirmed(e.target.checked)}
            />
            <label htmlFor="addr" className="text-sm text-gray-700">
              住所が本人確認書類と一致していることを確認しました
            </label>
          </div>

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
