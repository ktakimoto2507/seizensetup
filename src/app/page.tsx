"use client";

import { useEffect, useState } from "react";

type Session = { phone: string; loggedInAt: string } | null;

const Card = ({ href, title, desc }: { href: string; title: string; desc: string }) => (
  <a href={href} className="rounded-2xl border bg-white p-6 shadow-sm transition hover:shadow">
    <h3 className="text-lg font-semibold">{title}</h3>
    <p className="mt-1 text-sm text-gray-600">{desc}</p>
  </a>
);

export default function EntryPage() {
  const [session, setSession] = useState<Session>(null);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("ss_session");
      setSession(raw ? (JSON.parse(raw) as Session) : null);
    } catch { setSession(null); }

    try {
      const raw = window.localStorage.getItem("ss_onboarded");
      let ob = false;
      if (raw === "1") ob = true;
      else if (raw) {
        const parsed = JSON.parse(raw);
        ob = parsed === true || parsed === "1";
      }
      setOnboarded(ob);
    } catch { setOnboarded(false); }
  }, []);

  return (
    <main className="grid gap-6">
      <section className="rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold">入口</h1>
        <p className="mt-1 text-sm text-gray-600">
          初回登録（seizensetup）またはログインから開始してください。
        </p>
        {session ? (
          <p className="mt-2 text-sm">
            現在ログイン中：<b>{session.phone}</b> ／{" "}
            <a className="text-blue-600 underline" href="/home">ホームへ移動</a>
          </p>
        ) : onboarded ? (
          <p className="mt-2 text-sm">
            初回登録は完了しています。<a className="text-blue-600 underline" href="/auth/login">ログイン</a>してください。
          </p>
        ) : null}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card href="/onboarding" title="初回登録はこちら" desc="電話番号をIDとして登録。パスワードも設定します。" />
        <Card href="/auth/login" title="登録済の方はこちら（ログイン）" desc="電話番号（ID）とパスワードでログインします。" />
      </section>
    </main>
  );
}
