'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ROLES, type PublicUser } from '@/lib/roles';
import type { Company } from '@/lib/companies';
import type { TakeoffRule } from '@/lib/takeoff-rules';
import AppShell from '@/components/AppShell';

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
  const [avatar, setAvatar] = useState<string | undefined>(me.avatar);
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

  /**
   * 顔写真を読み込む。data URL で持つので、そのまま入れると数百KBになる。
   * users.json は毎リクエスト読むファイルなので、正方形256pxに縮めてから保存する。
   */
  function pickAvatar(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const SIZE = 256;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) return setAvatar(String(reader.result));
        // 短辺に合わせて中央を切り出す。顔が端に寄らないように
        const side = Math.min(img.width, img.height);
        ctx.drawImage(
          img,
          (img.width - side) / 2,
          (img.height - side) / 2,
          side,
          side,
          0,
          0,
          SIZE,
          SIZE
        );
        setAvatar(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  /** 会社のロゴ。横長のことが多いので、比率は変えず長辺512pxに収める */
  function pickLogo(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 512;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return saveCompanyLogo(String(reader.result));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // 背景透過のロゴがあるので PNG のまま保存する
        saveCompanyLogo(canvas.toDataURL('image/png'));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function saveCompanyLogo(logo: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit', logo }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? '保存できませんでした');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 空文字は「写真を外す」の意味。未指定と区別するため必ず送る
        body: JSON.stringify({ action: 'update', name, role, avatar: avatar ?? '' }),
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
    <AppShell me={me} title="マイページ">
      <div className="max-w-[640px]">

        {/* 自分のこと */}
        <section className={card}>
          <h2 className="text-[15px] font-bold">登録内容</h2>

          <div className="mt-3 space-y-3">
            {/* 顔写真。施主ページのメンバー欄にも出る */}
            <div>
              <span className="text-[13px] font-bold text-slate-600">顔写真</span>
              <div className="mt-1 flex items-center gap-3">
                <label className="relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-full border border-slate-300 bg-slate-50">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[11px] text-slate-400">
                      選ぶ
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) pickAvatar(f);
                    }}
                  />
                </label>
                <div className="text-[12px] leading-relaxed text-slate-500">
                  <p>丸く切り出して保存します。施主のページにも出ます。</p>
                  {avatar && (
                    <button
                      onClick={() => setAvatar(undefined)}
                      className="mt-1 text-[12px] text-slate-400 underline"
                    >
                      写真を外す
                    </button>
                  )}
                </div>
              </div>
            </div>

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
              {/* 見積書に出るのは自社のロゴであるべき。KIMARIのものではなく */}
              <div className="mt-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                <label className="relative flex h-[52px] w-[104px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-slate-300 bg-white">
                  {company.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={company.logo} alt="" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-[11px] text-slate-400">ロゴを選ぶ</span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) pickLogo(f);
                    }}
                  />
                </label>
                <div className="text-[12px] leading-relaxed text-slate-500">
                  <p>
                    <b className="text-slate-700">会社のロゴ</b>
                    <br />
                    追加見積書に出ます。横長の画像が収まりよく入ります。
                  </p>
                  {company.logo && (
                    <button
                      onClick={() => saveCompanyLogo('')}
                      className="mt-1 text-[12px] text-slate-400 underline"
                    >
                      ロゴを外す
                    </button>
                  )}
                </div>
              </div>

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
    </AppShell>
  );
}
