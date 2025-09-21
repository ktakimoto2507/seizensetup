"use client";

import { hashPassword } from "@/lib/auth";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button, Card, CardHeader, CardContent, Input } from "@/components/ui";
import { useAppStore } from "@/lib/store";
import dynamic from "next/dynamic";
import { ensureEmailAuth } from "@/lib/supabase/authflow";
import { upsertProfile } from "@/lib/supabase/db";
import Link from "next/link";

// 電話番号の表示用フォーマット（090-1234-5678）
const phoneRegex = /^\d{2,4}-\d{3,4}-\d{3,4}$/;

// ▼ 追加：パスワードで使える記号（表示にも使う）
const ALLOWED_SYMBOLS = `!@#$%^&*()_-+=[]{};:,.<>/?~`;

// ▼ 追加：英字+数字を各1文字以上含む、8文字以上、上記記号も許可
const passwordRegex =
  /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_\-+=\[\]{};:,.<>\/?~]{8,}$/;

// 問い合わせ導線（HOME内の問い合わせセクション想定）
const CONTACT_PATH = "/home#contact";

const Stepper = dynamic(
  () => import("@/components/stepper").then((m) => ({ default: m.Stepper })),
  { ssr: false }
);

const schema = z.object({
  name: z.string().min(1, "氏名は必須です"),
  email: z.string().email("メール形式が正しくありません"),
  phone: z
    .string()
    .regex(phoneRegex, "電話番号は 090-1234-5678 形式で入力してください"),
  dob: z
    .string()
    .min(1, "生年月日を入力してください")
    .refine((s) => !Number.isNaN(Date.parse(s)), { message: "生年月日を入力してください" })
    .refine((s) => new Date(s) <= new Date(), { message: "未来日は選べません" })
    .refine((s) => {
      const d = new Date(s);
      const t = new Date();
      let age = t.getFullYear() - d.getFullYear();
      const m = t.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age--;
      return age >= 18;
    }, { message: "18歳以上のみ登録可能です" }),
  password: z
    .string()
    .regex(
      passwordRegex,
      `英字と数字を各1文字以上含む8文字以上で入力してください。使用可能記号: ${ALLOWED_SYMBOLS}`
    ),
});

// 入力型（dob は string）
type FormValues = z.input<typeof schema>;

function formatPhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  const d = digits.slice(0, 11);
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

