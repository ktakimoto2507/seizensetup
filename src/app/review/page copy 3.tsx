"use client";

import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { Stepper } from "@/components/stepper";
// ★ Button/Card 系を必ず import（どちらかの書き方でOK）
import { Button, Card, CardHeader, CardContent } from "@/components/ui";
// もし上の一括exportがない場合は↓でも可
// import { Button } from "@/components/ui/button";
// import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function ReviewPage() {
  const router = useRouter();
  const { profile, address, beneficiaries, resetAll, setStep } = useAppStore();

  const submit = async () => {
    alert("送信しました（ダミー）");
    resetAll();
    setStep(0);
    router.push("/");
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <Stepper />

      <Card>
        <CardHeader>プロフィール</CardHeader>
        <CardContent>
          <ul className="list-disc pl-6">
            <li>氏名：{profile.name}</li>
            <li>メール：{profile.email}</li>
            <li>電話：{profile.phone}</li>
            <li>生年月日：{profile.dob}</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>住所</CardHeader>
        <CardContent>
          <ul className="list-disc pl-6">
            <li>郵便：{address.postalCode}</li>
            <li>
              {address.prefecture} {address.city} {address.town} {address.line1}
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>受益者配分</CardHeader>
        <CardContent>
          <ul className="list-disc pl-6">
            {beneficiaries.map((b) => (
              <li key={b.id}>
                {b.name}：{b.percent}%
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        <Button onClick={() => router.push("/assets")} type="button">
          戻る
        </Button>
        <Button
          onClick={() => {
            window.print(); // 印刷（PDF保存可）
          }}
          type="button"
        >
          印刷（PDF出力）
        </Button>
        <Button onClick={submit} type="button">
          送信（ダミー）
        </Button>
      </div>
    </div>
  );
}
