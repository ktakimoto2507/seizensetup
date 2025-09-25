"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getAllocations, saveAllocations, type Allocation } from "@/lib/heritage.supa";
import { getWishes, saveWishes, type Wishes } from "@/lib/wishes.supa";
import { runLegalChecks, type HeirsInfo, type WillInfo, type EstateInfo } from "@/lib/legalChecks";

// 簡易UI（shadcn未依存）
const Btn = (p: any) => <button {...p} className={`px-3 py-1 rounded border ${p.className||""}`} />;
const Card = ({ title, children }: { title: string; children: any }) => (
  <div className="border rounded-xl p-4 mb-4">
    <div className="font-medium mb-2">{title}</div>
    {children}
  </div>
);

const TabBtn = ({active, ...p}: any) =>
  <button {...p} className={`px-3 py-2 rounded-t-lg border-b-0 border ${active?"bg-white border-gray-300":"bg-gray-100 border-transparent"}`} />;

// 追加：Wishes の初期値（nullにしない）
const DEFAULT_WISHES: Wishes = {
  
  messages:
`# 私の希望（例）
- 葬送：家族葬／宗派は問わず。香典・供花は丁重に辞退。
- 連絡：まず妻○○、次に兄△△。友人A/Bへは落ち着いてからでOK。
- 医療/介護：延命は過度に希望しない（詳細は別紙）。

# 誰に何を残したいか（例）
- 「大阪の倉庫Aの什器」→ 長男へ（起業支援のため）
- 「祖父の時計」→ 次女へ（成人祝いとして）
- 「写真アルバム」→ 家族共有（データ化の方針は下記）`,
  bequests: [
    { label: "祖父の時計", note: "次女へ（成人祝い）" },
    { label: "大阪の倉庫Aの什器", note: "長男へ（起業支援）" },
  ],
  digital_notes: {
    policy: "ID/パスワードは本アプリに保存しない。各サービスの退会/解約方針のみ記録。",
    contacts: [],
  },
};



// ちいさなヘルパーUI
function GuideBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-sm">
      <div className="font-medium text-emerald-800 mb-1">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
function Chip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs rounded-full border px-2 py-1 bg-white hover:bg-gray-50"
    >
      {children}
    </button>
  );
}

function localUid() { return Math.random().toString(36).slice(2, 9); }

// ====== 受益者配分（D&D対応） ======
function adjust(items: Allocation[], id: string, newValue: number): Allocation[] {
  const clamped = Math.max(0, Math.min(100, Math.round(newValue)));
  const idx = items.findIndex((b) => b.id === id);
  if (idx < 0) return items;
  const others = items.filter((_, i) => i !== idx);
  const remaining = 100 - clamped;
  const sumOthers = others.reduce((s, b) => s + b.percent, 0) || 1;
  const redistributed = others.map((b) => ({ ...b, percent: Math.round((b.percent / sumOthers) * remaining) }));
  const diff = 100 - (clamped + redistributed.reduce((s, b) => s + b.percent, 0));
  if (redistributed.length > 0) redistributed[0].percent += diff;
  const res: Allocation[] = [];
  let j = 0;
  for (let i = 0; i < items.length; i++) res.push(i === idx ? { ...items[i], percent: clamped } : redistributed[j++]);
  return res;
}

