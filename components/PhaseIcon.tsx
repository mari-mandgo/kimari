import type { PhaseGroup } from '@/lib/phases';

/**
 * 工程の節目を表す絵。
 * 画像ファイルにせずSVGで描く。外部への読み込みが発生せず、
 * 色をその場の状態（済み・いまここ・これから）に合わせられるため。
 */
export default function PhaseIcon({
  icon,
  className = '',
}: {
  icon: PhaseGroup['icon'];
  className?: string;
}) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {icon === 'talk' && (
        <>
          <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4 3.5V16H6.5A2.5 2.5 0 0 1 4 13.5z" {...common} />
          <path d="M8.5 8.5h7M8.5 12h4.5" {...common} />
        </>
      )}
      {icon === 'plan' && (
        <>
          <path d="M4 17.5 16.2 5.3a2 2 0 0 1 2.8 2.8L6.8 20.3 3 21z" {...common} />
          <path d="M14.5 7 17 9.5" {...common} />
        </>
      )}
      {icon === 'doc' && (
        <>
          <path d="M6 3.5h7.5L19 9v11.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1z" {...common} />
          <path d="M13.5 3.5V9H19M8.5 13h7M8.5 16.5h4.5" {...common} />
        </>
      )}
      {icon === 'build' && (
        <>
          <path d="m13.8 7.2 3-3 3.5 3.5-3 3z" {...common} />
          <path d="m14.6 8.8-9 9a2.1 2.1 0 0 0 3 3l9-9" {...common} />
          <path d="m8.5 3.5 2.5 2.5-2 2L6.5 5.5z" {...common} />
        </>
      )}
      {icon === 'home' && (
        <>
          <path d="M4 10.5 12 4l8 6.5" {...common} />
          <path d="M6 10v9.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V10" {...common} />
          <path d="M10 20.5v-6h4v6" {...common} />
        </>
      )}
    </svg>
  );
}
