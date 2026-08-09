'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ROLES, type PublicUser } from '@/lib/roles';
import type { Company } from '@/lib/companies';
import type { TakeoffRule } from '@/lib/takeoff-rules';
import Logo from '@/components/Logo';

/**
 * マイページ。自分が何を登録したのかを、ひとところで確認できるようにする。
 *
 * 会社の項目がここにあるのは、拾い出しのルールが会社単位で共有されるため。
 * どの会社に属していて、いま何のルールが効いているのかが見えないと、
 * 出てきた拾い出しがなぜそうなったのか分からなくなる。
 */
export default function MyPage({ me }: { me: PublicUser }) {
  const router = useRouter();

  const [name, setName] = useState(me.name);
  const [role, setRole] = useState<string>(me.role);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [company, setCompany] = useState<Company | null>(null);
  const [members, setMembers] = useState<PublicUser[]>([]);
  const [rules, setRules] = useState<TakeoffRule[]>([]);
  const [canEditRules, setCanEditRules] = useState(false);

  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [form, setForm] = useState({ name: '', address: '', tel: '', code: '' });

  async function load() {
    const [c, r] = await Promise.all([
      fetch('/api/company').then((x) => x.json()),
      fetch('/api/takeoff/rules').then((x) => x.json()),
    ]);
    setCompany(c.company ?? null);
    setMembers(c.members ?? []);
    setRules(r.rules ?? []);
    setCanEditRules(Boolean(r.canEdit));
  }

  useEffect(() => {
    load();
  }, []);

  async function saveProfile() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', name, role }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? '保存できませんでした');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function submitCompany(action: 'create' | 'join' | 'leave') {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          action === 'join'
            ? { action, code: form.code }
            : action === 'create'
              ? { action, name: form.name, address: form.address, tel: form.tel }
              : { action }
        ),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? '失敗しました');
      setForm({ name: '', address: '', tel: '', code: '' });
      await load();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function dropRule(id: string) {
    const res = await fetch('/api/takeoff/rules', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setRules((await res.json()).rules ?? []);
  }

  const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
  const input = 'w-full rounded-xl border border-slate-300 px-4 py-3 text-[15px]';

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto w-full max-w-[560px] px-5 py-8">
        <header className="mb-7">
          <Link href="/" className="text-[13px] text-slate-500 underline">
            ← 現場の一覧
          </Link>
          <h1 className="mt-3">
            <Logo size="lg" />
          </h1>
          <p className="mt-2 text-[17px] font-bold">マイページ</p>
        </header>

        {/* 自分のこと */}
        <section className={card}>
          <h2 className="text-[15px] font-bold">登録内容</h2>

          <div className="mt-3 space-y-3">
            <label className="block">
              <span className="text-[13px] font-bold text-slate-600">氏名</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`mt-1 ${input}`}
              />
            </label>

            <div>
              <span className="text-[13px] font-bold text-slate-600">メールアドレス</span>
              <p className="mt-1 rounded-xl bg-slate-50 px-4 py-3 text-[15px] text-slate-500">
                {me.email}
              </p>
              <p className="mt-1 text-[12px] text-slate-500">
                メールアドレスは変更できません。ログインに使うためです。
              </p>
            </div>

            <div>
              <span className="text-[13px] font-bold text-slate-600">立場</span>
              <div className="mt-1 flex gap-2">
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
              <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
                拾い出しのルールを変更できるのは、設計・現場管理の方だけです。
              </p>
            </div>

            <button
              onClick={saveProfile}
              disabled={busy || !name.trim()}
              className="min-h-[52px] w-full rounded-xl bg-slate-900 text-[16px] font-bold text-white disabled:opacity-40"
            >
              {saved ? '保存しました' : busy ? '保存中…' : '保存する'}
            </button>
          </div>
        </section>

        {/* 会社 */}
        <section className={`mt-4 ${card}`}>
          <h2 className="text-[15px] font-bold">会社</h2>

          {company ? (
            <>
              <dl className="mt-3 space-y-2 text-[14px]">
                <div className="flex gap-3">
                  <dt className="w-20 shrink-0 text-slate-500">会社名</dt>
                  <dd className="font-bold">{company.name}</dd>
                </div>
                {company.address && (
                  <div className="flex gap-3">
                    <dt className="w-20 shrink-0 text-slate-500">所在地</dt>
                    <dd>{company.address}</dd>
                  </div>
                )}
                {company.tel && (
                  <div className="flex gap-3">
                    <dt className="w-20 shrink-0 text-slate-500">電話</dt>
                    <dd>{company.tel}</dd>
                  </div>
                )}
              </dl>

              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <p className="text-[13px] font-bold">会社コード</p>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <span className="font-mono text-[22px] font-bold tracking-widest">
                    {company.inviteCode}
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText(company.inviteCode)}
                    className="min-h-[36px] rounded-lg bg-slate-900 px-3 text-[12px] font-bold text-white"
                  >
                    コピー
                  </button>
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-slate-500">
                  同僚の方は、新規登録のときにこのコードを入れてください。
                  <b>会社名が同じでも、コードが違えば別の会社として扱います。</b>
                </p>
              </div>

              {members.length > 0 && (
                <div className="mt-4">
                  <p className="text-[13px] font-bold text-slate-600">
                    この会社の登録者 {members.length}名
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {members.map((m) => (
                      <li key={m.id} className="text-[13px]">
                        {m.name}
                        <span className="ml-2 text-slate-500">{m.role}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={() => submitCompany('leave')}
                disabled={busy}
                className="mt-4 text-[12px] text-slate-400 underline"
              >
                この会社から抜ける
              </button>
            </>
          ) : (
            <>
              <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
                会社に登録すると、拾い出しのルールを同僚と共有できます。
                いまは<b>あなたの中だけ</b>にルールが貯まっています。
              </p>

              <div className="mt-3 flex gap-2">
                {(
                  [
                    ['create', 'あたらしく登録'],
                    ['join', '会社コードで参加'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMode(key)}
                    className={`min-h-[44px] flex-1 rounded-xl text-[13px] font-bold ${
                      mode === key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {mode === 'create' ? (
                <div className="mt-3 space-y-2">
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="株式会社◯◯工務店"
                    className={input}
                  />
                  <input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="所在地（例：横浜市◯◯区…）"
                    className={input}
                  />
                  <input
                    value={form.tel}
                    onChange={(e) => setForm({ ...form, tel: e.target.value })}
                    placeholder="電話番号"
                    inputMode="tel"
                    className={input}
                  />
                  <button
                    onClick={() => submitCompany('create')}
                    disabled={busy || !form.name.trim()}
                    className="min-h-[52px] w-full rounded-xl bg-slate-900 text-[16px] font-bold text-white disabled:opacity-40"
                  >
                    この会社を登録する
                  </button>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="ABC234"
                    maxLength={6}
                    className={`${input} font-mono tracking-widest`}
                  />
                  <button
                    onClick={() => submitCompany('join')}
                    disabled={busy || form.code.length < 6}
                    className="min-h-[52px] w-full rounded-xl bg-slate-900 text-[16px] font-bold text-white disabled:opacity-40"
                  >
                    この会社に参加する
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* 拾い出しのルール */}
        <section className={`mt-4 ${card}`}>
          <h2 className="text-[15px] font-bold">拾い出しのルール {rules.length}件</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
            拾い出しの画面で「おかしいところを直す」に書いた内容です。
            {company ? 'この会社の現場すべてに効きます。' : 'いまはあなたの現場だけに効きます。'}
          </p>

          {rules.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-5 text-center text-[13px] text-slate-500">
              まだありません。拾い出しを出したときに、違うと思ったところを書いてください。
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {rules.map((r) => (
                <li key={r.id} className="rounded-xl bg-slate-50 p-4">
                  <p className="text-[14px] leading-relaxed">{r.text}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 text-[11px] text-slate-400">
                    <span>{r.by}</span>
                    <span>{r.at.slice(0, 10)}</span>
                    {r.context && <span>「{r.context}」から</span>}
                    {canEditRules && (
                      <button onClick={() => dropRule(r.id)} className="underline">
                        取り消す
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {error && <p className="mt-4 text-[13px] text-rose-700">{error}</p>}
      </div>
    </main>
  );
}
