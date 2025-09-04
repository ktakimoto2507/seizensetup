"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { Stepper } from "@/components/stepper";
import { useAppStore } from "@/lib/store";

export default function Home() {
  const step = useAppStore((s) => s.step);
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="text-center space-y-4 max-w-md">
        <Stepper />
        <h1 className="text-2xl font-bold">ホーム</h1>
        <p>現在のステップ：{step + 1} / 4</p>
        <div className="space-x-2">
          <Button asChild><Link href="/onboarding">はじめる</Link></Button>
          <Button asChild><Link href="/review">途中確認</Link></Button>
        </div>
      </div>
    </div>
  );
}
