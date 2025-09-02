"use client";

import { useAppStore } from "@/lib/store";
import { Stepper } from "@/components/stepper";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";

export default function KycPage() {
  const router = useRouter();
  const setStep = useAppStore((s) => s.setStep);

  const handleNext = async () => {
    // 本来はeKYC SDKの結果を待って判定
    setStep(2);
    router.push("/assets");
  };

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="max-w-md w-full">
        <Stepper />
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">本人確認（KYC）</h1>
          <p className="text-gray-700">ここに本人確認の手続きを実装します（ダミー）。</p>
          <Button className="w-full" onClick={handleNext}>本人確認を完了（ダミー）</Button>
        </div>
      </div>
    </div>
  );
}
