"use client";

import { useEffect, useMemo, useState } from "react";
import { inviteMember, listMyMembersAsOwner } from "@/lib/family.repo";
import { listGrantsByMembers, setGrant } from "@/lib/share.repo";
import type { FamilyMember, ShareResource } from "@/types/share";

const RESOURCES: ShareResource[] = [
  "assets",
  "beneficiaries",
  "profile",
  "documents",
  "contacts",
  "messages",
];

export default function FamilyPage() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [grants, setGrants] = useState<Record<string, Set<ShareResource>>>({}); // memberId -> resources
  const [loading, setLoading] = useState(true);

  // 招待フォーム
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");

  // 初期ロード：メンバー一覧 → そのメンバーのグラントを取得
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const rows = await listMyMembersAsOwner();
        if (!mounted) return;
        setMembers(rows);

        const ids = rows.map((m) => m.id);
        if (ids.length) {
          const gs = await listGrantsByMembers(ids);
          if (!mounted) return;
          const map: Record<string, Set<ShareResource>> = {};
          for (const m of rows) map[m.id] = new Set();
          for (const g of gs) {
            if (!map[g.member_id]) map[g.member_id] = new Set();
            map[g.member_id].add(g.resource_type);
          }
          setGrants(map);
        } else {
          setGrants({});
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // 招待作成
  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    await inviteMember({ email: email || undefined, name: name || undefined, relation: relation || undefined });
    setEmail(""); setName(""); setRelation("");
    // 再読み込み
    const rows = await listMyMembersAsOwner();
    setMembers(rows);
    const ids = rows.map((m) => m.id);
    if (ids.length) {
      const gs = await listGrantsByMembers(ids);
      const map: Record<string, Set<ShareResource>> = {};
      for (const m of rows) map[m.id] = new Set();
      for (const g of gs) {
        if (!map[g.member_id]) map[g.member_id] = new Set();
        map[g.member_id].add(g.resource_type);
      }
      setGrants(map);
    } else {
      setGrants({});
    }
  };

  // 表示用：メンバーがいないとき
  const empty = !loading && members.length === 0;

  // チェック切替
  const toggle = async (memberId: string, resource: ShareResource, next: boolean) => {
    // 先にUIを楽観更新
    setGrants((prev) => {
      const copy = { ...prev };
      const set = new Set(copy[memberId] ?? []);
      if (next) set.add(resource);
      else set.delete(resource);
      copy[memberId] = set;
      return copy;
    });
    try {
      await setGrant(memberId, resource, next);
    } catch {
      // 失敗したら元に戻す
      setGrants((prev) => {
        const copy = { ...prev };
        const set = new Set(copy[memberId] ?? []);
        if (next) set.delete(resource);
        else set.add(resource);
        copy[memberId] = set;
        return copy;
      });
      alert("更新に失敗しました。ネットワークや権限をご確認ください。");
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-4">
      <h1 className="text-lg font-semibold mb-2">家族・共有</h1>
      <p className="text-sm text-gray-600 mb-4">
        家族アカウントの招待と、各メンバーへの「閲覧権限（READ）」を設定します。まずは招待を作成し、相手が受諾したら共有をONにしてください。
      </p>

      {/* 招待フォーム */}
      <section className="mb-8">
        <h2 className="font-medium mb-2">招待を作成</h2>
        <form onSubmit={onInvite} className="grid gap-2 md:grid-cols-4">
          <input className="border rounded px-3 py-2 md:col-span-2" placeholder="メールアドレス（推奨）" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="お名前（任意）" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="続き柄（例: 母/父/子/配偶者/顧問）" value={relation} onChange={(e) => setRelation(e.target.value)} />
          <div className="md:col-span-4">
            <button className="rounded bg-emerald-600 text-white px-4 py-2">招待を作成</button>
          </div>
        </form>
      </section>

      {/* メンバー一覧 + 共有トグル */}
      <section>
        <h2 className="font-medium mb-2">メンバーと共有権限</h2>

        {loading && <p>読み込み中…</p>}
        {empty && <p className="text-sm text-gray-500">まだ招待はありません。上のフォームから作成してください。</p>}

        {!loading && members.length > 0 && (
          <div className="w-full overflow-x-auto">
            <table className="min-w-[720px] w-full border-collapse">
              <thead>
                <tr className="text-left text-sm text-gray-600">
                  <th className="border-b px-3 py-2">名前 / 連絡先</th>
                  <th className="border-b px-3 py-2">続き柄</th>
                  <th className="border-b px-3 py-2">ステータス</th>
                  {RESOURCES.map((r) => (
                    <th key={r} className="border-b px-3 py-2 capitalize">{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const set = grants[m.id] ?? new Set<ShareResource>();
                  return (
                    <tr key={m.id} className="text-sm">
                      <td className="border-b px-3 py-2">
                        <div className="font-medium">{m.name ?? "（未入力）"}</div>
                        <div className="text-gray-600">{[m.email, m.phone].filter(Boolean).join(" / ") || "—"}</div>
                      </td>
                      <td className="border-b px-3 py-2">{m.relation || "—"}</td>
                      <td className="border-b px-3 py-2">{m.status}</td>

                      {RESOURCES.map((r) => {
                        const checked = set.has(r);
                        const disabled = m.status !== "active"; // active 以外は設定不可
                        return (
                          <td key={r} className="border-b px-3 py-2">
                            <label className={`inline-flex items-center gap-2 ${disabled ? "opacity-40" : ""}`}>
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={disabled}
                                onChange={(e) => toggle(m.id, r, e.target.checked)}
                              />
                              <span className="hidden md:inline">{checked ? "ON" : "OFF"}</span>
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
