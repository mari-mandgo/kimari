import fs from 'node:fs';
import path from 'node:path';
import { notFound } from 'next/navigation';
import { findByShareToken } from '@/lib/store';
import { listUsers } from '@/lib/auth';
import { phaseByWeek, groupOfWeek, progressOfWeek } from '@/lib/phases';
import Logo from '@/components/Logo';
import ShareNav from '@/components/ShareNav';

export const dynamic = 'force-dynamic';

const WEEKDAY = ['日', '月', '火', '水', '木', '金', '土'];

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WEEKDAY[d.getDay()]}）`;
}

/**
 * 施主ページの共通の枠。
 *
 * 左は「変わらない情報」（物件・進行・メンバー）で、どのページでも同じ。
 * 右だけがページごとに変わる。工事は3か月以上かかるので、
 * いまどこにいるのかが常に目に入るようにしておく。
 */
export default async function ShareLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const project = findByShareToken(token);
  if (!project) notFound();

  const publicFile = (...names: string[]) =>
    names.map((n) => (fs.existsSync(path.join(process.cwd(), 'public', n)) ? `/${n}` : null)).find(Boolean) ??
    null;
  const storySrc = publicFile('renovation-story.jpg', 'renovation-story.png');

  const property = project.property;

  // メンバーの顔写真は、現場に個別登録したものを優先する。
  // 無ければ、この現場に参加している登録ユーザーから同名の人を探して使う。
  const accounts = listUsers().filter((u) =>
    [project.ownerId, ...(project.memberUserIds ?? [])].includes(u.id)
  );
  const norm = (s: string) => s.replace(/\s/g, '');
  const members = (project.members ?? []).map((m) => {
    const same = accounts.filter((u) => norm(u.name) === norm(m.name));
    return { ...m, avatar: m.avatar ?? same.find((u) => u.avatar)?.avatar };
  });

  const week = project.phaseWeek ?? null;
  const phase = phaseByWeek(week ?? undefined);
  const currentGroup = groupOfWeek(week);
  const progress = progressOfWeek(week);

  const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
  const heading = 'text-[12px] font-bold tracking-[0.15em] text-slate-400';

  return (
    <main className="min-h-screen bg-[#FAF9F7] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-[#FAF9F7]/90 backdrop-blur">
        <div className="relative mx-auto flex w-full max-w-[1320px] items-center gap-4 px-5 py-3.5">
          {/* 施主が毎回開くページなので、ここにKIMARIの名前を出す */}
          <Logo size="md" />
          <span className="hidden truncate text-[13px] text-slate-500 sm:block">{project.name}</span>
          <ShareNav token={token} />
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1320px] gap-6 px-5 py-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* 左は固定するが、中身が画面より高いときは左だけで縦に流す */}
        <aside className="scroll-clean space-y-4 lg:sticky lg:top-[64px] lg:max-h-[calc(100vh-80px)] lg:self-start lg:overflow-y-auto">
          {storySrc && (
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={storySrc} alt="" className="block w-full" />
              {/* 文字は画像に焼き込まず重ねる。画面幅で大きさが変わり、
                  文言を変えても画像を作り直さずに済む */}
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/65 via-black/15 to-transparent p-4">
                <p className="text-[9px] font-bold tracking-[0.25em] text-white/75">PROJECT</p>
                <p className="text-[17px] font-bold leading-tight text-white">Renovation Story</p>
              </div>
            </div>
          )}

          <div className={card}>
            <h1 className="text-[19px] font-bold leading-snug">{project.name}</h1>
            {property?.address && (
              <p className="mt-1.5 text-[13px] text-slate-500">{property.address}</p>
            )}
            {(property?.area || property?.structure || property?.age) && (
              <dl className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-[13px]">
                {(
                  [
                    ['専有面積', property?.area],
                    ['構造', property?.structure],
                    ['築年数', property?.age],
                  ] as const
                )
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} className="flex gap-3">
                      <dt className="w-[60px] shrink-0 text-slate-400">{k}</dt>
                      <dd className="text-slate-700">{v}</dd>
                    </div>
                  ))}
              </dl>
            )}
          </div>

          {progress !== null && (
            <div className={card}>
              <h2 className={heading}>プロジェクトの進行状況</h2>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-[38px] font-bold leading-none">{progress}</span>
                <span className="pb-1 text-[15px] font-bold">%</span>
                {currentGroup && (
                  <span className="pb-1.5 text-[13px] text-slate-500">{currentGroup.label}</span>
                )}
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-[#8B9A5B]" style={{ width: `${progress}%` }} />
              </div>
              {phase && (
                <p className="mt-3 text-[13px] leading-relaxed text-slate-600">{phase.ownerDetail}</p>
              )}
              {property?.completionDate && (
                <p className="mt-2 border-t border-slate-100 pt-2 text-[12px] text-slate-400">
                  竣工予定日：{formatDate(property.completionDate)}
                </p>
              )}
            </div>
          )}

          {members.length > 0 && (
            <div className={card}>
              <h2 className={heading}>プロジェクトメンバー</h2>
              <ul className="mt-3 space-y-2.5">
                {members.map((m, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    {m.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatar} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[12px] font-bold text-slate-500">
                        {m.name.slice(0, 1)}
                      </span>
                    )}
                    <span className="text-[14px] font-bold">{m.name}</span>
                    <span className="text-[12px] text-slate-400">{m.role}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        <div className="min-w-0 space-y-8">{children}</div>
      </div>
    </main>
  );
}
