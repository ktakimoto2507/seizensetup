"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import BeneficiariesForm from "@/components/beneficiaries-form";


// ==== Types (元のまま) ====
type Session = { phone: string; loggedInAt: string };
type Profile = { fullName?: string; birthday?: string; email?: string; address?: string };
type Account = { phone: string; passwordHash: string; createdAt?: string; updatedAt?: string };
type TestResult = {
  id: "ex00" | "deus00" | "machina00";
  startedAt: string;
  finishedAt: string;
  score: number;
  meta: Record<string, any>;
};

// 受益者配分の型　20250922
type Beneficiary = {
  id?: string;
  name: string;
  percent: number;
  relation?: string;       // 追加：続き柄（父/母/…/その他）
  relationNote?: string;   // 追加：続き柄=その他の際の補足テキスト
};

// ==== Helpers ====
const PHONE_11 = /^\d{11}$/;
function loadJSON<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}
function saveJSON<T>(key: string, value: T) { if (typeof window === "undefined") return; localStorage.setItem(key, JSON.stringify(value)); }
function removeKey(key: string) { if (typeof window === "undefined") return; localStorage.removeItem(key); }

const APP_INFO: Record<TestResult["id"], { name: string; scoreWhat: string; unit?: string }> = {
  ex00: { name: "記憶力診断", scoreWhat: "スコア", unit: "点" },
  deus00: { name: "タイピング測定（百人一首）", scoreWhat: "スコア", unit: "点" },
  machina00: { name: "座標当て", scoreWhat: "正答率", unit: "点" },
};
const DIFF_JA: Record<string, string> = { easy: "初級", normal: "中級", hard: "上級" };
function normalizeResultId(r: any): TestResult["id"] { return (r?.id ?? r?.app) as TestResult["id"]; }
function renderScoreLine(r: any) {
  const id = normalizeResultId(r);
  const info = APP_INFO[id] ?? { name: id, scoreWhat: "スコア", unit: "点" };
  const diff = id === "machina00" && r?.meta?.difficulty ? `（${DIFF_JA[String(r.meta.difficulty)] ?? r.meta.difficulty}）` : "";
  const unit = info.unit ? ` ${info.unit}` : "";
  return `${info.name}${diff}／${info.scoreWhat}：${r.score}${unit}`;
}
// ...（helpers の下あたりに追加）20250922
function loadBeneficiariesFromLocal(): Beneficiary[] {
  try {
    const raw = localStorage.getItem("seizensetup_store_v1");
    if (!raw) return [];
    const obj = JSON.parse(raw);
    const arr = obj?.beneficiaries ?? [];

    return Array.isArray(arr)
      ? arr.map((b: any) => ({
          name: String(b.name ?? ""),
          percent: Number(b.percent) || 0,
          relation: b.relation ? String(b.relation) : undefined,
          relationNote: b.relationNote ? String(b.relationNote) : undefined,
        }))
      : [];

  } catch {
    return [];
  }
}

// Supabaseのaddress_json→表示用文字列
function formatAddressText(a?: {
  postalCode?: string | null;
  prefecture?: string | null;
  city?: string | null;
  town?: string | null;
  line1?: string | null;
} | null) {
  if (!a) return "";
  const parts = [a.prefecture, a.city, a.town, a.line1].filter(Boolean);
  return parts.join(" ").trim();
}


// Assets 側からの住所（分割）を結合
function pickAddressFromAssets(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem("seizensetup_store_v1");
    if (!raw) return "";
    const obj = JSON.parse(raw);
    const a = obj?.address;
    if (!a) return "";
    const zip   = (a.postalCode ?? "").toString().trim().replace(/^〒?/, "");
    const pref  = (a.prefecture ?? "").toString().trim();
    const city  = (a.city ?? "").toString().trim();
    const town  = (a.town ?? "").toString().trim();
    const line1 = (a.line1 ?? "").toString().trim();
    const parts = [pref, city, town, line1].filter(Boolean).join(" ");
    return zip ? `〒${zip}${parts ? " " + parts : ""}` : parts;
  } catch { return ""; }
}
function resolveAddress(): string {
  const fromAssets = pickAddressFromAssets();
  if (fromAssets) return fromAssets;
  const p = loadJSON<{ address?: string }>("ss_profile");
  return (p?.address ?? "").trim();
}

