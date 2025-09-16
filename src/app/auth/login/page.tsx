"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { hashPassword, verifyPassword } from "@/lib/auth";

type Account = { phone?: string; passwordHash?: string; password?: string; createdAt?: string; updatedAt?: string };

const PHONE_11 = /^\d{11}$/;
const PW_RULE  = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;

function loadJSON<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try { const v = window.localStorage.getItem(key); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}
function saveJSON<T>(key: string, value: T) {
  if (typeof window === "undefined") return; window.localStorage.setItem(key, JSON.stringify(value));
}

async function migrateAccountIfNeeded(acc: Account, plainPwCandidate: string | null): Promise<Account | null> {
  // 電話番号を 11桁数字へ正規化
  const normalizedPhone = (acc.phone ?? "").replace(/\D/g, "").slice(0, 11);
  let changed = false;
  if (acc.phone !== normalizedPhone && normalizedPhone) { acc.phone = normalizedPhone; changed = true; }

  // passwordHash が無い／sha256: でない → 平文があればハッシュ化
  const hasHashed = typeof acc.passwordHash === "string" && acc.passwordHash.startsWith("sha256:");
  if (!hasHashed) {
    // 1) ss_account に平文 password が残っている場合
    if (typeof acc.password === "string" && acc.password.length >= 1) {
      acc.passwordHash = await hashPassword(acc.password);
      delete acc.password;
      changed = true;
    }
    // 2) 平文 password が ss_account に無いが、ユーザー入力があるなら「今回だけ」平文比較で認証し、成功したらハッシュ化に移行
    else if (plainPwCandidate) {
      // 旧実装で平文保存されていた場合の後方互換：一致ならハッシュ化して保存に移行
      // ここでは一致判定ができない（平文が保存されていない）ため、実際の検証は後段で tryPlain フラグを返して行う
    }
  }

  if (!acc.phone || !PHONE_11.test(acc.phone)) return null;

  if (changed) {
    acc.updatedAt = new Date().toISOString();
    saveJSON("ss_account", acc);
  }
  return acc;
}

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const phoneDigits = phone.replace(/\D/g, "").slice(0, 11);
    if (!PHONE_11.test(phoneDigits)) { setErr("電話番号は11桁で入力してください。"); return; }
    if (!PW_RULE.test(pw)) { setErr("パスワードは8文字以上で英数字を含めてください。"); return; }

    let acc = loadJSON<Account>("ss_account");
    if (!acc) { setErr("登録データが見つかりません。まずは初回登録を行ってください。"); return; }

    // ★ 後方互換マイグレーション（電話の正規化＋平文→ハッシュ化）
    acc = await migrateAccountIfNeeded(acc, pw);
    if (!acc) { setErr("登録データの形式が不正です。再登録をお試しください。"); return; }

    if (acc.phone !== phoneDigits) { setErr("電話番号が一致しません。"); return; }

    setLoading(true);

    let ok = false;
    if (typeof acc.passwordHash === "string" && acc.passwordHash.startsWith("sha256:")) {
      ok = await verifyPassword(pw, acc.passwordHash);
    } else if (typeof (acc as any).password === "string") {
      // 超後方互換：acc.password が残っていたケース
      ok = (acc as any).password === pw;
      if (ok) {
        acc.passwordHash = await hashPassword(pw);
        delete (acc as any).password;
        acc.updatedAt = new Date().toISOString();
        saveJSON("ss_account", acc);
      }
    } else {
      // hash も平文も無い → 旧データ破損
      ok = false;
    }

    setLoading(false);

    if (!ok) { setErr("パスワードが一致しません。"); return; }

    saveJSON("ss_session", { phone: acc.phone, loggedInAt: new Date().toISOString() });
    router.push("/home");
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold">ログイン</h1>
      <p className="text-sm text-gray-600 mt-1">電話番号（ID）とパスワードでログインします。</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="block text-sm text-gray-600 mb-1">電話番号（11桁）</span>
          <input
            className="w-full rounded-xl border px-3 py-2"
            inputMode="numeric"
            maxLength={11}
            placeholder="090xxxxxxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </label>

        <label className="block">
          <span className="block text-sm text-gray-600 mb-1">パスワード</span>
          <input
            className="w-full rounded-xl border px-3 py-2"
            type="password"
            placeholder="••••••••"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
          />
        </label>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <button type="submit" className="w-full rounded-xl bg-black text-white px-4 py-2 disabled:opacity-70" disabled={loading}>
          {loading ? "確認中…" : "ログイン"}
        </button>

        <p className="text-xs text-gray-500 mt-2">※ パスワード要件: 8文字以上・英数字混在</p>
      </form>
    </main>
  );
}
