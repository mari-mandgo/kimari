'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROLES } from '@/lib/roles';
import Logo from '@/components/Logo';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>(ROLES[0]);
  const [avatar, setAvatar] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode, name, email, password, role, avatar }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? '失敗しました');
      router.push('/');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function pickAvatar(file: File | undefined) {
    if (!file) return;
    if (file.size > 500_000) {
      setError('画像は500KB以下にしてください');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatar(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto w-full max-w-[420px] px-5 py-12">
        <h1>
          <Logo size="lg" />
        </h1>
        <p className="mt-2 text-[14px] text-slate-600">
          打ち合わせの記録から、追加見積が必要な変更と期限を見つけます。
        </p>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex gap-2">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={`min-h-[44px] flex-1 rounded-xl text-[14px] font-bold ${
                  mode === m ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {m === 'login' ? 'ログイン' : '新規登録'}
              </button>
            ))}
          </div>

          {mode === 'register' && (
            <>
              <Field label="氏名">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="金子 麻里"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-[15px]"
                />
              </Field>

              <Field label="立場">
                <div className="flex gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRole(r)}
                      className={`min-h-[44px] flex-1 rounded-xl text-[14px] font-bold ${
                        role === r ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  施主の方は登録不要です。共有リンクをそのまま開いてください
                </p>
              </Field>

              <Field label="プロフィール画像（任意）">
                <div className="flex items-center gap-3">
                  {avatar && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => pickAvatar(e.target.files?.[0])}
                    className="text-[13px]"
                  />
                </div>
              </Field>
            </>
          )}

          <Field label="メールアドレス">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-[15px]"
            />
          </Field>

          <Field label="パスワード">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-[15px]"
            />
            {mode === 'register' && (
              <p className="mt-1.5 text-[11px] text-slate-500">8文字以上</p>
            )}
          </Field>

          {error && (
            <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-900">
              {error}
            </p>
          )}

          <button
            onClick={submit}
            disabled={busy || !email || !password}
            className="min-h-[52px] w-full rounded-xl bg-slate-900 text-[16px] font-bold text-white disabled:opacity-40"
          >
            {busy ? '処理中…' : mode === 'login' ? 'ログイン' : '登録する'}
          </button>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-[13px] font-bold text-slate-700">{label}</label>
      {children}
    </div>
  );
}
