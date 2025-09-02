"use client";

import Link from "next/link";
import { Button } from "@/components/ui";

export default function Home() {
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">ホーム</h1>
        <p>UIコンポーネントの動作確認をします。</p>

        {/* 通常のボタン */}
        <Button onClick={() => alert("クリック！")}>クリック</Button>

        {/* Link をボタン化（asChild） */}
        <div>
          <Button asChild>
            <Link href="/onboarding">オンボーディングへ</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