// ==== Component ====
export default function HomeDashboard() {
  const router = useRouter();

  // Supabase の認証状態（唯一の真実）
  const [authChecked, setAuthChecked] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  // 20250922
  const [userId, setUserId] = useState<string | null>(null);
  // 表示データ（従来のまま）
  const [hydrated, setHydrated] = useState(false);
  const [fullName, setFullName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [phoneEdit, setPhoneEdit] = useState("");
  const snapshotRef = useRef<(Profile & { beneficiaries: Beneficiary[] }) | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  // ★追加: 受益者配分（HOMEでは閲覧専用）20250922
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  // 編集モードと保存中フラグ
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const recent = useMemo(() => results.slice(-5).reverse(), [results]);
  // ▼ 直近プレイのアプリを特定し、そのアプリの履歴だけ2〜3件に絞る
  const latestAppId = useMemo(
    () => (recent[0] ? normalizeResultId(recent[0]) : null),
    [recent]
  );
  const recentByLatestApp = useMemo(
    () => (latestAppId ? recent.filter(r => normalizeResultId(r) === latestAppId).slice(0, 3) : []),
    [recent, latestAppId]
  );
  const latestAppLabel = useMemo(
    () => (latestAppId ? (APP_INFO as any)[latestAppId]?.name ?? latestAppId : null),
    [latestAppId]
  );

  const todayStr = useMemo(() => {
    const t = new Date(); const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);
  
  // 受益者の見た目用（合計と、0%を非表示にしたリスト）
    const totalPct = useMemo(
      () => beneficiaries.reduce((s, b) => s + (Number.isFinite(b.percent) ? b.percent : 0), 0),
      [beneficiaries]
    );
    const visibleBeneficiaries = useMemo(
      () => beneficiaries.filter(b => (Number(b.percent) || 0) > 0),
      [beneficiaries]
    );

  // ① 認証ガード
  useEffect(() => {
    let unsub: (() => void) | undefined;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setUserEmail(null);
        router.replace("/auth/login?next=/home");
      } else {
        setUserEmail(session.user.email ?? session.user.id ?? null);
      }
      setAuthChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!session) {
        setUserEmail(null);
        router.replace("/auth/login?next=/home");
      } else {
        setUserEmail(session.user.email ?? session.user.id ?? null);
      }
    });
    unsub = () => subscription.unsubscribe();

    return () => unsub?.();
  }, [router]);

  // ② 画面用のローカルデータ読込（プロフィール等）
  useEffect(() => {
    const s = loadJSON<Session>("ss_session");
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
      beneficiaries, // ← ここを追加！（現時点の state をスナップショットに含める）
    };


    if (!p.address && resolvedAddress) saveJSON("ss_profile", { ...p, address: resolvedAddress });

    const a = loadJSON<Account>("ss_account");
    if (a?.phone) setPhoneEdit(a.phone);
    else if (s?.phone) setPhoneEdit(s.phone);

    //setResults(loadJSON<TestResult[]>("ss_results") ?? []);
    setHydrated(true);
  }, []);

  // ③ DBからプロフィール＆最近の結果（本人のみ）を取得
