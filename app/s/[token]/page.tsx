import fs from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findByShareToken } from '@/lib/store';
import { PHASE_GROUPS, STORY_STEPS, groupOfWeek } from '@/lib/phases';
import type { Item } from '@/app/api/analyze/route';
import FeedbackForm from '@/components/FeedbackForm';
import PhaseIcon from '@/components/PhaseIcon';
import Logo from '@/components/Logo';
import Zoomable from '@/components/Zoomable';

export const dynamic = 'force-dynamic';

const WEEKDAY = ['日', '月', '火', '水', '木', '金', '土'];

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WEEKDAY[d.getDay()]}）`;
}

function formatShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 施主ページのホーム。
 *
 * 「いま何が新しくなったか」→「これまでの流れ」→「一回ごとの記録」の順。
 * 上から下へ、粗いものから細かいものへ降りていく。
 *
 * - 「認識のズレ（risk）」は社内用なので出さない
 * - 原価・モデル名などの技術情報も出さない
 */
export default async function ShareHome({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = findByShareToken(token);
  if (!project) notFound();

  // 公開したものだけを出す。仕分けただけの回や、試しに流した分は施主に見せない
  const meetings = project.meetings
    .filter((m) => m.published)
    .sort((a, b) => b.date.localeCompare(a.date));
  const total = meetings.length;
  const files = project.files ?? [];
  const photos = files.filter((f) => f.mime.startsWith('image/'));

  const hero = project.heroFileId ? (photos.find((f) => f.id === project.heroFileId) ?? null) : null;
  const heroSrc = hero
    ? `/api/share/${token}/files/${hero.stored}`
    : fs.existsSync(path.join(process.cwd(), 'public', 'hero-default.jpg'))
      ? '/hero-default.jpg'
      : null;

  const week = project.phaseWeek ?? null;
  const currentGroup = groupOfWeek(week);

  const pick = (items: Item[], c: Item['category']) => items.filter((i) => i.category === c);

  /** 打ち合わせに紐づく写真。無指定の写真は最新の回に出す */
  const photosFor = (meetingId: string, isLatest: boolean) =>
    photos.filter((f) => (f.meetingId ? f.meetingId === meetingId : isLatest));

  /** 歩みの絵。public/story/ に置かれていれば使う。無ければアイコンで出す */
  const storyImages: Record<string, string | null> = Object.fromEntries(
    STORY_STEPS.map((s) => [
      s.no,
      fs.existsSync(path.join(process.cwd(), 'public', s.image.slice(1))) ? s.image : null,
    ])
  );

  const property = project.property;

  type Update = {
    kind: string;
    at: string;
    title: string;
    body: string;
    href: string;
    action: string;
    thumb?: string;
  };

  const byKind = (kind: string) => files.filter((f) => f.kind === kind);
  const latestOf = (list: typeof files) =>
    [...list].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))[0] ?? null;

  const updates: Update[] = [
    ...meetings.slice(0, 2).map((m, idx) => ({
      kind: '打ち合わせ記録',
      at: m.date,
      title: `第${total - idx}回 打ち合わせ`,
      body:
        m.summary ||
        `決定 ${pick(m.items, 'decision_no_cost').length}件・追加のお見積り ${pick(m.items, 'cost_impact').length}件`,
      href: `#m-${m.id}`,
      action: '内容を確認',
      thumb: photosFor(m.id, idx === 0)[0]
        ? `/api/share/${token}/files/${photosFor(m.id, idx === 0)[0].stored}`
        : undefined,
    })),
    ...(['図面', 'パース', '見積', '写真'] as const).flatMap<Update>((kind) => {
      const list = byKind(kind);
      const latest = latestOf(list);
      if (!latest) return [];
      const label =
        kind === '図面'
          ? '図面更新'
          : kind === 'パース'
            ? 'パース更新'
            : kind === '見積'
              ? 'お見積り更新'
              : '現場レポート';
      return [
        {
          kind: label,
          at: latest.uploadedAt.slice(0, 10),
          title:
            kind === '写真' ? '現場の様子を追加しました' : `${kind}を更新しました（${list.length}件）`,
          body: latest.caption || `最新の${kind}をご覧いただけます。`,
          href: `/s/${token}/files`,
          action: kind === '写真' ? '写真を見る' : `${kind}を確認`,
          thumb: latest.mime.startsWith('image/')
            ? `/api/share/${token}/files/${latest.stored}`
            : undefined,
        },
      ];
    }),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 4);

  const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';

  return (
    <>
      {/* ヒーロー＋5つの節目 */}
      <section id="top" className="relative overflow-hidden rounded-2xl bg-slate-800">
        {heroSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/15 to-transparent" />

        <div className="relative grid gap-6 p-5 sm:p-9 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0 text-white">
            <p className="text-[11px] font-bold tracking-[0.2em] text-white/70">PROJECT STORY</p>
            <h2 className="mt-2 text-[24px] font-bold leading-snug sm:text-[30px]">
              一緒につくる、理想の暮らし
            </h2>
            <p className="mt-3 max-w-[380px] text-[14px] leading-[1.9] text-white/85">
              初回の打ち合わせから、完成までの過程をこのページでご覧いただけます。
              打ち合わせのたびに、記録がここへ積み上がっていきます。
            </p>
          </div>

          {/* 5つの節目。狭い画面では中で横に流す（ページ全体を広げない） */}
          <ol className="scroll-clean -mx-1 flex min-w-0 items-start gap-1 overflow-x-auto px-1 pb-1 sm:gap-2 lg:overflow-visible lg:pb-0">
            {PHASE_GROUPS.map((g, i) => {
              const done = week !== null && Math.max(...g.weeks) < week;
              const now = currentGroup?.no === g.no;
              return (
                <li key={g.no} className="flex items-start">
                  <div className="w-[58px] text-center sm:w-[74px]">
                    <span
                      className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full border sm:h-14 sm:w-14 ${
                        now
                          ? 'border-white bg-white text-slate-900'
                          : done
                            ? 'border-white bg-black/35 text-white'
                            : 'border-white/60 bg-black/25 text-white/80'
                      }`}
                    >
                      <PhaseIcon icon={g.icon} className="h-5 w-5 sm:h-6 sm:w-6" />
                    </span>
                    {/* 写真の上なので、薄くすると読めなくなる。影で沈めて白のまま残す */}
                    <p
                      className={`mt-1.5 text-[10px] font-bold ${now ? 'text-white' : 'text-white/80'}`}
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}
                    >
                      {g.no}
                    </p>
                    <p
                      className={`text-[10px] leading-tight sm:text-[11px] ${
                        now ? 'font-bold text-white' : 'text-white/90'
                      }`}
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                    >
                      {g.label}
                    </p>
                  </div>
                  {i < PHASE_GROUPS.length - 1 && (
                    <span
                      className={`mt-5 h-px w-2 sm:mt-7 sm:w-3 ${done ? 'bg-white/60' : 'bg-white/20'}`}
                      aria-hidden
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* 最新のアップデート */}
      {updates.length > 0 && (
        <section id="updates" className="scroll-mt-24">
          <h2 className="mb-3 text-[19px] font-bold">最新のアップデート</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {updates.map((u, i) => (
              <article key={i} className={`${card} flex gap-3`}>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-slate-400">{u.kind}</p>
                  <p className="text-[11px] text-slate-400">{formatShort(u.at)}</p>
                  <h3 className="mt-2 text-[15px] font-bold leading-snug">{u.title}</h3>
                  <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-slate-600">
                    {u.body}
                  </p>
                  <a
                    href={u.href}
                    className="mt-3 inline-block rounded-lg border border-slate-300 px-3 py-1.5 text-[12px] font-bold"
                  >
                    {u.action}
                  </a>
                </div>
                {u.thumb && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={u.thumb}
                    alt=""
                    className="h-[68px] w-[68px] shrink-0 self-start rounded-lg object-cover"
                  />
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* プロジェクトの歩み。眺めるもの。
          回数で増やさず最初から6枚出す。全体像が見えているほうが先を見通せる */}
      <section id="story" className="scroll-mt-24">
        <h2 className="mb-3 text-[19px] font-bold">プロジェクトの歩み</h2>
        {/* 横に流すと、右の2枚が隠れて「これから何があるか」が伝わらない。
            6枚とも一度に見えるように折り返す */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {STORY_STEPS.map((s, i) => {
            const next = STORY_STEPS[i + 1];
            const reached = week !== null && week >= s.fromWeek;
            const now = reached && (!next || week === null || week < next.fromWeek);
            const image = storyImages[s.no];

            return (
              <div
                key={s.no}
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
                  now ? 'border-slate-900' : 'border-slate-200'
                } ${reached ? '' : 'opacity-45 grayscale'}`}
              >
                <div className="flex items-baseline gap-2 px-4 pt-3.5">
                  <span className="text-[15px] font-bold text-slate-400">{s.no}</span>
                  <span className="text-[14px] font-bold">{s.label}</span>
                </div>
                <p className="flex items-center gap-2 px-4 pb-2 pt-0.5 text-[11px]">
                  {now ? (
                    <span className="rounded-full bg-slate-900 px-2 py-0.5 font-bold text-white">
                      いまここ
                    </span>
                  ) : reached ? (
                    <span className="text-emerald-700">完了</span>
                  ) : (
                    <span className="text-slate-400">これから</span>
                  )}
                  {s.no === '06' && property?.completionDate && (
                    <span className="text-slate-400">{formatShort(property.completionDate)} 予定</span>
                  )}
                </p>
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt="" className="h-[130px] w-full object-cover" />
                ) : (
                  <div className="flex h-[130px] w-full items-center justify-center bg-slate-100 text-slate-300">
                    <PhaseIcon icon={s.icon} className="h-9 w-9" />
                  </div>
                )}
                <p className="p-4 text-[12px] leading-relaxed text-slate-600">{s.detail}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 打ち合わせの記録。読むもの */}
      <section id="log" className="scroll-mt-24">
        <h2 className="mb-4 text-[19px] font-bold">
          打ち合わせの記録{total > 0 && `（${total}回）`}
        </h2>

        {total === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-[14px] text-slate-500">
            まだ記録がありません。最初の打ち合わせのあと、ここに積み上がっていきます。
          </p>
        )}

        <div className="relative">
          {total > 0 && (
            <span className="absolute left-[7px] top-3 bottom-3 w-px bg-slate-200" aria-hidden />
          )}

          <div className="space-y-8">
            {meetings.map((m, idx) => {
              const no = total - idx;
              const decided = pick(m.items, 'decision_no_cost');
              const costs = pick(m.items, 'cost_impact');
              const pendings = pick(m.items, 'pending');
              const shots = photosFor(m.id, idx === 0);

              return (
                <article key={m.id} id={`m-${m.id}`} className="relative scroll-mt-24 pl-8">
                  <span className="absolute left-0 top-2 h-[15px] w-[15px] rounded-full border-[3px] border-[#FAF9F7] bg-slate-900" />

                  <p className="text-[13px] font-bold text-slate-400">第{no}回</p>
                  <h3 className="mt-0.5 text-[19px] font-bold">{formatDate(m.date)}</h3>

                  <div className={`mt-4 space-y-4 ${card}`}>
                    {shots.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {shots.slice(0, 4).map((f) => (
                          <Zoomable
                            key={f.stored}
                            src={`/api/share/${token}/files/${f.stored}`}
                            alt={f.caption || '打ち合わせの写真'}
                            caption={f.caption}
                            className="h-24 w-full rounded-lg object-cover"
                          />
                        ))}
                      </div>
                    )}

                    {decided.length > 0 && (
                      <section>
                        <h4 className="text-[13px] font-bold text-emerald-700">決まったこと</h4>
                        <ul className="mt-2 space-y-2">
                          {decided.map((i, k) => (
                            <li key={k} className="flex gap-2.5 text-[15px] leading-[1.8]">
                              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                              <span>{i.detail || i.title}</span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {costs.length > 0 && (
                      <section className="rounded-xl bg-rose-50 p-4">
                        <h4 className="text-[13px] font-bold text-rose-800">
                          追加のお見積りとなるもの
                        </h4>
                        <ul className="mt-2 space-y-3">
                          {costs.map((i, k) => (
                            <li key={k} className="text-[15px] leading-[1.8]">
                              <p className="font-bold">{i.title}</p>
                              {i.reason && (
                                <p className="mt-0.5 text-[13px] leading-[1.8] text-rose-900/80">
                                  {i.reason}
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-3 text-[12px] text-rose-900/70">
                          金額は別途お見積書でご提示いたします
                        </p>
                      </section>
                    )}

                    {pendings.length > 0 && (
                      <section>
                        <h4 className="text-[13px] font-bold text-amber-700">次回までに</h4>
                        <ul className="mt-2 space-y-2">
                          {pendings.map((i, k) => (
                            <li
                              key={k}
                              className="flex flex-wrap items-baseline gap-2 text-[15px] leading-[1.8]"
                            >
                              <span className="flex gap-2.5">
                                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                                {i.detail || i.title}
                              </span>
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                                {i.owner === '施主' ? 'お客様' : '当社'}
                                {i.due_date
                                  ? ` ・ ${i.due_date}`
                                  : i.due_text
                                    ? ` ・ ${i.due_text}`
                                    : ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {decided.length + costs.length + pendings.length === 0 && (
                      <p className="text-[14px] text-slate-500">この回の記録はまだ整理中です。</p>
                    )}

                    <FeedbackForm
                      token={token}
                      meetingId={m.id}
                      sentCount={(m.feedbacks ?? []).length}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 pt-6 text-center">
        <Logo size="sm" />
        <p className="mt-3 text-[12px] leading-relaxed text-slate-400">
          内容に相違がありましたら、
          <Link href={`/s/${token}/contact`} className="underline">
            こちらからご連絡
          </Link>
          ください。
          <br />
          このページは打ち合わせのたびに更新されます。
        </p>
      </footer>
    </>
  );
}
