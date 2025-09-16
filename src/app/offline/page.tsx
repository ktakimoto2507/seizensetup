// src/app/offline/page.tsx
export const dynamic = "force-static"; // ensure static output at build time

export default function OfflinePage() {
  return (
    <main className="min-h-screen grid place-items-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold mb-2">オフラインです</h1>
        <p className="opacity-80">
          接続が回復すると自動で再読み込みされます。電波状況を確認してください。
        </p>
      </div>
    </main>
  );
}