useEffect(() => {
  if (!userEmail) return;

  (async () => {
    // まずサインイン中の user.id を取得
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id); // ← 追加（以降の保存で使う）

    // プロフィール：address優先、無ければaddress_jsonを整形
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, birthday, email, address, address_json")
      .eq("id", user.id)
      .single();

    if (!isEditing) { // 編集中は上書きしない
      if (profile?.display_name) setFullName(profile.display_name);
      if (profile?.birthday) setBirthday(profile.birthday);
      if (profile?.email) setEmail(profile.email);
      const addrFromDB =
        (profile?.address ?? "") ||
        formatAddressText(profile?.address_json);
      if (addrFromDB) setAddress(addrFromDB);
    }

    // 最近の結果：本人限定
    const { data: rows } = await supabase
      .from("results")
      .select("app_id, score, meta, started_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    // 画面の型にマッピング（localStorage互換）
    const mapped: TestResult[] = (rows ?? []).map((r) => ({
      id: (r as any).app_id as TestResult["id"],
      score: (r as any).score ?? 0,
      meta: (r as any).meta ?? {},
      startedAt: (r as any).started_at ?? (r as any).created_at ?? "",
      finishedAt: (r as any).created_at ?? "",
    }));
    setResults(mapped);
    // 受益者配分の取得（DB → JSON → localStorage の順） ▼
    try {
      // 1) beneficiaries テーブル（新）
      const { data: benRows, error: benErr } = await supabase

          .from("beneficiaries")
          .select("name, percent, sort_order, relation, relation_note")   // ← 2列追加
          .eq("user_id", user.id)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });


      let bens: Beneficiary[] = [];
      if (!benErr && benRows && benRows.length) {
        bens = benRows.map((r: any) => ({
          name: String(r.name ?? ""),
          percent: Number(r.percent) || 0,

          relation: r.relation ? String(r.relation) : undefined,
          relationNote: r.relation_note ? String(r.relation_note) : undefined,

        }));
      } else {
        // 2) 旧保存先（JSON）assets_prefs.allocations.beneficiaries を試す
        const { data: apRow } = await supabase
          .from("assets_prefs")
          .select("allocations")
          .eq("user_id", user.id)
          .maybeSingle();

        const arr = (apRow as any)?.allocations?.beneficiaries;
        if (Array.isArray(arr) && arr.length) {
          bens = arr.map((b: any) => ({
            name: String(b.name ?? ""),
            percent: Number(b.percent) || 0,

            relation: b.relation ? String(b.relation) : undefined,
            relationNote: b.relationNote ? String(b.relationNote) : undefined,

          }));
        } else {
          // 3) localStorage フォールバック
          bens = loadBeneficiariesFromLocal();
        }
      }
      setBeneficiaries(bens);

        if (!isEditing && snapshotRef.current) {
          snapshotRef.current = { ...snapshotRef.current, beneficiaries: bens };
        }


    } catch (e) {
      // 例外時も最低限フォールバック
      setBeneficiaries(loadBeneficiariesFromLocal());
    }
  })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [userEmail]);


  // --- Render guards ---
  if (!authChecked) {
    return (
      <main className="p-6">
        <p className="text-sm text-gray-500">認証を確認中…</p>
      </main>
    );
  }
  if (!userEmail) {
    // 認証なし：ログインページへ誘導（念のためUIも出す）
    return (
      <main className="max-w-lg mx-auto p-6">
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-semibold mb-2">ログインが必要です</h2>
          <p className="text-sm text-gray-600">先にログインしてください。</p>
          <a className="mt-4 inline-block rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700" href="/auth/login?next=/home">
            ログインへ
          </a>
        </div>
      </main>
    );
  }
  if (!hydrated) {
    return (
      <main className="p-6">
        <p className="text-sm text-gray-500">読み込み中…</p>
      </main>
    );
  }

  // --- Actions ---
  function startEdit() {
  // いま画面に出ている値をバックアップ（念のため最新化）
  snapshotRef.current = { fullName, birthday, email, address, beneficiaries };
  setIsEditing(true);
}