function AllocationsTab() {
  const router = useRouter();
  const [rows, setRows] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // D&D
  const dragId = useRef<string | null>(null);
  function onDragStart(id: string) { dragId.current = id; }
  function onDrop(id: string) {
    const from = rows.findIndex(r => r.id === dragId.current);
    const to = rows.findIndex(r => r.id === id);
    if (from<0 || to<0 || from===to) return;
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setRows(next);
  }

  useEffect(() => {
    
    (async () => {
      const list = await getAllocations();
      setRows(list.length ? list.map(b => ({ id: b.id || localUid(), name: b.name, percent: b.percent })) : [{ id: localUid(), name: "受益者A", percent: 100 }]);
      setLoading(false);
    })();
  }, []);
  
  const total = useMemo(() => rows.reduce((s, b) => s + b.percent, 0), [rows]);
  const totalOk = total === 100;

  function addOne() {
    const next = [...rows, { id: localUid(), name: `受益者${String.fromCharCode(65 + rows.length)}`, percent: 0 }];
    const even = Math.floor(100 / next.length);
    const res = next.map((b) => ({ ...b, percent: even }));
    let rem = 100 - res.reduce((s, b) => s + b.percent, 0);
    for (let i = 0; i < res.length && rem > 0; i++, rem--) res[i].percent += 1;
    setRows(res);
  }
  function removeOne(id: string) {
    const left = rows.filter((b) => b.id !== id);
    if (!left.length) return;
    const sum = left.reduce((s, b) => s + b.percent, 0) || 1;
    const res = left.map((b) => ({ ...b, percent: Math.round((b.percent / sum) * 100) }));
    const diff = 100 - res.reduce((s, b) => s + b.percent, 0);
    if (res.length) res[0].percent += diff;
    setRows(res);
  }
  async function onSave() {
    if (!totalOk) return alert("合計が100%になるよう調整してください");
    setSaving(true);
    try {
      await saveAllocations(rows.map(({ name, percent }) => ({ name: name.trim() || "受益者", percent })));
      alert("受益者配分を保存しました");
      router.refresh();
    } catch (e:any) { alert(e?.message ?? "保存に失敗しました"); }
    finally { setSaving(false); }
  }

  if (loading) return <div>読み込み中…</div>;
  return (
    <Card title={`受益者配分（合計 ${total}%）`}>
      <div className={`text-sm mb-3 ${totalOk ? "text-green-700" : "text-red-700"}`}>
        {totalOk ? "合計は100%です" : "合計が100%になるよう調整してください"}
      </div>
      <div className="space-y-4">
        {rows.map((b) => (
          <div key={b.id} draggable onDragStart={() => onDragStart(b.id!)} onDragOver={(e)=>e.preventDefault()} onDrop={()=>onDrop(b.id!)}
               className="border rounded-lg p-3 bg-white">
            <div className="flex items-center justify-between mb-2 gap-2">
              <input className="border rounded px-2 py-1 w-40" value={b.name}
                     onChange={(e)=>setRows(rows.map(x=>x.id===b.id?{...x,name:e.target.value}:x))}/>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{b.percent}%</span>
                <Btn onClick={()=>removeOne(b.id!)} disabled={rows.length<=1} title="削除">削除</Btn>
                <span className="text-xs text-gray-500" title="ドラッグで並べ替え">⇅</span>
              </div>
            </div>
            <input type="range" min={0} max={100} value={b.percent}
                   onChange={(e)=>setRows(adjust(rows,b.id!,Number(e.target.value)))} className="w-full" />
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-between">
        <Btn onClick={addOne}>受益者を追加</Btn>
        <div className="text-sm text-gray-600">受益者数：{rows.length}</div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Btn onClick={onSave} disabled={!totalOk}>保存</Btn>
        <a href="/heritage/print" className="px-3 py-1 rounded border no-underline">印刷（PDF出力）</a>
      </div>
      <p className="text-xs text-gray-500 mt-2">※D&D=ドラッグ&ドロップ。カードを掴んで上下に移動すると表示順（=保存時のsort_order）が変わります。</p>
    </Card>
  );
}

// ====== 希望の記録 ======
function WishesTab() {
  // ← ここがポイント：nullをやめて、必ずWishes型で持つ
  const [w, setW] = useState<Wishes>(DEFAULT_WISHES);
  const [guideOn, setGuideOn] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const loaded = await getWishes();
      // undefined を全て充填してからセット（型安全）
      setW({
        messages: loaded.messages ?? "",
        bequests: loaded.bequests ?? [],
        digital_notes: {
          policy: loaded.digital_notes?.policy ?? "",
          contacts: loaded.digital_notes?.contacts ?? [],
        },
      });
    })();
  }, []);

  function appendMessage(template: string) {
  setW((prev) => ({ ...prev, messages: (prev.messages ? prev.messages + "\n\n" : "") + template }));
}

