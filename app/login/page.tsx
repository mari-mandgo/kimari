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
  const [showPassword, setShowPassword] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // iOSの自動入力は onChange を発火させないことがあるため、
      // 送信時に実際の入力欄から値を読む（stateはあてにしない）
      const data = new FormData(e.currentTarget);
      const emailNow = String(data.get('email') ?? email).trim();
      const passwordNow = String(data.get('password') ?? password);
      const nameNow = String(data.get('name') ?? name);

      if (!emailNow || !passwordNow) {
        throw new Error('メールアドレスとパスワードを入力してください');
      }

      const r = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: mode,
          name: nameNow,
          email: emailNow,
          password: passwordNow,
          role,
          avatar,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? '失敗しました');
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
          言った言わないを、なくす。
        </p>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex gap-2">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                type="button"
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

          <form onSubmit={submit}>
          {mode === 'register' && (
            <>
              <Field label="氏名">
                <input
                  name="name"
                  defaultValue={name}
                  placeholder="金子 麻里"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-[15px]"
                />
              </Field>

              <Field label="立場">
                <div className="flex gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r}
                      type="button"
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
              name="email"
              type="email"
              defaultValue={email}
              autoComplete="email"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-[15px]"
            />
          </Field>

          <Field label="パスワード">
            <div className="relative">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                defaultValue={password}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-12 text-[15px]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 hover:text-slate-700"
              >
                {showPassword ? (
                  /* 表示中 → 斜線付きの目 */
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  /* 非表示 → 目 */
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
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
            type="submit"
            disabled={busy}
            className="min-h-[52px] w-full rounded-xl bg-slate-900 text-[16px] font-bold text-white disabled:opacity-40"
          >
            {busy ? '処理中…' : mode === 'login' ? 'ログイン' : '登録する'}
          </button>
          </form>
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
