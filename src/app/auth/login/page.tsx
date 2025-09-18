"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") ?? "/home"; // 成功時の遷移先（必要なら変更）

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [alreadySignedIn, setAlreadySignedIn] = useState(false);

  useEffect(() => {
    setMounted(true);
    // すでにサインイン済みかだけを表示用にチェック（自動遷移はしない）
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAlreadySignedIn(!!session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setAlreadySignedIn(!!s);
    });
    return () => subscription.unsubscribe();
  }, []);

  const isDisabled = !mounted || !email || !password || submitting;

  const login = async () => {
    setErr(null);
    setMsg(null);
    setSubmitting(true);
    try {
      const emailNorm = email.trim().toLowerCase();
      const { error } = await supabase.auth.signInWithPassword({
        email: emailNorm,
        password,
      });
      if (error) {
        setErr(error.message || "ログインに失敗しました");
        return;
      }
      // 成功時のみ遷移
      router.replace(next);
    } catch (e: any) {
      setErr(e?.message ?? "接続に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const goSignup = () => {
    // あなたのフローでは Onboarding がサインアップの入口
    router.push("/onboarding");
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-emerald-50/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* カード */}
        <div className="rounded-2xl bg-white shadow-lg ring-1 ring-emerald-100 overflow-hidden">
          {/* ヘッダー */}
          <div className="bg-emerald-600 text-white px-6 py-4">
            <h1 className="text-xl font-bold">ログイン</h1>
            {alreadySignedIn && (
              <p className="mt-1 text-emerald-100 text-sm">
                すでにログイン済みです（自動遷移はしません）。{" "}
                <Link href="/home" className="underline font-semibold">
                  HOMEへ移動
                </Link>
              </p>
            )}
          </div>

          {/* 本文 */}
          <div className="px-6 py-6 space-y-4">
            {err && (
              <div
                className="rounded-xl bg-red-50 text-red-700 px-4 py-2 text-sm"
                role="alert"
                aria-live="polite"
              >
                {err}
              </div>
            )}
            {msg && (
              <div className="rounded-xl bg-emerald-50 text-emerald-700 px-4 py-2 text-sm">
                {msg}
              </div>
            )}

            <label className="block text-sm font-medium text-gray-700">
              メールアドレス
              <input
                className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="example@mail.com"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              パスワード
              <input
                className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-400"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <div className="flex gap-3 pt-2">
              <button
                className="flex-1 rounded-2xl bg-emerald-600 px-4 py-2 text-white font-medium disabled:opacity-60 hover:bg-emerald-700 transition"
                onClick={login}
                disabled={isDisabled}
              >
                {submitting ? "サインイン中…" : "ログイン"}
              </button>
              <button
                className="flex-1 rounded-2xl border border-emerald-600 px-4 py-2 text-emerald-700 font-medium hover:bg-emerald-50 transition"
                onClick={goSignup}
                type="button"
              >
                新規登録
              </button>
            </div>

            <div className="pt-2 text-sm">
              <Link href="/" className="text-emerald-700 underline">
                HOME
              </Link>
            </div>
          </div>
        </div>

        {/* フッター補助リンク（任意） */}
        <div className="text-center text-xs text-gray-500 mt-3">
          パスワードをお忘れの場合は管理者へお問い合わせください。
        </div>
      </div>
    </main>
  );
}