function addBequestTemplate(label: string, note?: string) {
  setW((prev) => ({ ...prev, bequests: [...prev.bequests, { label, note }] }));
}

  function addBequest() {
    setW((prev) => ({
      ...prev,
      bequests: [...prev.bequests, { label: "（例）形見の品", note: "誰に・理由" }],
    }));
  }

  function addContact() {
    setW((prev) => {
      const dn = prev.digital_notes ?? { policy: "", contacts: [] };
      return {
        ...prev,
        digital_notes: { ...dn, contacts: [...(dn.contacts ?? []), { service: "サービス名", note: "方針" }] },
      };
    });
  }

  async function save() {
    setSaving(true);
    try {
      await saveWishes(w); // 既にWishes型なのでTS OK
      alert("希望を保存しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="希望の記録（エンディングノート）">
      <div className="mb-3 flex items-center justify-between">
  <div className="text-sm text-gray-600">ガイドモード：</div>
  <label className="text-sm">
    <input
      type="checkbox"
      checked={guideOn}
      onChange={(e) => setGuideOn(e.target.checked)}
      className="mr-1"
    />
    有効にする
  </label>
</div>

{guideOn && (
  <div className="mb-3 space-y-3">
    <GuideBox title="まずはテンプレを入れて編集してみましょう">
      <div className="text-gray-700">下のチップを押すと本文に追記されます。</div>
      <div className="flex flex-wrap gap-2">
        <Chip onClick={() => appendMessage("## 葬送の希望\n- 家族葬を希望。宗派は問わず。\n- 香典・供花は辞退します。")}>葬送の希望</Chip>
        <Chip onClick={() => appendMessage("## 連絡の順番\n- まずは妻○○へ、次に兄△△へ。\n- 友人A/Bへは落ち着いてからで構いません。")}>連絡の順番</Chip>
        <Chip onClick={() => appendMessage("## 医療・介護の希望\n- 延命治療は過度に希望しません。\n- 苦痛緩和を優先してください。")}>医療・介護</Chip>
        <Chip onClick={() => appendMessage("## 写真・データの扱い\n- アルバムは家族で共有し、データ化して保存してください。")}>写真・データ</Chip>
      </div>
    </GuideBox>

    <GuideBox title="『誰に何を残すか』の例を追加">
      <div className="flex flex-wrap gap-2">
        <Chip onClick={() => addBequestTemplate("祖父の時計", "次女へ（成人祝い）")}>祖父の時計→次女</Chip>
        <Chip onClick={() => addBequestTemplate("大阪の倉庫Aの什器", "長男へ（起業支援）")}>什器→長男</Chip>
        <Chip onClick={() => addBequestTemplate("写真アルバム", "家族共有（データ化希望）")}>写真→家族共有</Chip>
      </div>
      <div className="text-xs text-gray-600">※あとから自由に編集・削除できます</div>
    </GuideBox>

    <GuideBox title="デジタルの扱い">
      <div className="text-gray-700">
        IDやパスワードは書かず、<b>方針だけ</b>を書きます。
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip
          onClick={() =>
            setW((p) => ({
              ...p,
              digital_notes: {
                ...(p.digital_notes ?? { contacts: [] }),
                policy: "SNSは追悼化し、EC定期便は解約。ID・パスワードはアプリに保存しない。",
              },
            }))
          }
        >
          方針を入れる
        </Chip>
        <Chip
          onClick={() =>
            setW((p) => {
              const cs = p.digital_notes?.contacts ?? [];
              return {
                ...p,
                digital_notes: {
                  ...(p.digital_notes ?? {}),
                  contacts: [
                    ...cs,
                    { service: "SNS（X/Instagram）", note: "追悼化の方針" },
                    { service: "EC（Amazon/Rakuten）", note: "定期便の停止" },
                  ],
                },
              };
            })
          }
        >
          連絡先の例を入れる
        </Chip>
      </div>
    </GuideBox>
  </div>
)}

      <div className="mb-2 text-sm text-gray-600">自由記入（Markdown可）：迷う場合は初期例を編集してください。</div>

      <textarea
        className="w-full h-48 border rounded p-2"
        value={w.messages}
        onChange={(e) => setW({ ...w, messages: e.target.value })}
      />

      <div className="mt-4">
        <div className="font-medium mb-1">品目メモ（誰に何を残したいか・理由）</div>
        <div className="space-y-2">
  {w.bequests.map((b, i) => (
    <div key={i} className="flex gap-2">
      <input
        className="border rounded px-2 py-1 flex-1"
        value={b.label}
        onChange={(e) => {
          const arr = [...w.bequests];
          arr[i] = { ...arr[i], label: e.target.value };
          setW({ ...w, bequests: arr });
        }}
      />
      <input
        className="border rounded px-2 py-1 flex-1"
        placeholder="メモ/理由"
        value={b.note || ""}
        onChange={(e) => {
          const arr = [...w.bequests];
          arr[i] = { ...arr[i], note: e.target.value };
          setW({ ...w, bequests: arr });
        }}
      />
    </div>
  ))}
</div>
<div className="mt-2">
  <Btn onClick={addBequest}>行を追加</Btn>
</div>
      </div>
    </Card>
  );
}


// ====== 法的チェック ======
function LegalTab() {
  const [heirs, setHeirs] = useState<HeirsInfo>({ spouse:false, children:0, ascendants:false, siblings:false, hasMinorHeir:false });
  const [will, setWill] = useState<WillInfo>({ type:"none", keptAtMoJ:false });
  const [estate, setEstate] = useState<EstateInfo>({ hasRealEstate:false, hasUnlistedShares:false, hasOverseas:false });
  const [deathDateISO, setDeathDateISO] = useState<string>("");

  const results = runLegalChecks(heirs, will, estate, { deathDateISO }, { sumPercent: 100 });

  return (
    <Card title="相続トラブル回避（法的アラート）">
      <div className="mb-3">
  <GuideBox title="クイック設定（例）">
    <div className="text-gray-700">典型パターンを選ぶと入力が埋まります。調整はその後でOK。</div>
    <div className="flex flex-wrap gap-2 mt-1">
      <Chip onClick={()=>{
        setHeirs({ spouse:true, children:2, ascendants:false, siblings:false, hasMinorHeir:false });
        setWill({ type:"none" });
        setEstate({ hasRealEstate:true, hasUnlistedShares:false, hasOverseas:false });
      }}>配偶者＋子2／遺言なし／不動産あり</Chip>

      <Chip onClick={()=>{
        setHeirs({ spouse:true, children:0, ascendants:true, siblings:false, hasMinorHeir:false });
        setWill({ type:"notarial" });
        setEstate({ hasRealEstate:false, hasUnlistedShares:false, hasOverseas:false });
      }}>配偶者のみ／公正証書遺言あり</Chip>

      <Chip onClick={()=>{
        setHeirs({ spouse:true, children:1, ascendants:false, siblings:false, hasMinorHeir:true });
        setWill({ type:"holograph", keptAtMoJ:false });
        setEstate({ hasRealEstate:true, hasUnlistedShares:true, hasOverseas:false });
      }}>未成年の子あり／自筆遺言（保管なし）</Chip>
    </div>
    <div className="text-xs text-gray-600 mt-1">※アラートの出典リンクは各カード末尾の「出典」を押すと開きます</div>
  </GuideBox>
</div>

      <p className="text-xs text-gray-600 mb-3">
        ※本機能は一般情報であり、法的助言ではありません。必要に応じて専門家（弁護士・税理士・司法書士・公証人）へご相談ください。
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border rounded p-3">
          <div className="font-medium mb-1">家族構成</div>
          <label className="block"><input type="checkbox" checked={heirs.spouse} onChange={e=>setHeirs({...heirs, spouse:e.target.checked})}/> 配偶者がいる</label>
          <label className="block mt-1">子の人数：<input type="number" min={0} className="border rounded px-2 py-1 w-20 ml-1"
            value={heirs.children} onChange={e=>setHeirs({...heirs, children:Number(e.target.value)})}/></label>
          <label className="block"><input type="checkbox" checked={heirs.ascendants} onChange={e=>setHeirs({...heirs, ascendants:e.target.checked})}/> 直系尊属（父母・祖父母）あり</label>
          <label className="block"><input type="checkbox" checked={heirs.siblings} onChange={e=>setHeirs({...heirs, siblings:e.target.checked})}/> 兄弟姉妹あり</label>
          <label className="block"><input type="checkbox" checked={heirs.hasMinorHeir} onChange={e=>setHeirs({...heirs, hasMinorHeir:e.target.checked})}/> 未成年の相続人がいる</label>
        </div>

        <div className="border rounded p-3">
          <div className="font-medium mb-1">遺言・財産</div>
          <div className="flex gap-3">
            {["none","holograph","notarial"].map(t=>
              <label key={t}><input type="radio" name="will" checked={will.type===t} onChange={()=>setWill({ ...will, type:t as any })}/> {t==="none"?"遺言なし":t==="holograph"?"自筆":"公正証書"}</label>
            )}
          </div>
          {will.type==="holograph" &&
            <label className="block mt-1"><input type="checkbox" checked={!!will.keptAtMoJ} onChange={e=>setWill({...will, keptAtMoJ:e.target.checked})}/> 法務局の自筆証書遺言書保管制度を利用</label>
          }
          <div className="mt-2">
            <label className="block"><input type="checkbox" checked={estate.hasRealEstate} onChange={e=>setEstate({...estate, hasRealEstate:e.target.checked})}/> 不動産がある</label>
            <label className="block"><input type="checkbox" checked={estate.hasUnlistedShares} onChange={e=>setEstate({...estate, hasUnlistedShares:e.target.checked})}/> 非上場株式/事業がある</label>
            <label className="block"><input type="checkbox" checked={estate.hasOverseas} onChange={e=>setEstate({...estate, hasOverseas:e.target.checked})}/> 海外資産がある</label>
          </div>
          <div className="mt-2">死亡日（期限計算用・将来のためにシミュレーション可）
            <input type="date" className="border rounded px-2 py-1 ml-2" value={deathDateISO} onChange={e=>setDeathDateISO(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {results.map(r=>(
          <div key={r.id} className={`border rounded p-3 ${r.severity==="error"?"border-red-400 bg-red-50":r.severity==="warn"?"border-amber-400 bg-amber-50":"border-gray-200 bg-gray-50"}`}>
            <div className="text-sm">{r.tip}</div>
            {r.href && <a className="text-xs text-blue-700 underline" href={r.href} target="_blank" rel="noreferrer">{r.sourceName || "出典"}</a>}
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function HeritagePage() {
  const [tab, setTab] = useState<"alloc"|"wishes"|"legal">("alloc");
  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold mb-2">相続・分配</h1>
      <div className="flex gap-1 border-b mb-4">
        <TabBtn active={tab==="alloc"} onClick={()=>setTab("alloc")}>配分</TabBtn>
        <TabBtn active={tab==="wishes"} onClick={()=>setTab("wishes")}>希望の記録</TabBtn>
        <TabBtn active={tab==="legal"} onClick={()=>setTab("legal")}>法的チェック</TabBtn>
      </div>
      {tab==="alloc" && <AllocationsTab/>}
      {tab==="wishes" && <WishesTab/>}
      {tab==="legal" && <LegalTab/>}
    </main>
  );
}
