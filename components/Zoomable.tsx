'use client';

import { useEffect, useState } from 'react';

/**
 * クリックで拡大表示する画像。
 * 施主が図面や現場写真を細かく見られるように、全画面のオーバーレイで開く。
 * 閉じる操作は「どこかをタップ」と「Esc」。スマホでもPCでも迷わない形にする。
 */
export default function Zoomable({
  src,
  alt,
  caption,
  className,
}: {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    // 背面のスクロールを止める
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block h-full w-full cursor-zoom-in"
        aria-label={`${alt || '画像'}を拡大`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={className} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex cursor-zoom-out flex-col items-center justify-center bg-black/85 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-h-[85vh] max-w-[95vw] rounded-lg object-contain shadow-2xl"
          />
          {caption && (
            <p className="mt-3 max-w-[90vw] text-center text-[14px] leading-relaxed text-white/90">
              {caption}
            </p>
          )}
          <p className="mt-2 text-[11px] text-white/50">タップで閉じる</p>
        </div>
      )}
    </>
  );
}
