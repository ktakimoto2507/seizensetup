"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppStore, Beneficiary } from "@/lib/store";
import { lookupZip } from "@/lib/zipcloud";
import { Stepper } from "@/components/stepper";
import { Button, Card, CardHeader, CardContent, Input } from "@/components/ui";
import { useRouter } from "next/navigation";

/** 受益者配分：一人を動かしたら他を比率で自動調整し合計100%維持 */
function adjustPercents(items: Beneficiary[], changedId: string, newValue: number): Beneficiary[] {
  const clamped = Math.max(0, Math.min(100, Math.round(newValue)));
  const idx = items.findIndex((b) => b.id === changedId);
  if (idx < 0) return items;
  const others = items.filter((_, i) => i !== idx);
  const remaining = 100 - clamped;
  const sumOthers = others.reduce((s, b) => s + b.percent, 0) || 1;
  const adjustedOthers = others.map((b) => ({ ...b, percent: Math.round((b.percent / sumOthers) * remaining) }));
  // 丸め誤差の修正
  const diff = 100 - (clamped + adjustedOthers.reduce((s, b) => s + b.percent, 0));
  if (adjustedOthers.length > 0) adjustedOthers[0].percent += diff;
  const result: Beneficiary[] = [];
  let j = 0;
  for (let i = 0; i < items.length; i++) {
    if (i === idx) result.push({ ...items[i], percent: clamped });
    else result.push(adjustedOthers[j++]);
  }
  return result;
}

export default function AssetsPage() {
  const router = useRouter();
  const { address, beneficiaries, setAddress, setBeneficiaries, setStep } = useAppStore();

  const [zipLoading, setZipLoading] = useState(false);
  const [zipErr, setZipErr] = useState<string>("");

  useEffect(() => { setStep(2); }, [setStep]);

  const total = useMemo(() => beneficiaries.reduce((s, b) => s + b.percent, 0), [beneficiaries]);
  const totalOk = total === 100;

  const handleZipBlur = async () => {
    const z = address.postalCode.replace(/\D/g, "");
    if (z.length !== 7) return;
    setZipLoading(true); setZipErr("");
    try {
      const r = await lookupZip(z);
      if (!r) { setZipErr("郵便番号に該当する住所が見つかりません"); }
      else {
        setAddress({
          postalCode: r.zipcode,
          prefecture: r.address1,
          city: r.address2,
          town: r.address3,
        });
      }
    } catch {
      setZipErr("住所補完に失敗しました");
    } finally {
      setZipLoading(false);
    }
  };

  const goNext = () => {
    if (!totalOk) return alert("受益者の合計が100%になるよう調整してください");
    setStep(3);
    router.push("/review");
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <Stepper />

      <Card>
        <CardHeader>住所情報</CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-1">
              <label className="block mb-1 font-medium">郵便番号（7桁・ハイフン不要可）</label>
              <Input
                value={address.postalCode}
                inputMode="numeric"
                placeholder="1000001"
                onChange={(e) => setAddress({ postalCode: e.target.value })}
                onBlur={handleZipBlur}
              />
              {zipLoading && <p className="text-xs text-gray-500 mt-1">住所を検索中...</p>}
              {zipErr && <p className="text-xs text-red-600 mt-1">{zipErr}</p>}
            </div>
            <div>
              <label className="block mb-1 font-medium">都道府県</label>
              <Input value={address.prefecture} onChange={(e) => setAddress({ prefecture: e.target.value })} />
            </div>
            <div>
              <label className="block mb-1 font-medium">市区町村</label>
              <Input value={address.city} onChange={(e) => setAddress({ city: e.target.value })} />
            </div>
            <div>
              <label className="block mb-1 font-medium">町名</label>
              <Input value={address.town} onChange={(e) => setAddress({ town: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="block mb-1 font-medium">番地・建物</label>
              <Input value={address.line1} onChange={(e) => setAddress({ line1: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>受益者配分（合計 {total}%）</CardHeader>
        <CardContent>
          <div className={`text-sm mb-2 ${totalOk ? "text-green-700" : "text-red-700"}`}>
            {totalOk ? "合計は100%です" : "合計が100%になるよう調整してください"}
          </div>

          <div className="space-y-4">
            {beneficiaries.map((b) => (
              <div key={b.id}>
                <div className="flex items-center justify-between mb-1">
                  <input
                    className="border rounded px-2 py-1 mr-2 w-40"
                    value={b.name}
                    onChange={(e) =>
                      setBeneficiaries(beneficiaries.map((x) => (x.id === b.id ? { ...x, name: e.target.value } : x)))
                    }
                    placeholder="受益者名"
                  />
                  <span className="text-sm text-gray-600">{b.percent}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={b.percent}
                  onChange={(e) => {
                    const nv = Number(e.target.value);
                    setBeneficiaries(adjustPercents(beneficiaries, b.id, nv));
                  }}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        <Button onClick={() => router.back()} type="button">戻る</Button>
        <Button onClick={goNext} type="button">確認へ進む</Button>
      </div>
    </div>
  );
}
