import Image from 'next/image';

/**
 * ヘッダー用のロゴ。横組み・文字入り・背景透過（logo-h-trim.png）。
 * 元の logo-h.png は上下に余白と薄い枠が焼き込まれていたため、
 * 本体の帯だけを切り出したものを使っている（発表資料には元画像を使う）。
 */
export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const height = size === 'lg' ? 44 : size === 'md' ? 32 : 24;
  const width = Math.round(height * (807 / 159));

  return (
    <Image
      src="/logo-h-trim.png"
      alt="KIMARI"
      width={width}
      height={height}
      priority
      style={{ height, width: 'auto' }}
    />
  );
}
