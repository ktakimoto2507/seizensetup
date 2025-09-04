"use client";

import { Input, Button } from "@/components/ui";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui";
import { useAppStore } from "@/lib/store";
import dynamic from "next/dynamic";
const Stepper = dynamic(() => import("@/components/stepper").then(m => ({ default: m.Stepper })), { ssr: false });


const phoneRegex = /^\d{2,4}-\d{3,4}-\d{3,4}$/;

const schema = z.object({
  name: z.string().min(1, "氏名は必須です"),
  email: z.string().email("メール形式が正しくありません"),
  phone: z.string().regex(phoneRegex, "電話番号は 090-1234-5678 形式で入力してください"),
  dob: z.coerce.date({ required_error: "生年月日を入力してください" })
    .refine((d) => d <= new Date(), "未来日は選べません")
    .refine((d) => {
      const t = new Date(); let age = t.getFullYear() - d.getFullYear();
      const m = t.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age--;
      return age >= 18;
    }, "18歳以上のみ登録可能です"),
  password: z.string().min(8, "8文字以上で入力してください"),
});
type FormValues = z.infer<typeof schema>;

/** 数字だけを取り出して 3-4-4 に整形（簡易） */
function formatPhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  const d = digits.slice(0, 11);
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

export default function OnboardingPage() {
  const router = useRouter();
  const setProfile = useAppStore((s) => s.setProfile);
  const setStep = useAppStore((s) => s.setStep);
  const [submitting, setSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const minStr = "1900-01-01";

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
  });

  const onSubmit = async (v: FormValues) => {
    setSubmitting(true);
    setProfile({
      name: v.name,
      email: v.email,
      phone: v.phone,
      dob: new Date(v.dob).toISOString().split("T")[0],
      password: v.password,
    });
    setStep(1);
    await new Promise((r) => setTimeout(r, 300));
    router.push("/kyc");
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <Stepper />
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

            {/* 電話番号（register の onChange で自動整形） */}
            <div>
              <label htmlFor="phone" className="block mb-1 font-medium">電話番号</label>
              <Input
                id="phone"
                inputMode="numeric"
                placeholder="090-1234-5678"
                {...register("phone", {
                  onChange: (e) => {
                    e.target.value = formatPhone(e.target.value);
                  },
                })}
              />
              {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone.message}</p>}
            </div>

            {/* 生年月日 */}
            <div>
              <label htmlFor="dob" className="block mb-1 font-medium">生年月日</label>
              <Input id="dob" type="date" {...register("dob")} min={minStr} max={todayStr} />
              {errors.dob && <p className="text-red-600 text-sm mt-1">{errors.dob.message}</p>}
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
              {submitting ? "送信中..." : "次へ（本人確認へ）"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
