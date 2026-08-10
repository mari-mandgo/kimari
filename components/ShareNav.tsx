'use client';

import { useState } from 'react';

/**
 * 施主ページの案内。
 *
 * このページは縦に長い。工事が進むほど記録が積み上がるので、
 * スマホでは目的の場所へ跳べないと読み通せない。
 * 画面が広いときは横並び、狭いときはハンバーガーで出す。
 */
const LINKS = [
  { href: '#top', label: 'ホーム' },
  { href: '#updates', label: '最新の更新' },
  { href: '#files', label: '資料・図面' },
  { href: '#story', label: 'これまでの歩み' },
  { href: '#log', label: '打ち合わせの記録' },
  { href: '#contact', label: 'ご相談' },
];

export default function ShareNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="ml-auto hidden gap-5 text-[13px] text-slate-600 lg:flex">
        {LINKS.map((l, i) => (
          <a key={l.href} href={l.href} className={i === 0 ? 'font-bold text-slate-900' : ''}>
            {l.label}
          </a>
        ))}
      </nav>

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="メニュー"
        aria-expanded={open}
        className="ml-auto flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-[5px] rounded-lg border border-slate-300 lg:hidden"
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
        <div className="absolute inset-x-0 top-full border-b border-slate-200 bg-[#FAF9F7] shadow-sm lg:hidden">
          <ul className="mx-auto w-full max-w-[1320px] px-5 py-2">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block border-b border-slate-100 py-3.5 text-[15px] font-bold last:border-b-0"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
