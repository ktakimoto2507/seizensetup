'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { hashPassword } from '@/lib/auth';

type Session = { phone: string; loggedInAt: string };
type Account = { phone: string; passwordHash: string; createdAt?: string; updatedAt?: string };

function loadJSON<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : null; }
  catch { return null; }
}
function saveJSON<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

const PW_RULE = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;

export default function PasswordChangePage() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [phone, setPhone] = useState<string>('');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const s = loadJSON<Session>('ss_session');
    if (!s) { router.replace('/auth/login'); return; }
    setPhone(s.phone);
    setHydrated(true);
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setErr(null);

    if (next !== confirm) { setErr('確認用パスワードが一致しません。'); return; }
    if (!PW_RULE.test(next)) { setErr('パスワードは8文字以上で英数字を含めてください。'); return; }

    const acc = loadJSON<Account>('ss_account');
    if (!acc) { setErr('アカウント情報が見つかりません。'); return; }

    // 現在のパスワードを照合
    const curHash = await hashPassword(current);
    if (acc.passwordHash && acc.passwordHash !== curHash) {
      setErr('現在のパスワードが一致しません。');
      return;
    }

    const newHash = await hashPassword(next);
    saveJSON('ss_account', { ...acc, passwordHash: newHash, updatedAt: new Date().toISOString() });

    setMsg('パスワードを更新しました。');
    setCurrent(''); setNext(''); setConfirm('');
    setTimeout(() => router.push('/home'), 900);
  }

  if (!hydrated) return <main className="p-6"><p className="text-sm text-gray-500">読み込み中…</p></main>;

  return (
    <main className="mx-auto max-w-lg p-6">
      <div className="rounded-2xl bg-white p-6 shadow grid gap-4">
        <h1 className="text-xl font-bold">パスワード変更</h1>
        <p className="text-sm text-gray-600">ログイン中: <b>{phone}</b></p>

        {msg && <p className="text-sm text-emerald-700">{msg}</p>}
        {err && <p className="text-sm text-red-600">{err}</p>}

        <form className="grid gap-3" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm text-gray-600 mb-1">現在のパスワード</label>
            <input className="w-full rounded border px-3 py-2" type="password"
              value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">新しいパスワード</label>
            <input className="w-full rounded border px-3 py-2" type="password"
              value={next} onChange={(e) => setNext(e.target.value)}
              placeholder="8文字以上・英数字混在" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">新しいパスワード（確認）</label>
            <input className="w-full rounded border px-3 py-2" type="password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>

          <div className="flex gap-3 pt-2">
            <button className="rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700" type="submit">
              変更する
            </button>
            <a className="rounded-xl border px-4 py-2 hover:bg-gray-50" href="/home">HOMEへ</a>
          </div>
        </form>
      </div>
    </main>
  );
}