/** 旧ローカル仕様：電話/パスワードを localStorage に保存（互換維持用） */
async function finalizeRegistration(phoneInput: string, plainPassword: string) {
  const phone = phoneInput.replace(/\D/g, "").slice(0, 11);
  const PHONE_11 = /^\d{11}$/;
  const PW_RULE = passwordRegex;
  if (!PHONE_11.test(phone)) throw new Error("電話番号は11桁の数字で入力してください。");
  if (!PW_RULE.test(plainPassword)) {
    throw new Error(
      `パスワードは英字と数字を各1文字以上含む8文字以上で入力してください。使用可能記号: ${ALLOWED_SYMBOLS}`
    );
  }

  const passwordHash = await hashPassword(plainPassword);
  const now = new Date().toISOString();

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      "ss_account",
      JSON.stringify({ phone, passwordHash, createdAt: now, updatedAt: now })
    );
    window.localStorage.setItem("ss_onboarded", JSON.stringify(true));
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const setProfile = useAppStore((s) => s.setProfile);
  const setStep = useAppStore((s) => s.setStep);
  const [submitting, setSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const minStr = "1900-01-01";

  const { register, handleSubmit, formState: { errors }, setError } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
  });

  const onSubmit = async (v: FormValues) => {
  try {
    setSubmitting(true);

    // ① 旧ローカル互換（任意）
    await finalizeRegistration(v.phone, v.password);

    // ② Supabase 認証（メール重複の検知ポイント）
    let session = null;
    try {
      session = await ensureEmailAuth(v.email, v.password);
    } catch (e: any) {
      const msg: string = e?.message ?? "";
      // 代表例: "User already registered" / "User already exists"
      if (/already\s+(registered|exists)/i.test(msg)) {
        // ▼ ここで throw せず、フォームの email にエラー表示
        setError("email", {
          type: "manual",
          message: "このメールアドレスは既に登録済みです。お手数ですが、問い合わせフォームからご連絡ください。"
        });
        setSubmitting(false);
        return; // ここで処理を止める
      }
      throw e;
    }

    if (!session) {
      alert("確認メールの承認が必要です。メールをご確認ください。");
      setSubmitting(false);
      return;
    }

    // ③ profiles を upsert（電話重複の検知ポイント）
    try {
      await upsertProfile({
        email: v.email,
        full_name: v.name,
        birthday: new Date(v.dob).toISOString().split("T")[0],
        // phone は profiles 側で管理していて UNIQUE(phone) を想定
        phone: v.phone.replace(/\D/g, "").slice(0, 11),
      });
    } catch (e: any) {
      // 一意制約違反
      if (e?.code === "23505") {
        throw new Error(
          `この電話番号は既に登録済みです。` +
          `\n\nお手数ですが、[問い合わせフォーム](${CONTACT_PATH}) からご連絡ください。`
        );
      }
      throw e;
    }

    // ④ 旧 HOME 初期表示のためのローカル profile（互換）
    if (typeof window !== "undefined") {
      const profile = {
        fullName: v.name,
        email: v.email,
        birthday: new Date(v.dob).toISOString().split("T")[0],
        address: "",
        note: "",
      };
      window.localStorage.setItem("ss_profile", JSON.stringify(profile));
    }

    // ⑤ 画面状態（既存ストア連携）
    setProfile({
      name: v.name, email: v.email, phone: v.phone,
      dob: new Date(v.dob).toISOString().split("T")[0], password: v.password
    });
    setStep(1);

    // ⑥ 次へ
    router.push("/kyc");
  } catch (e: any) {
    console.error(e);
    // Markdownリンクのまま alert だと飛べないので、画面上に出すのがベター
    alert((e?.message ?? "送信に失敗しました").replace(/\[|\]|\(|\)/g, ""));
  } finally {
    setSubmitting(false);
  }
};


  return (
    <div className="max-w-md mx-auto p-4">
      <Stepper />
      <Card>
        <CardHeader>オンボーディング</CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label htmlFor="name" className="block mb-1 font-medium text-emerald-700">氏名</label>
              <Input id="name" placeholder="例：山田 太郎" {...register("name")} />
              {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block mb-1 font-medium text-emerald-700">メールアドレス</label>
              <Input id="email" type="email" inputMode="email" placeholder="example@mail.com" {...register("email")} />
              {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="phone" className="block mb-1 font-medium text-emerald-700">電話番号</label>
              <Input
                id="phone"
                inputMode="numeric"
                placeholder="090-1234-5678"
                {...register("phone", {
                  onChange: (e) => { e.target.value = formatPhone(e.target.value); },
                })}
              />
              {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone.message}</p>}
            </div>

            <div>
              <label htmlFor="dob" className="block mb-1 font-medium text-emerald-700">生年月日</label>
              <Input id="dob" type="date" {...register("dob")} min={minStr} max={todayStr} />
              {errors.dob && <p className="text-red-600 text-sm mt-1">{errors.dob.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block mb-1 font-medium text-emerald-700">パスワード</label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  // ▼ ブラウザ側でも同じ制約を適用（Zodと同じ正規表現ルール）
                  pattern="(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_\-+=\[\]{};:,.<>\/?~]{8,}"
                  title={`英字と数字を各1文字以上含む8文字以上。使用可能記号: ${ALLOWED_SYMBOLS}`}
                  autoComplete="new-password"
                  {...register("password")}
                  aria-describedby="passwordHelp"
                />

                <button
                  type="button"
                  aria-label={showPw ? "パスワードを隠す" : "パスワードを表示"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm px-2 py-1 rounded hover:bg-gray-100"
                  onClick={() => setShowPw((s) => !s)}
                >
                  {showPw ? "隠す" : "表示"}
                </button>
                          </div>
                          <p id="passwordHelp" className="text-xs text-emerald-700 mt-1">
                英字＋数字を必須（8文字以上）。推奨：大文字・記号の併用。使用可能記号：
                <code className="px-1 py-0.5 bg-gray-100 rounded">{ALLOWED_SYMBOLS}</code>
              </p>

              {errors.password && (
                <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
              )}
    
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "送信中..." : "次へ（本人確認へ）"}
            </Button>

            <Link
              href="/auth/login"
              role="button"
              aria-label="新規登録・ログインの画面に戻る"
              className="mt-3 block w-full rounded-2xl border border-emerald-600 text-emerald-700 bg-white hover:bg-emerald-50 px-4 py-3 text-center font-medium"
            >
              新規登録・ログインの画面に戻る
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
