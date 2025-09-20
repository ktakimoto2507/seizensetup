"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Session = { phone: string; loggedInAt: string } | null;

const Card = ({
  href,
  title,
  desc,
  variant = "solid",
}: {
  href: string;
  title: string;
  desc: string;
  variant?: "solid" | "outline";
}) => {
  const base = "block w-full rounded-2xl px-4 py-3 font-medium transition text-center no-underline";
  const solid = "bg-emerald-600 text-white hover:bg-emerald-700";
  const outline = "border border-emerald-600 text-emerald-700 hover:bg-emerald-50";
  return (
    <Link href={href} className={`${base} ${variant === "solid" ? solid : outline}`}>
      <span className="block text-base">{title}</span>
      <span className="block mt-1 text-xs opacity-80">{desc}</span>
    </Link>
  );
};

export default function EntryPage() {
  const [session, setSession] = useState<Session>(null);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem("ss_session");
      setSession(raw ? (JSON.parse(raw) as Session) : null);
    } catch {
      setSession(null);
    }

    try {
      const raw = window.localStorage.getItem("ss_onboarded");
      let ob = false;
      if (raw === "1") ob = true;
      else if (raw) {
        const parsed = JSON.parse(raw);
        ob = parsed === true || parsed === "1";
      }
      setOnboarded(ob);
    } catch {
      setOnboarded(false);
    }
  }, []);

  return (
    <main className="min-h-screen bg-emerald-50/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
         {/* カードの“外”にWelcomeを表示（中央・緑） */}
          <h2 className="mb-3 text-center text-emerald-700 font-semibold">
            Welcome to SAFE LEGACY Solutions
          </h2>

          <section className="rounded-2xl bg-white shadow-lg ring-1 ring-emerald-100 overflow-hidden">
            <div className="bg-emerald-600 text-white px-6 py-4">
              {/* タイトルは機能名だけにしてバランス改善 */}
              <h1 className="text-xl font-bold">初回登録 / ログイン</h1>
              <p className="mt-1 text-emerald-100 text-sm">
                初回登録またはログインから開始してください。
              </p>
            </div>

          <div className="px-6 py-6 space-y-4 text-sm text-gray-700">
            {session && (
              <p>
                現在ログイン中：<b>{session.phone}</b> ／{" "}
                <Link href="/home" className="underline text-emerald-700 font-semibold">
                  ホームへ移動
                </Link>
              </p>
            )}

            <div className="space-y-3 pt-2">
              <Card
                href="/onboarding"
                title="初回登録はこちら"
                desc="メールアドレスをIDとして登録。パスワードも設定します。"
                variant="outline"
              />
              <Card
                href="/auth/login"
                title="登録済の方はこちら（ログイン）"
                desc="メールアドレス（ID）とパスワードでログインします。"
                variant="solid"
              />
            </div>
          </div>
        </section>

        <div className="text-center text-xs text-gray-500 mt-3">
          登録やログインでお困りの場合は管理者にお問い合わせください。
        </div>

        {/* フッター：問い合わせ先 */}
        <div className="text-center text-xs text-gray-500 mt-3 flex flex-col items-center gap-2">
          <div className="flex items-center gap-1">
            {/* メールアイコン */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 2v.01L12 13 4 6.01V6h16ZM4 18V8.236l7.386 6.405a1 1 0 0 0 1.228 0L20 8.236V18H4Z" />
            </svg>
            <span>xxxxxtestxxxxx@outlook.com</span>
          </div>

          <div className="flex items-center gap-1">
            {/* 電話アイコン */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.11.37 2.31.57 3.58.57a1 1 0 0 1 1 1V21a1 1 0 0 1-1 1C10.85 22 2 13.15 2 2a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.27.2 2.47.57 3.58a1 1 0 0 1-.24 1.01l-2.2 2.2Z" />
            </svg>
            <span>只今電話受付を停止中（メールにてお問合せください）</span>
          </div>
        </div>

      </div>
    </main>
  );
}
