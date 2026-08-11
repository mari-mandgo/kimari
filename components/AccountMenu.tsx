'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { PublicUser } from '@/lib/roles';

/**
 * 右上のアカウントメニュー。
 *
 * 氏名・会社・ログアウトを画面に出しっぱなしにすると、
 * 毎日使う人にとっては場所を取るだけの情報になる。
 * 押したときだけ開く形にして、上の帯は現在地に使う。
 */
export default function AccountMenu({ me }: { me: PublicUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // 外側を押したら閉じる。Escでも閉じる
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function logout() {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    router.push('/login');
    router.refresh();
  }

  const row =
    'flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[14px] hover:bg-slate-50';

  return (
    <div className="relative ml-auto shrink-0" ref={box}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="アカウント"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full p-0.5 hover:bg-slate-200"
      >
        {me.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={me.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-300 text-[13px] font-bold text-slate-700">
            {me.name.slice(0, 1)}
          </span>
        )}
        <svg viewBox="0 0 24 24" className="h-3 w-3 text-slate-500" aria-hidden>
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-[260px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3.5">
            {me.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[13px] font-bold text-slate-500">
                {me.name.slice(0, 1)}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[14px] font-bold">{me.name}</p>
              <p className="truncate text-[12px] text-slate-500">
                {me.companyName ? `${me.companyName}・${me.role}` : me.role}
              </p>
            </div>
          </div>

          <Link href="/me" onClick={() => setOpen(false)} className={row}>
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden>
              <circle cx="12" cy="8" r="3.5" />
              <path d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" strokeLinecap="round" />
            </svg>
            マイページ
          </Link>
          <Link href="/" onClick={() => setOpen(false)} className={row}>
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden>
              <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" strokeLinejoin="round" />
            </svg>
            現場の一覧
          </Link>

          <div className="border-t border-slate-100">
            <button onClick={logout} className={row}>
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden>
                <path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" strokeLinecap="round" />
                <path d="M10 8l-4 4 4 4M6 12h9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              ログアウト
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
