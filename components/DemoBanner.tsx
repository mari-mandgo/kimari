'use client';

import { usePathname } from 'next/navigation';

/**
 * 公開デモであることを、全ページの一番上に出す。
 *
 * 触った人が「本物の現場のシステムを操作している」と誤解しないようにする。
 * この画面に出ている施主名・住所・打ち合わせはすべて架空のもので、
 * 何を押しても保存されない。**それが分からないまま触られるのが一番まずい。**
 *
 * 隠せるようにはしない。読んで消せる注意書きは、消えたあとに効かなくなる。
 * スクロールしても残す。上に戻らないと読めない注意書きは、
 * 途中から見た人には無いのと同じになる。
 *
 * ただし **LP には出さない**。LPは製品の紹介ページで、
 * 触って動かす画面ではないため、断る対象がない。
 *
 * 高さは 32px で固定し、その分だけ画面側のヘッダーを下げる
 * （app/layout.tsx の --app-top と components/AppShell.tsx）。
 * 折り返して高さが変わると、下のヘッダーとの位置がずれる。
 */
export default function DemoBanner() {
  const pathname = usePathname();
  if (pathname?.startsWith('/lp')) return null;

  return (
    <div className="sticky top-0 z-40 h-8 w-full overflow-hidden bg-amber-400 text-slate-900">
      <div className="mx-auto flex h-8 max-w-[1200px] items-center gap-2 px-4">
        <span className="shrink-0 rounded bg-slate-900 px-2 py-0.5 text-[11px] font-bold tracking-wide text-amber-300">
          デモ実行中
        </span>
        <span className="truncate text-[12px] font-bold">
          これは公開デモです。操作しても保存されません。
          <span className="hidden font-normal sm:inline">
            　施主名・住所・打ち合わせの内容はすべて架空のものです。
          </span>
        </span>
        <a
          href="https://github.com/mari-mandgo/kimari"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto hidden shrink-0 text-[12px] font-bold underline sm:inline"
        >
          ソースコード
        </a>
      </div>
    </div>
  );
}
