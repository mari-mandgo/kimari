import Image from 'next/image';

/**
 * ヘッダー用のロゴ。
 * 画像1枚（logo-h.png）ではなく、マークと文字を分けて組んでいる。
 * 画像だと余白の入り方を調整できず、小さい画面でロゴが縮んで見えるため。
 */
export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const mark = size === 'lg' ? 40 : size === 'md' ? 30 : 24;
  const text = size === 'lg' ? 'text-[30px]' : size === 'md' ? 'text-[22px]' : 'text-[17px]';

  return (
    <span className="inline-flex items-center gap-2.5">
      <Image src="/mark.png" alt="" width={mark} height={mark} priority className="h-auto" />
      <span className={`${text} font-bold tracking-[0.18em] text-[#0B1B33]`}>KIMARI</span>
    </span>
  );
}
