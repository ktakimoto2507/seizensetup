export default function HeritagePage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-semibold">相続・分配</h1>
      <p className="text-gray-700">
        分配希望（エンディングノート簡易版）の入力・確認ページをここに実装します。
        まずは希望の記録→確認→保存（localStorage → Supabase）から。
      </p>
      <div className="rounded-2xl bg-white p-4 shadow">
        <p className="text-sm text-gray-600">プレースホルダー：フォーム・プレビュー・注意点アラートを順次実装。</p>
      </div>
    </main>
  );
}
