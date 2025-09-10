"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { hashPassword } from "@/lib/auth"; // ★ パスワード変更時に使用

type Session = { phone: string; loggedInAt: string };
type Profile = {
  fullName?: string;
  birthday?: string; // YYYY-MM-DD
  email?: string;
  address?: string;
  note?: string;
};
type Account = { phone: string; passwordHash: string; createdAt?: string; updatedAt?: string };

type TestResult = {
  id: "ex00" | "deus00" | "machina00";
  startedAt: string;
  finishedAt: string;
  score: number;
  detail?: Record<string, any>;
};

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

  // セッション
  const [hydrated, setHydrated] = useState(false);
  const [sessionPhone, setSessionPhone] = useState<string | null>(null);

  // プロフィール
  const [fullName, setFullName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");

  // アカウント編集値（電話・新パスワード）
  const [phoneEdit, setPhoneEdit] = useState("");
  const [pwEdit, setPwEdit] = useState("");

  // 編集モード
  const [editMode, setEditMode] = useState(false);
  const snapshotRef = useRef<Profile | null>(null);

  // メッセージ
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // 結果
  const [results, setResults] = useState<TestResult[]>([]);
  const recent = useMemo(() => results.slice(-5).reverse(), [results]);

  const todayStr = useMemo(() => {
    const t = new Date(); const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  useEffect(() => {
    // セッション
    const s = loadJSON<Session>("ss_session");
    if (s?.phone) setSessionPhone(s.phone);

    // プロフィール
    const p = loadJSON<Profile>("ss_profile");
    if (p) {
      setFullName(p.fullName ?? "");
      setBirthday(p.birthday ?? "");
      setEmail(p.email ?? "");
      setAddress(p.address ?? "");
      setNote(p.note ?? "");
      snapshotRef.current = p;
    } else {
      snapshotRef.current = { fullName: "", birthday: "", email: "", address: "", note: "" };
    }

    // アカウント（電話は初期表示、パスワードはセキュリティ上 “空”）
    const a = loadJSON<Account>("ss_account");
    if (a?.phone) setPhoneEdit(a.phone);
    else if (s?.phone) setPhoneEdit(s.phone); // フォールバック

    // 結果
    setResults(loadJSON<TestResult[]>("ss_results") ?? []);

    setHydrated(true);
  }, []);

  function enterEdit() {
    snapshotRef.current = { fullName, birthday, email, address, note };
    setEditMode(true);
  }
  function cancelEdit() {
    const snap = snapshotRef.current;
    if (snap) {
      setFullName(snap.fullName ?? "");
      setBirthday(snap.birthday ?? "");
      setEmail(snap.email ?? "");
      setAddress(snap.address ?? "");
      setNote(snap.note ?? "");
    }
    // アカウントは保存済みの値に戻す
    const a = loadJSON<Account>("ss_account");
    setPhoneEdit(a?.phone ?? sessionPhone ?? "");
    setPwEdit("");
    setErr(null); setMsg(null);
    setEditMode(false);
  }

  async function saveAll(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null);

    // バリデーション
    if (birthday && (birthday < "1900-01-01" || birthday > todayStr)) {
      setErr("誕生日は1900-01-01〜今日の範囲で入力してください。"); return;
    }
    const phoneDigits = phoneEdit.replace(/\D/g, "").slice(0, 11);
    if (!PHONE_11.test(phoneDigits)) { setErr("電話番号は11桁で入力してください。"); return; }
    if (pwEdit && !PW_RULE.test(pwEdit)) { setErr("パスワードは8文字以上で英数字を含めてください。"); return; }

    // プロフィール保存
    const profile: Profile = { fullName, birthday, email, address, note };
    saveJSON("ss_profile", profile);

    // アカウント保存（電話変更・パスワード変更に対応）
    const accOld = loadJSON<Account>("ss_account");
    let nextAcc: Account;
    if (accOld) {
      nextAcc = { ...accOld, phone: phoneDigits };
    } else {
      nextAcc = { phone: phoneDigits, passwordHash: "", createdAt: new Date().toISOString() };
    }
    if (pwEdit) {
      nextAcc.passwordHash = await hashPassword(pwEdit); // ★ 新パスワードのみハッシュ化保存
    }
    nextAcc.updatedAt = new Date().toISOString();
    saveJSON("ss_account", nextAcc);

    // セッションの電話も同期
    const s = loadJSON<Session>("ss_session");
    if (s) {
      const sNext = { ...s, phone: phoneDigits };
      saveJSON("ss_session", sNext);
      setSessionPhone(sNext.phone);
    }

    setPwEdit(""); // 入力欄は必ず空に戻す（平文保持しない）
    setEditMode(false);
    setMsg("保存しました。");
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
        {/* 左：プロフィール＋アカウント（閲覧→編集） */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-white p-6 shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">プロフィールの確認・編集</h2>
              {!editMode ? (
                <button className="rounded-xl border px-3 py-1.5 hover:bg-gray-50" onClick={enterEdit}>編集する</button>
              ) : (
                <div className="flex gap-2">
                  <button className="rounded-xl border px-3 py-1.5 hover:bg-gray-50" type="button" onClick={cancelEdit}>キャンセル</button>
                  <button className="rounded-xl bg-black px-3 py-1.5 text-white" onClick={saveAll}>保存する</button>
                </div>
              )}
            </div>

            {msg && <p className="mb-3 text-sm text-green-700">{msg}</p>}
            {err && <p className="mb-3 text-sm text-red-600">{err}</p>}

            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={saveAll}>
              <div>
                <label className="block text-sm text-gray-600 mb-1">氏名</label>
                <input className="w-full rounded border px-3 py-2" value={fullName} onChange={(e)=>setFullName(e.target.value)} placeholder="山田 太郎" disabled={!editMode} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">誕生日</label>
                <input className="w-full rounded border px-3 py-2" type="date" value={birthday} onChange={(e)=>setBirthday(e.target.value)} min="1900-01-01" max={todayStr} disabled={!editMode} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">メール</label>
                <input className="w-full rounded border px-3 py-2" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="taro@example.com" disabled={!editMode} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">住所</label>
                <input className="w-full rounded border px-3 py-2" value={address} onChange={(e)=>setAddress(e.target.value)} placeholder="東京都…" disabled={!editMode} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">メモ</label>
                <input className="w-full rounded border px-3 py-2" value={note} onChange={(e)=>setNote(e.target.value)} placeholder="任意メモ" disabled={!editMode} />
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
                      onChange={(e)=>setPhoneEdit(e.target.value.replace(/\D/g,"").slice(0,11))}
                      placeholder="090xxxxxxxx"
                      disabled={!editMode}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">パスワード（変更時のみ）</label>
                    <input
                      className="w-full rounded border px-3 py-2"
                      type="password"
                      value={pwEdit}
                      onChange={(e)=>setPwEdit(e.target.value)}
                      placeholder="変更しない場合は空"
                      disabled={!editMode}
                    />
                    <p className="text-xs text-gray-500 mt-1">※ 8文字以上・英数字を含めてください。パスワードは表示しません。</p>
                  </div>
                </div>
              </div>

              {/* フッターボタン（モバイル用） */}
              <div className="md:col-span-2 flex items-center gap-3 mt-2">
                <button className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-60" disabled={!editMode} type="submit">保存する</button>
                {!editMode && <button className="rounded-xl border px-4 py-2 hover:bg-gray-50" type="button" onClick={enterEdit}>編集する</button>}
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
