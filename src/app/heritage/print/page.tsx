"use client";
import { useEffect, useState } from "react";
import { getAllocations } from "@/lib/heritage.supa";
import { getWishes } from "@/lib/wishes.supa";

export default function PrintHeritage() {
  const [alloc, setAlloc] = useState<{name:string;percent:number}[]|null>(null);
  const [w, setW] = useState<any>(null);
  useEffect(()=>{ (async()=>{ setAlloc(await getAllocations()); setW(await getWishes()); })(); },[]);
  function printNow(){ window.print(); }
  if(!alloc || !w) return <div className="p-6">読み込み中…</div>;
  return (
    <div className="max-w-3xl mx-auto p-6 print:p-0">
      <div className="flex justify-between items-center mb-4 no-print">
        <h1 className="text-xl font-semibold">相続分配・希望（プレビュー）</h1>
        <button onClick={printNow} className="px-3 py-1 border rounded">印刷</button>
      </div>
      <style>{`@media print {.no-print{display:none}}`}</style>

      <h2 className="text-lg font-medium mt-4 mb-2">受益者配分</h2>
      <table className="w-full border-collapse">
        <thead><tr><th className="border p-2 text-left">受益者</th><th className="border p-2 w-32 text-right">割合</th></tr></thead>
        <tbody>
          {alloc.map((a,i)=>(<tr key={i}><td className="border p-2">{a.name}</td><td className="border p-2 text-right">{a.percent}%</td></tr>))}
        </tbody>
      </table>

      <h2 className="text-lg font-medium mt-6 mb-2">希望の記録（要約）</h2>
      <div className="whitespace-pre-wrap border rounded p-3">{w.messages}</div>

      <h3 className="font-medium mt-4 mb-1">品目メモ</h3>
      <ul className="list-disc pl-5">
        {w.bequests.map((b:any,i:number)=>(<li key={i}>{b.label}{b.note?`（${b.note}）`:""}</li>))}
      </ul>

      <h3 className="font-medium mt-4 mb-1">デジタル資産の扱い方針</h3>
      <div className="border rounded p-3">{w.digital_notes?.policy}</div>
      <ul className="list-disc pl-5 mt-2">
        {(w.digital_notes?.contacts||[]).map((c:any,i:number)=>(<li key={i}>{c.service}：{c.note}</li>))}
      </ul>

      <p className="text-xs text-gray-500 mt-6">※本書面はドラフトです。正式な遺言・協議書の作成は専門家とご相談ください。</p>
    </div>
  );
}
