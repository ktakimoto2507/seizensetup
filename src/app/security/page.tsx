export default function SecurityPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-semibold">セキュリティ・安心</h1>
      <p className="text-gray-700">
        2段階認証・データ暗号化・緊急時引き継ぎの設定ページをここに実装します。
        MVP段階では2FAのオン/オフや緊急連絡先の指定から開始。
      </p>
      <div className="rounded-2xl bg-white p-4 shadow">
        <p className="text-sm text-gray-600">プレースホルダー：2FA実装・緊急時ワークフローは後日。</p>
      </div>
    </main>
  );
}
