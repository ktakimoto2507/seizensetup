"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { hashPassword } from "@/lib/auth";

// ========== Types ==========
type Session = { phone: string; loggedInAt: string };
type Profile = {
  fullName?: string;
  birthday?: string; // YYYY-MM-DD
  email?: string;
  address?: string;
  // note?: string; // ← UIからは削除
};
type Account = { phone: string; passwordHash: string; createdAt?: string; updatedAt?: string };
type TestResult = {
  id: "ex00" | "deus00" | "machina00";
  startedAt: string;
  finishedAt: string;
  score: number;
  detail?: Record<string, any>;
};

// ========== Helpers ==========
const PHONE_11 = /^\d{11}$/;
const PW_RULE = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
const NO_CHANGE_MASK = "********"; // ← これが入っていたら「パスワード変更なし」

function loadJSON<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}
function saveJSON<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}
function removeKey(key: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}

// ========== Component ==========
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

  // アカウント編集値（電話・新パスワード）
  const [phoneEdit, setPhoneEdit] = useState("");
  const [pwEdit, setPwEdit] = useState(NO_CHANGE_MASK); // 既定は「変更なし」

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
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  useEffect(() => {
    // セッション
    const s = loadJSON<Session>("ss_session");
    if (s?.phone) setSessionPhone(s.phone);

    // プロフィール（旧構造の連結にも対応）
    const p = loadJSON<Profile & Record<string, string | undefined>>("ss_profile");
    if (p) {
      setFullName(p.fullName ?? "");
      setBirthday(p.birthday ?? "");
      setEmail(p.email ?? "");
      // address がなければ、旧データの分割項目を連結してみる
      const joined =
        p.address ??
        [p.prefecture, p.city, p.town, p.street, p.building].filter(Boolean).join("") ;
      setAddress(joined);
      snapshotRef.current = { fullName: p.fullName, birthday: p.birthday, email: p.email, address: joined };
    } else {
      snapshotRef.current = { fullName: "", birthday: "", email: "", address: "" };
    }

    // アカウント（電話は初期表示、パスワードはセキュリティ上 “********”）
    const a = loadJSON<Account>("ss_account");
    if (a?.phone) setPhoneEdit(a.phone);
    else if (s?.phone) setPhoneEdit(s.phone);

    // 結果
    setResults(loadJSON<TestResult[]>("ss_results") ?? []);

    setHydrated(true);
  }, []);

  function enterEdit() {
    snapshotRef.current = { fullName, birthday, email, address };
    setPwEdit(NO_CHANGE_MASK); // 編集開始時にマスクを入れておく
    setEditMode(true);
  }
  function cancelEdit() {
    const snap = snapshotRef.current;
    if (snap) {
      setFullName(snap.fullName ?? "");
      setBirthday(snap.birthday ?? "");
      setEmail(snap.email ?? "");
      setAddress(snap.address ?? "");
    }
    // アカウントは保存済みの値に戻す
    const a = loadJSON<Account>("ss_account");
    setPhoneEdit(a?.phone ?? sessionPhone ?? "");
    setPwEdit(NO_CHANGE_MASK);
    setErr(null);
    setMsg(null);
    setEditMode(false);
  }

  async function saveAll(e?: React.FormEvent) {
    e?.preventDefault();
    setErr(null);
    setMsg(null);

    // バリデーション
    if (birthday && (birthday < "1900-01-01" || birthday > todayStr)) {
      setErr("誕生日は1900-01-01〜今日の範囲で入力してください。");
      return;
    }
    const phoneDigits = phoneEdit.replace(/\D/g, "").slice(0, 11);
    if (!PHONE_11.test(phoneDigits)) {
      setErr("電話番号は11桁で入力してください。");
      return;
    }
    if (pwEdit !== NO_CHANGE_MASK && pwEdit && !PW_RULE.test(pwEdit)) {
      setErr("パスワードは8文字以上で英数字を含めてください。");
      return;
    }

    // プロフィール保存
    const profile: Profile = { fullName, birthday, email, address };
    saveJSON("ss_profile", profile);

    // アカウント保存（電話変更・パスワード変更に対応）
    const accOld = loadJSON<Account>("ss_account");
    let nextAcc: Account = accOld
      ? { ...accOld, phone: phoneDigits }
      : { phone: phoneDigits, passwordHash: "", createdAt: new Date().toISOString() };

    if (pwEdit !== NO_CHANGE_MASK && pwEdit) {
      nextAcc.passwordHash = await hashPassword(pwEdit);
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

    setPwEdit(NO_CHANGE_MASK);
    setEditMode(false);
    setMsg("保存しました。");
    setTimeout(() => setMsg(null), 1500);
  }

  function handleLogout() {
    removeKey("ss_session");
    router.push("/");
  }

  if (!hydrated) {
    return (
      <main className="p-6">
        <p className="text-sm text-gray-500">読み込み中…</p>
      </main>
    );
  }

  if (!sessionPhone) {
    return (
      <main className="max-w-lg mx-auto p-6">
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-semibold mb-2">ログインが必要です</h2>
          <p className="text-sm text-gray-600">先にログインしてください。</p>
          <a className="mt-4 inline-block rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700" href="/auth/login">
            ログインへ
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">HOME（ダッシュボード）</h1>
        <div className="flex items-center gap-3 text-sm text-gray-700">
          <button
            className="rounded-xl border border-emerald-600 px-3 py-1.5 text-emerald-700 hover:bg-emerald-50"
            type="button"
            onClick={handleLogout}
          >
            ログアウト
          </button>
          <span>ログイン中: <b>{sessionPhone}</b></span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左：プロフィール＋アカウント（閲覧→編集） */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-white p-6 shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">プロフィールの確認・編集</h2>
              {/* 右上の「編集する」ボタンは削除（下にだけ表示） */}
            </div>

            {msg && <p className="mb-3 text-sm text-emerald-700">{msg}</p>}
            {err && <p className="mb-3 text-sm text-red-600">{err}</p>}

            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={saveAll}>
              <div>
                <label className="block text-sm text-gray-600 mb-1">氏名</label>
                <input
                  className="w-full rounded border px-3 py-2"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="山田 太郎"
                  disabled={!editMode}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">誕生日</label>
                <input
                  className="w-full rounded border px-3 py-2"
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  min="1900-01-01"
                  max={todayStr}
                  disabled={!editMode}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">メール</label>
                <input
                  className="w-full rounded border px-3 py-2"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="taro@example.com"
                  disabled={!editMode}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">住所</label>
                <input
                  className="w-full rounded border px-3 py-2"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="東京都〇〇区…"
                  disabled={!editMode}
                />
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
                      disabled={!editMode}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">パスワード（変更時のみ）</label>
                    <input
                      className="w-full rounded border px-3 py-2"
                      type="password"
                      value={pwEdit}
                      onChange={(e) => setPwEdit(e.target.value || NO_CHANGE_MASK)}
                      placeholder={NO_CHANGE_MASK}
                      disabled={!editMode}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      ※ 「{NO_CHANGE_MASK}」のまま保存するとパスワードは変更されません。
                    </p>
                  </div>
                </div>
              </div>

              {/* フッターボタン（ここだけに編集ボタンを残す） */}
              <div className="md:col-span-2 flex items-center gap-3 mt-2">
                <button
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-white disabled:opacity-60 hover:bg-emerald-700"
                  disabled={!editMode}
                  type="submit"
                >
                  保存する
                </button>
                {!editMode && (
                  <button
                    className="rounded-xl border px-4 py-2 hover:bg-gray-50"
                    type="button"
                    onClick={enterEdit}
                  >
                    編集する
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* 右：アプリ & 最近の結果（注意書きとクイックリンクは削除） */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-lg font-semibold mb-3">アプリ</h2>
            <div className="grid grid-cols-1 gap-3">
              <a href="/apps/ex00" className="rounded-xl border px-4 py-3 text-center hover:bg-gray-50">ex00：記憶チェック</a>
              <a href="/apps/deus00" className="rounded-xl border px-4 py-3 text-center hover:bg-gray-50">deus00：タイピング</a>
              <a href="/apps/machina00" className="rounded-xl border px-4 py-3 text-center hover:bg-gray-50">machina00：座標あて</a>
            </div>
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
        </div>
      </div>
    </main>
  );
}
