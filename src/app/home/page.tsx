"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// ========== Types ==========
type Session = { phone: string; loggedInAt: string };
type Profile = {
  fullName?: string;
  birthday?: string; // YYYY-MM-DD
  email?: string;
  address?: string;
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
const labelOf = (id: TestResult["id"]) =>
  ({ ex00: "記憶力診断", deus00: "タイピング測定", machina00: "座標当てゲーム" }[id] ?? id);

// --- 住所抽出（ss_profile / ss_assets どちらでもOK、分割なら連結） ---
function pickAddressFromProfile(): string {
  const p = loadJSON<Record<string, any>>("ss_profile");
  if (!p) return "";
  // 1本の文字列なら優先
  if (typeof p.address === "string" && p.address.trim()) return p.address.trim();

  // 分割保存のゆるい吸収
  const get = (obj: any, names: string[]) =>
    names.map((k) => obj?.[k]).find(Boolean) as string | undefined;

  const parts = [
    get(p, ["prefecture", "都道府県"]),
    get(p, ["city", "ward", "区", "市"]),
    get(p, ["town", "丁目", "町", "大字", "字"]),
    get(p, ["street", "address1", "line1", "番地"]),
    get(p, ["building", "address2", "line2"]),
  ].filter(Boolean);

  return parts.join(" ");
}

function pickAddressFromAssets(): string {
  const a = loadJSON<Record<string, any>>("ss_assets") || loadJSON<Record<string, any>>("ss_asset");
  if (!a) return "";
  const addr = (typeof a.address === "object" && a.address) ? a.address : a;

  const get = (obj: any, names: string[]) =>
    names.map((k) => obj?.[k]).find(Boolean) as string | undefined;

  const parts = [
    get(addr, ["prefecture", "都道府県"]),
    get(addr, ["city", "ward", "区", "市"]),
    get(addr, ["town", "丁目", "町", "大字", "字"]),
    get(addr, ["street", "address1", "line1", "番地"]),
    get(addr, ["building", "address2", "line2"]),
  ].filter(Boolean);

  const zip = get(addr, ["postalCode", "zip", "zipcode", "郵便", "郵便番号"]);
  const joined = parts.join(" ");
  return zip ? `〒${String(zip)} ${joined}` : joined;
}

/** 住所の最終決定（profile優先 → なければassets）。常に string を返す */
function resolveAddress(): string {
  const fromProfile = pickAddressFromProfile();
  if (fromProfile && fromProfile.trim()) return fromProfile.trim();
  const fromAssets = pickAddressFromAssets();
  return fromAssets ? fromAssets : "";
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

  // アカウント（電話のみ編集可）
  const [phoneEdit, setPhoneEdit] = useState("");

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

    // プロフィール読み込み（住所は自動連結。無ければ Assets から補完）
    const p = loadJSON<Profile & Record<string, any>>("ss_profile") || ({} as any);

    const resolvedAddress = resolveAddress();

    setFullName(p.fullName ?? "");
    setBirthday(p.birthday ?? "");
    setEmail(p.email ?? "");
    setAddress(resolvedAddress);

    snapshotRef.current = {
      fullName: p.fullName ?? "",
      birthday: p.birthday ?? "",
      email: p.email ?? "",
      address: resolvedAddress,
    };

    // プロフィールに address が未保存なら補完して保存（次回以降も確実に表示）
    if (!p.address && resolvedAddress) {
      saveJSON("ss_profile", { ...p, address: resolvedAddress });
    }

    // アカウント（電話は初期表示）
    const a = loadJSON<Account>("ss_account");
    if (a?.phone) setPhoneEdit(a.phone);
    else if (s?.phone) setPhoneEdit(s.phone);

    // 結果
    setResults(loadJSON<TestResult[]>("ss_results") ?? []);

    setHydrated(true);
  }, []);

  function enterEdit() {
    snapshotRef.current = { fullName, birthday, email, address };
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
    const a = loadJSON<Account>("ss_account");
    setPhoneEdit(a?.phone ?? sessionPhone ?? "");
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

    // プロフィール保存
    const profile: Profile = { fullName, birthday, email, address };
    saveJSON("ss_profile", profile);

    // アカウント保存（電話のみ）
    const accOld = loadJSON<Account>("ss_account");
    const nextAcc: Account = accOld
      ? { ...accOld, phone: phoneDigits, updatedAt: new Date().toISOString() }
      : { phone: phoneDigits, passwordHash: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    saveJSON("ss_account", nextAcc);

    // セッションの電話も同期
    const s = loadJSON<Session>("ss_session");
    if (s) {
      const sNext = { ...s, phone: phoneDigits };
      saveJSON("ss_session", sNext);
      setSessionPhone(sNext.phone);
    }

    setEditMode(false);
    setMsg("保存しました。");
    setTimeout(() => setMsg(null), 1500);
  }

  function handleLogout() {
    removeKey("ss_session");
    location.href = "/";
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
              {/* 右上の「編集する」ボタンは削除 */}
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
                  placeholder="東京都千代田区…"
                  disabled={!editMode}
                />
              </div>

              <div className="md:col-span-2 border-t pt-4 mt-2">
                <h3 className="text-sm font-medium mb-2">アカウント（電話）</h3>
                <a className="text-sm text-emerald-700 underline mt-1 inline-block" href="/account/password">
                  パスワードを変更する
                </a>
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
                {editMode && (
                  <button
                    className="rounded-xl border px-4 py-2 hover:bg-gray-50"
                    type="button"
                    onClick={cancelEdit}
                  >
                    キャンセル
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* 右：アプリ & 最近の結果 */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-lg font-semibold mb-3">アプリ</h2>
            <div className="grid grid-cols-1 gap-3">
              <a href="/apps/ex00" className="rounded-xl border px-4 py-3 text-center hover:bg-emerald-50">
                記憶力診断
              </a>
              <a href="/apps/deus00" className="rounded-xl border px-4 py-3 text-center hover:bg-emerald-50">
                タイピング測定（百人一首）
              </a>
              <a href="/apps/machina00" className="rounded-xl border px-4 py-3 text-center hover:bg-emerald-50">
                座標当てゲーム
              </a>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-lg font-semibold mb-3">最近の結果（最新5件）</h2>
            {recent.length ? (
              <div className="space-y-2">
                {recent.map((r, i) => (
                  <div key={i} className="text-sm py-1 border-b last:border-0">
                    <div>
                      <b>{labelOf(r.id)}</b>：{r.score} 点
                    </div>
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