function cancelEdit() {
  const snap = snapshotRef.current;
  if (snap) {
    setFullName(snap.fullName ?? "");
    setBirthday(snap.birthday ?? "");
    setEmail(snap.email ?? "");
    setAddress(snap.address ?? "");
  }
  setIsEditing(false);
}

  async function saveAll(e?: React.FormEvent) {
    e?.preventDefault();
    setErr(null); setMsg(null);
    setSaving(true);

    if (birthday && (birthday < "1900-01-01" || birthday > todayStr)) {
      setErr("誕生日は1900-01-01〜今日の範囲で入力してください。");
      return;
    }
    const phoneDigits = phoneEdit.replace(/\D/g, "").slice(0, 11);
    if (!PHONE_11.test(phoneDigits)) {
      setErr("電話番号は11桁で入力してください。");
      return;
    }

    const profile: Profile = { fullName, birthday, email, address };
    saveJSON("ss_profile", profile);

    const accOld = loadJSON<Account>("ss_account");
    const nextAcc: Account = accOld
      ? { ...accOld, phone: phoneDigits, updatedAt: new Date().toISOString() }
      : { phone: phoneDigits, passwordHash: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    saveJSON("ss_account", nextAcc);

    setMsg("保存しました。");
      snapshotRef.current = { fullName, birthday, email, address, beneficiaries }; // 新しい値で更新
    setIsEditing(false);                                            // 編集終了
    setTimeout(() => setMsg(null), 1500);
    setSaving(false);

  }

  async function handleLogout() {
    removeKey("ss_session"); // 任意
    await supabase.auth.signOut();
    router.replace("/auth/login");
  }

  // ==== UI（元のHOMEの本文をそのまま表示） ====
  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6 bg-[#EAF7F2] min-h-[calc(100vh-4rem)]">
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
          <span>ログイン中: <b>{userEmail}</b></span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* 左：プロフィール＋アカウント（閲覧→編集） */}
<div className="lg:col-span-2">
  <div className="rounded-2xl bg-white p-6 shadow ring-1 ring-emerald-200/70">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold">プロフィールの確認・編集</h2>
      {!isEditing ? (
        <button
          type="button"
          onClick={startEdit}
          className="rounded-xl border border-emerald-600 px-3 py-1.5 text-emerald-700 hover:bg-emerald-50 transition text-sm"
        >
          編集
        </button>
      ) : (
        <button
          type="button"
          onClick={cancelEdit}
          className="rounded-xl px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 transition"
        >
          キャンセル
        </button>
      )}
    </div>

    {msg && <p className="mb-3 text-sm text-emerald-700">{msg}</p>}
    {err && <p className="mb-3 text-sm text-red-600">{err}</p>}

    <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={saveAll}>
      {/* 氏名 */}
      <div>
        <label className="block text-sm text-gray-600 mb-1">氏名</label>
        <input
          className={`w-full rounded border px-3 py-2 ${!isEditing ? "bg-gray-50 text-gray-600" : ""}`}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="山田 太郎"
          disabled={!isEditing}
        />
      </div>


      {/* 誕生日 */}
      <div>
        <label className="block text-sm text-gray-600 mb-1">誕生日</label>
        <input
          className={`w-full rounded border px-3 py-2 ${!isEditing ? "bg-gray-50 text-gray-600" : ""}`}
          type="date"
          value={birthday}
          onChange={(e) => setBirthday(e.target.value)}
          min="1900-01-01"
          max={todayStr}
          disabled={!isEditing}
        />
      </div>

      {/* メール */}
      <div>
        <label className="block text-sm text-gray-600 mb-1">メール</label>
        <input
          className={`w-full rounded border px-3 py-2 ${!isEditing ? "bg-gray-50 text-gray-600" : ""}`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="taro@example.com"
          disabled={!isEditing}
        />
      </div>

      {/* 住所 */}
      <div>
        <label className="block text-sm text-gray-600 mb-1">住所</label>
        <input
          className={`w-full rounded border px-3 py-2 ${!isEditing ? "bg-gray-50 text-gray-600" : ""}`}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="東京都千代田区…"
          disabled={!isEditing}
        />
      </div>

      {/* アカウント（電話） */}
      <div className="md:col-span-2 border-t pt-4 mt-2">
        <h3 className="text-sm font-medium mb-2">アカウント（電話）</h3>
        <a className="text-sm text-emerald-700 underline mt-1 inline-block" href="/account/password">
          パスワードを変更する
        </a>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">電話番号（11桁）</label>
            <input
              className={`w-full rounded border px-3 py-2 ${!isEditing ? "bg-gray-50 text-gray-600" : ""}`}
              inputMode="numeric"
              maxLength={11}
              value={phoneEdit}
              onChange={(e) => setPhoneEdit(e.target.value.replace(/\D/g, "").slice(0, 11))}
              placeholder="090xxxxxxxx"
              disabled={!isEditing}
            />
          </div>
        </div>
      </div>

      {/* 受益者配分（同一ページ編集） */}
      <div className="md:col-span-2">
        {userId && (
          <BeneficiariesForm
            value={beneficiaries}
            onChange={setBeneficiaries}
            userId={userId}
            disabled={!isEditing}   // ← 編集中だけ操作可能
          />
        )}
      </div>


      {/* 保存ボタン（プロフィール用） */}
      <div className="md:col-span-2 flex items-center gap-3 mt-2">
        <button
          className="rounded-xl bg-emerald-600 px-4 py-2 text-white disabled:opacity-60 hover:bg-emerald-700 shadow-sm"
          type="submit"
          disabled={!isEditing || saving}
        >
          {saving ? "保存中…" : "保存する"}
        </button>
      </div>
    </form>
  </div>
</div>




{/* 右：①〜⑤の入口（縦並び）＋ ⑥その他アプリ（直近プレビュー） */}
<div className="space-y-6">

  {/* ①〜⑤：縦並びの“入口カード”（中身は別ページに遷移） */}
  <div className="rounded-2xl bg-white p-6 shadow">
    <h2 className="text-lg font-semibold mb-3">生前整理メニュー</h2>
    <div className="grid grid-cols-1 gap-3">
      <a href="/assets"   className="rounded-xl border px-4 py-3 hover:bg-emerald-50 border-emerald-600 text-emerald-700 no-underline">① 資産管理（資産リスト化）</a>
      <a href="/heritage" className="rounded-xl border px-4 py-3 hover:bg-emerald-50 border-emerald-600 text-emerald-700 no-underline">② 相続・分配</a>
      <a href="/family"   className="rounded-xl border px-4 py-3 hover:bg-emerald-50 border-emerald-600 text-emerald-700 no-underline">③ 家族・共有</a>
      <a href="/life"     className="rounded-xl border px-4 py-3 hover:bg-emerald-50 border-emerald-600 text-emerald-700 no-underline">④ ライフ整理</a>
      <a href="/security" className="rounded-xl border px-4 py-3 hover:bg-emerald-50 border-emerald-600 text-emerald-700 no-underline">⑤ セキュリティ・安心</a>
    </div>
  </div>

  {/* ⑥：その他アプリ（ex00/deus00/machina00）＋ 直近プレイのアプリだけ2〜3件プレビュー */}
  <div className="rounded-2xl bg-white p-6 shadow">
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg font-semibold">⑥ その他アプリ</h2>
      <a href="/apps" className="text-sm text-emerald-700 hover:underline">一覧へ</a>
    </div>

    <div className="grid grid-cols-1 gap-3 mb-4">
      <a href="/apps/ex00"     className="rounded-xl border px-4 py-3 text-center hover:bg-emerald-50 border-emerald-300 text-emerald-700">記憶力診断（ex00）</a>
      <a href="/apps/deus00"   className="rounded-xl border px-4 py-3 text-center hover:bg-emerald-50 border-emerald-300 text-emerald-700">タイピング測定（deus00）</a>
      <a href="/apps/machina00" className="rounded-xl border px-4 py-3 text-center hover:bg-emerald-50 border-emerald-300 text-emerald-700">座標当て（machina00）</a>
    </div>

    <div className="border-t pt-3">
      <h3 className="text-sm font-medium mb-2">直近プレイ：</h3>
      {latestAppId ? (
        <>
          <p className="text-sm mb-2">
            <span className="inline-block rounded bg-emerald-50 px-2 py-0.5 text-emerald-700 mr-2">{latestAppLabel}</span>
            最近の履歴（{recentByLatestApp.length}件）
          </p>
          <ul className="space-y-2">
            {recentByLatestApp.map((r, i) => (
              <li key={i} className="text-sm">
                ・{renderScoreLine(r)}
                <div className="text-xs text-gray-500">
                  {r?.finishedAt ? new Date(r.finishedAt).toLocaleString() : ""}
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-500 mt-2">※ 直近にプレイしたアプリだけを表示しています</p>
        </>
      ) : (
        <p className="text-sm text-gray-600">まだプレイ履歴がありません。</p>
      )}
    </div>
  </div>
</div>
     </div>
    </main>
  );
}
