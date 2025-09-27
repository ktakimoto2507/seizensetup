export default function AssetsHubPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* タイトル＋HOMEへ戻る */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">資産管理（ハブ）</h1>
        <a
          href="/home"
          className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
          aria-label="HOMEへ戻る"
        >
          HOMEへ戻る
        </a>
      </div>

      <p className="text-gray-700">
        MVPでは「資産の追加・編集・一覧」を提供します。既存の <code>/assets</code> は温存しつつ、
        本ページで新ワークフローを段階的に実装していきます。
      </p>

      <div className="rounded-2xl bg-white p-4 shadow">
        <h2 className="font-medium mb-2">次の実装予定</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
          <li>資産モデル（type / name / amount / currency / note / updatedAt）</li>
          <li>資産の追加フォーム（バリデーション含む）</li>
          <li>一覧（タイプ別グループ＋合計表示／編集・削除）</li>
          <li>localStorage CRUD → 後日 Supabase 移行</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <a
          href="/assets-hub/new"
          className="rounded-xl border px-4 py-3 hover:bg-emerald-50 border-emerald-600 text-emerald-700"
        >
          資産を追加（プレースホルダー）
        </a>
        <a
          href="/assets-hub/list"
          className="rounded-xl border px-4 py-3 hover:bg-emerald-50 border-emerald-600 text-emerald-700"
        >
          登録済み資産の一覧（プレースホルダー）
        </a>
      </div>
    </main>
  );
}
