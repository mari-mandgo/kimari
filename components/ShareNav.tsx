'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * 施主ページの案内。
 *
 * ページを分けてあるのは、工事期間中ずっと開くページだから。
 * 1枚に全部積むと、資料を見たいだけのときも記録を通り抜けることになる。
 * 「打ち合わせ記録」だけはホームの一部なので、そこへ跳ぶ形にしている。
 *
 * 画面が広いときは横並び、狭いときはハンバーガーで出す。
 */
export default function ShareNav({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const base = `/s/${token}`;

  const links = [
    { href: base, label: 'ホーム', match: (p: string) => p === base },
    { href: `${base}/files`, label: '資料・写真', match: (p: string) => p.startsWith(`${base}/files`) },
    { href: `${base}#log`, label: '打ち合わせ記録', match: () => false },
    {
      href: `${base}/contact`,
      label: 'ご相談',
      match: (p: string) => p.startsWith(`${base}/contact`),
    },
  ];

  return (
    <>
      <nav className="ml-auto hidden gap-6 text-[14px] text-slate-600 md:flex">
        {links.map((l) => (
          <Link
            key={l.label}
            href={l.href}
            className={l.match(pathname) ? 'font-bold text-slate-900' : 'hover:text-slate-900'}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="メニュー"
        aria-expanded={open}
        className="ml-auto flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-[5px] rounded-lg border border-slate-300 md:hidden"
      >
        <span
          className={`block h-[2px] w-5 bg-slate-700 transition-transform ${
            open ? 'translate-y-[7px] rotate-45' : ''
          }`}
        />
        <span className={`block h-[2px] w-5 bg-slate-700 ${open ? 'opacity-0' : ''}`} />
        <span
          className={`block h-[2px] w-5 bg-slate-700 transition-transform ${
            open ? '-translate-y-[7px] -rotate-45' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full border-b border-slate-200 bg-[#FAF9F7] shadow-sm md:hidden">
          <ul className="mx-auto w-full max-w-[1320px] px-5 py-2">
            {links.map((l) => (
              <li key={l.label}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`block border-b border-slate-100 py-3.5 text-[15px] last:border-b-0 ${
                    l.match(pathname) ? 'font-bold' : ''
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
