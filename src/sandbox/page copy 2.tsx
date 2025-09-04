"use client";

import Link from "next/link";
import { Button } from "@/components/ui";

export default function Home() {
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">ホーム</h1>
        <p>初回登録を始めましょう。</p>
        <Button asChild>
          <Link href="/onboarding">オンボーディングへ</Link>
        </Button>
      </div>
    </div>
  );
}
