"use client";

import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button, Card, CardHeader, CardContent, Input } from "@/components/ui";

/** 090-1234-5678 のような一般的な形式 */
const phoneRegex = /^\d{2,4}-\d{3,4}-\d{3,4}$/;

/** 年齢をざっくり計算（誕生日未満かどうかも考慮） */
function calcAge(dob: Date) {
  const t = new Date();
  let age = t.getFullYear() - dob.getFullYear();
  const m = t.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < dob.getDate())) age--;
  return age;
}

/** Zod スキーマ */
const schema = z.object({
  name: z.string().min(1, "氏名は必須です"),
  email: z.string().email("メール形式が正しくありません"),
  phone: z.string().regex(phoneRegex, "電話番号は 090-1234-5678 形式で入力してください"),
  dob: z.coerce.date({ required_error: "生年月日を入力してください" })
    .refine((d) => d <= new Date(), "未来日は選べません")
    .refine((d) => calcAge(d) >= 18, "18歳以上のみ登録可能です"),
  password: z.string().min(8, "8文字以上で入力してください"),
});
type FormValues = z.infer<typeof schema>;

/** 数字→ 3-4-4 へ自動整形（簡易） */
function formatPhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  const d = digits.slice(0, 11); // 最大11桁
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const minStr = "1900-01-01";

  const { control, register, handleSubmit, formState: { errors } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      mode: "onBlur",
      defaultValues: { name: "", email: "", phone: "", dob: undefined as any, password: "" },
    });

  const onSubmit = async (v: FormValues) => {
    setSubmitting(true);
    // ここで実際はAPIにPOSTなど。まずはモック
    await new Promise((r) => setTimeout(r, 500));
    // 成功後に KYC へ遷移
    router.push("/kyc");
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <Card>
        <CardHeader>オンボーディング</CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* 氏名 */}
            <div>
              <label htmlFor="name" className="block mb-1 font-medium">氏名</label>
              <Input id="name" placeholder="例：山田 太郎" {...register("name")} />
              {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>}
            </div>

            {/* メール */}
            <div>
              <label htmlFor="email" className="block mb-1 font-medium">メールアドレス</label>
              <Input id="email" type="email" inputMode="email" placeholder="example@mail.com" {...register("email")} />
              {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
            </div>

            {/* 電話番号（自動整形） */}
            <div>
              <label htmlFor="phone" className="block mb-1 font-medium">電話番号</label>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <Input
                    id="phone"
                    inputMode="numeric"
                    placeholder="090-1234-5678"
                    value={field.value}
                    onChange={(e) => field.onChange(formatPhone(e.target.value))}
                  />
                )}
              />
              {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone.message}</p>}
            </div>

            {/* 生年月日（ネイティブDate） */}
            <div>
              <label htmlFor="dob" className="block mb-1 font-medium">生年月日</label>
              <Input id="dob" type="date" {...register("dob")} min={minStr} max={todayStr} />
              {errors.dob && <p className="text-red-600 text-sm mt-1">{errors.dob.message}</p>}
              <p className="text-xs text-gray-500 mt-1">※ 1900-01-01 〜 本日まで／18歳以上のみ</p>
            </div>

            {/* パスワード（表示切替） */}
            <div>
              <label htmlFor="password" className="block mb-1 font-medium">パスワード</label>
              <div className="relative">
                <Input id="password" type={showPw ? "text" : "password"} {...register("password")} />
                <button
                  type="button"
                  aria-label={showPw ? "パスワードを隠す" : "パスワードを表示"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm px-2 py-1 rounded hover:bg-gray-100"
                  onClick={() => setShowPw((s) => !s)}
                >
                  {showPw ? "隠す" : "表示"}
                </button>
              </div>
              {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>}
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "送信中..." : "次へ（本人確認へ進む）"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
