"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui";
// Stepperは不要（任意）。出すならSSR無効のdynamicで。

export default function SuccessPage() {
  const resetAll = useAppStore((s) => s.resetAll);
  const setStep = useAppStore((s) => s.setStep);

  // 初回マウント時に “完全初期化”
  useEffect(() => {
    resetAll();     // すべての入力を初期状態に
    setStep(0);     // ホームの状態も初期へ
  }, [resetAll, setStep]);

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-bold">送信が完了しました</h1>
        <p className="text-gray-700">内容を受け付けました。ホームに戻るか、新しく登録を始めることができます。</p>
        <div className="flex gap-2 justify-center">
          <Button asChild><Link href="/">ホームへ</Link></Button>
          <Button asChild><Link href="/onboarding">新しく始める</Link></Button>
        </div>
      </div>
    </div>
  );
}
