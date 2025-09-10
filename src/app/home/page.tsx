"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Session = { phone: string; loggedInAt: string };
type Profile = { fullName?: string; birthday?: string; email?: string; address?: string; note?: string };
type TestResult = { id: "ex00"|"deus00"|"machina00"; startedAt: string; finishedAt: string; score: number; detail?: Record<string, any>; };

const PHONE_11 = /^\d{11}$/;
const PW_RULE  = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;

function loadJSON<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try { const v = window.localStorage.getItem(key); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}
function saveJSON<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}
function removeKey(key: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}

export default function HomeDashboard() {
  const router = useRouter();

  const [hydrated, setHydrated] = useState(false);
  const [sessionPhone, setSessionPhone] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");

  const [phoneEdit, setPhoneEdit] = useState("");
  const [pwEdit, setPwEdit] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [results, setResultsState] = useState<TestResult[]>([]);
  const recent = useMemo(() => results.slice(-5).reverse(), [results]);

  const todayStr = useMemo(() => {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  useEffect(() => {
    const s = loadJSON<Session>("ss_session");
    if (s?.phone) {
      setSessionPhone(s.phone);
      setPhoneEdit(s.phone);
    }
    const p = loadJSON<Profile>("ss_profile");
    if (p) {
      setFullName(p.fullName ?? "");
      setBirthday(p.birthday ?? "");
      setEmail(p.email ?? "");
      setAddress(p.address ?? "");
      setNote(p.note ?? "");
    }
    setResultsState(loadJSON<TestResult[]>("ss_results") ?? []);
    setHydrated(true);
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null);

    if (birthday && (birthday < "1900-01-01" || birthday > todayStr)) {
      setErr("誕生日は1900-01-01〜今日の範囲で入力してください。"); return;
    }

    const acc = loadJSON<{phone:string;passwordHash:string;createdAt:string;updatedAt?:string}>("ss_account");
    if (acc) {
      let changed = false;
      let nextPhone = acc.phone;
      let nextHash = acc.passwordHash;

      const phoneDigits = phoneEdit.replace(/\D/g, "").slice(0, 11);
      if (phoneDigits && phoneDigits !== acc.phone) {
        if (!PHONE_11.test(phoneDigits)) { setErr("電話番号は11桁で入力してください。"); return; }
        nextPhone = phoneDigits; changed = true;
      }
      if (pwEdit) {
        if (!PW_RULE.test(pwEdit)) { setErr("パスワードは8文字以上で英数字を含めてください。"); return; }
        // 簡易: 平文保存は非推奨だが PoCでは未使用（Onboarding でハッシュ化想定）
        // ここでは既存の passwordHash を温存。実際の更新は後日 auth.tsに統一して実装でもOK。
        // nextHash = (await hashPassword(pwEdit)); // 追って導入可能
        changed = true;
      }
      if (changed) {
        saveJSON("ss_account", { phone: nextPhone, passwordHash: nextHash, createdAt: acc.createdAt, updatedAt: new Date().toISOString() });
        const s = loadJSON<Session>("ss_session");
        if (s) saveJSON("ss_session", { ...s, phone: nextPhone });
        setSessionPhone(nextPhone);
      }
    }

    setSaving(true);
    saveJSON<Profile>("ss_profile", { fullName, birthday, email, address, note });
    setSaving(false);
    setMsg("保存しました"); setPwEdit("");
    setTimeout(() => setMsg(null), 1500);
  }

  function handleLogout() {
    removeKey("ss_session");
    router.push("/");
  }

  if (!hydrated) return <main className="p-6"><p className="text-sm text-gray-500">読み込み中…</p></main>;
  if (!sessionPhone) {
    return (
      <main className="max-w-lg mx-auto p-6">
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-semibold mb-2">ログインが必要です</h2>
          <p className="text-sm text-gray-600">先にログインしてください。</p>
          <a className="mt-4 inline-block rounded-xl bg-black px-4 py-2 text-white" href="/auth/login">ログインへ</a>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">HOME（ダッシュボード）</h1>
        <div className="text-sm text-gray-600">ログイン中: <b>{sessionPhone}</b></div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左：プロフィール編集 */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-lg font-semibold mb-4">プロフィールの確認・編集</h2>
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">氏名</label>
                <input className="w-full rounded border px-3 py-2" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="山田 太郎" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">誕生日</label>
                <input className="w-full rounded border px-3 py-2" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} min="1900-01-01" max={todayStr} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">メール</label>
                <input className="w-full rounded border px-3 py-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="taro@example.com" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">住所</label>
                <input className="w-full rounded border px-3 py-2" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="東京都…" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">メモ</label>
                <input className="w-full rounded border px-3 py-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="任意メモ" />
              </div>

              <div className="md:col-span-2 border-t pt-4 mt-2">
                <h3 className="text-sm font-medium mb-2">アカウント（電話・パスワード）</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">電話番号（11桁）</label>
                    <input
                      className="w-full rounded border px-3 py-2"
                      inputMode="numeric"
                      maxLength={11}
                      value={phoneEdit}
                      onChange={(e) => setPhoneEdit(e.target.value.replace(/\D/g, "").slice(0, 11))}
                      placeholder="090xxxxxxxx"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">パスワード（変更時のみ）</label>
                    <input
                      className="w-full rounded border px-3 py-2"
                      type="password"
                      value={pwEdit}
                      onChange={(e) => setPwEdit(e.target.value)}
                      placeholder="変更しない場合は空"
                    />
                    <p className="text-xs text-gray-500 mt-1">※ 8文字以上・英数字を含めてください</p>
                  </div>
                </div>
              </div>

              {err && <p className="md:col-span-2 text-sm text-red-600">{err}</p>}
              {msg && <p className="md:col-span-2 text-sm text-green-700">{msg}</p>}

              <div className="md:col-span-2 flex items-center gap-3">
                <button className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-60" disabled={saving} type="submit">
                  {saving ? "保存中…" : "保存する"}
                </button>
                <button className="rounded-xl border px-4 py-2 hover:bg-gray-50" type="button" onClick={handleLogout}>ログアウト</button>
              </div>
            </form>
          </div>
        </div>

        {/* 右：アプリ & 最近の結果 */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-lg font-semibold mb-3">アプリ</h2>
            <div className="grid grid-cols-1 gap-3">
              <a href="/apps/ex00" className="rounded-xl border px-4 py-3 text-center hover:bg-gray-50">ex00：記憶チェック</a>
              <a href="/apps/deus00" className="rounded-xl border px-4 py-3 text-center hover:bg-gray-50">deus00：タイピング</a>
              <a href="/apps/machina00" className="rounded-xl border px-4 py-3 text-center hover:bg-gray-50">machina00：座標あて</a>
            </div>
            <p className="text-xs text-gray-500 mt-3">※ `/apps` はナビ非表示。ここからのみアクセス可能。</p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-lg font-semibold mb-3">最近の結果（最新5件）</h2>
            {recent.length ? (
              <div className="space-y-2">
                {recent.map((r, i) => (
                  <div key={i} className="text-sm py-1 border-b last:border-0">
                    <div><b>{r.id}</b>：{r.score} 点</div>
                    <div className="text-gray-500">{new Date(r.finishedAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">まだ結果はありません。</p>
            )}
          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-lg font-semibold mb-3">クイックリンク</h2>
            <div className="space-y-2 text-sm">
              <a className="text-blue-600 underline" href="/">入口（HOME）</a><br />
              <a className="text-blue-600 underline" href="/onboarding">初回登録</a><br />
              <a className="text-blue-600 underline" href="/auth/login">ログイン</a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
