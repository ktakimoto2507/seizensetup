"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
const Stepper = dynamic(
  () => import("@/components/stepper").then((m) => ({ default: m.Stepper })),
  { ssr: false }
);
import { useAppStore } from "@/lib/store";

export default function Home() {
  const step = useAppStore((s) => s.step);

  // 続きから再開ボタン（現在のステップに応じたページへ）
  const resumePath =
    step === 0 ? "/onboarding" :
    step === 1 ? "/kyc" :
    step === 2 ? "/assets" :
    "/review";

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="text-center space-y-4 max-w-md">
        <Stepper />
        <h1 className="text-2xl font-bold">ホーム</h1>
        <p>現在のステップ：{step + 1} / 4</p>

        <div className="flex flex-wrap gap-2 justify-center">
          <Button asChild><Link href="/onboarding">はじめる</Link></Button>
          <Button asChild><Link href={resumePath}>続きから</Link></Button>

          {step < 3 ? (
            <Button disabled title="送信（ダミー）まで完了すると有効になります">途中確認</Button>
          ) : (
            <Button asChild><Link href="/review">途中確認</Link></Button>
          )}

          <Button asChild><Link href="/data">データ管理</Link></Button>
        </div>
      </div>
    </div>
  );
}
