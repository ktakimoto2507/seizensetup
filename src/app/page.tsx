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
        <section className="rounded-2xl bg-white shadow-lg ring-1 ring-emerald-100 overflow-hidden">
          <div className="bg-emerald-600 text-white px-6 py-4">
            <h1 className="text-xl font-bold">入口</h1>
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
                desc="電話番号をIDとして登録。パスワードも設定します。"
                variant="outline"
              />
              <Card
                href="/auth/login"
                title="登録済の方はこちら（ログイン）"
                desc="電話番号（ID）とパスワードでログインします。"
                variant="solid"
              />
            </div>
          </div>
        </section>

        <div className="text-center text-xs text-gray-500 mt-3">
          登録やログインでお困りの場合は管理者にお問い合わせください。
        </div>
      </div>
    </main>
  );
}
