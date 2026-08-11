'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { PublicUser } from '@/lib/roles';
import Logo from '@/components/Logo';

/**
 * 社内側の共通の枠。
 *
 * 縦のメニューは1本だけにする。上に「いまの文脈」、下に「アカウント」。
 * 2本置くとどちらを見ればよいか分からなくなるので、
 * 現場の中の切り替えも同じ1本に入れる。
 *
 * 画面が狭いときは、メニューを上部の横並びにして固定する。
 * ハンバーガーで隠さないのは、1タップで移れるほうが現場で速いため。
 */
export type NavItem = { key: string; label: string; badge?: number };

export default function AppShell({
  me,
  title,
  /** 現場の中にいるときだけ渡す。サイドバーの上段に入る */
  sections,
  current,
  onSelect,
  children,
}: {
  me: PublicUser;
  title?: string;
  sections?: NavItem[];
  current?: string;
  onSelect?: (key: string) => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    router.push('/login');
    router.refresh();
  }

  const item =
    'w-full whitespace-nowrap rounded-xl px-4 py-2.5 text-left text-[14px] font-bold transition';
  const off = 'bg-white text-slate-600 hover:text-slate-900 lg:bg-transparent lg:hover:bg-white';
  const on = 'bg-slate-900 text-white';

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-slate-100/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1240px] items-center gap-4 px-5 py-3">
          <Link href="/" aria-label="現場の一覧へ">
            <Logo size="sm" />
          </Link>
          {title && <h1 className="min-w-0 truncate text-[16px] font-bold">{title}</h1>}
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1240px] gap-6 px-5 py-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* min-w-0 が無いと、メニューが列の幅を押し広げて横スクロールが出る */}
        <nav className="sticky top-[52px] z-10 -mx-5 min-w-0 bg-slate-100/95 px-5 py-2 backdrop-blur lg:top-[60px] lg:mx-0 lg:self-start lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
          <ul className="scroll-clean flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
            <li className="shrink-0">
              <Link href="/" className={`block ${item} ${off}`}>
                現場の一覧
              </Link>
            </li>

            {sections?.map((s) => (
              <li key={s.key} className="shrink-0">
                <button
                  onClick={() => onSelect?.(s.key)}
                  className={`${item} ${current === s.key ? on : off}`}
                >
                  {s.label}
                  {s.badge !== undefined && s.badge > 0 && (
                    <span
                      className={`ml-1.5 text-[12px] font-normal ${
                        current === s.key ? 'text-slate-300' : 'text-slate-400'
                      }`}
                    >
                      {s.badge}
                    </span>
                  )}
                </button>
              </li>
            ))}

            {/* 狭い画面では、アカウントも同じ列に並べる */}
            <li className="shrink-0 lg:hidden">
              <Link href="/me" className={`block ${item} ${off}`}>
                マイページ
              </Link>
            </li>
            <li className="shrink-0 lg:hidden">
              <button onClick={logout} disabled={busy} className={`${item} ${off}`}>
                ログアウト
              </button>
            </li>
          </ul>

          {/* 広い画面では、アカウントはメニューの下端に置く */}
          <div className="mt-4 hidden rounded-xl bg-white p-4 lg:block">
            <div className="flex items-center gap-2">
              {me.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={me.avatar} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[12px] font-bold text-slate-500">
                  {me.name.slice(0, 1)}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold">{me.name}</p>
                <p className="truncate text-[11px] text-slate-500">
                  {me.companyName ? `${me.companyName}・${me.role}` : me.role}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-2.5">
              <Link href="/me" className="text-[12px] text-slate-600 underline">
                マイページ
              </Link>
              <button
                onClick={logout}
                disabled={busy}
                className="text-[12px] text-slate-400 underline"
              >
                ログアウト
              </button>
            </div>
          </div>
        </nav>

        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}
