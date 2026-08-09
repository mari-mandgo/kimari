import fs from 'node:fs';
import path from 'node:path';
import { notFound } from 'next/navigation';
import { findByShareToken } from '@/lib/store';
import type { Item } from '@/app/api/analyze/route';
import FeedbackForm from '@/components/FeedbackForm';
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
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * 施主が見るページ。「◯◯様邸の歴史」が打ち合わせのたびに積み上がっていく。
 *
 * - 更新の手間はゼロ。打ち合わせを記録すれば、ここが勝手に育つ
 * - 「認識のズレ（risk）」は社内用なので出さない
 * - 原価・モデル名などの技術情報も出さない
 */
export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = findByShareToken(token);
  if (!project) notFound();

  const meetings = [...project.meetings].sort((a, b) => b.date.localeCompare(a.date));
  const total = meetings.length;
  const files = project.files ?? [];
  const photos = files.filter((f) => f.mime !== 'application/pdf');

  // 表紙は明示的に選ばれた写真だけを使う。現場写真は縦横も内容もまちまちで、
  // 自動で選ぶと表紙として成立しないため。未選択なら全現場共通の画像を出す。
  const hero = project.heroFileId ? (photos.find((f) => f.id === project.heroFileId) ?? null) : null;
  const defaultHero = fs.existsSync(path.join(process.cwd(), 'public', 'hero-default.jpg'))
    ? '/hero-default.jpg'
    : null;

  const stages = project.stages ?? [];
  const doneCount = stages.filter((s) => s.done).length;
  const property = project.property;
  const members = project.members ?? [];

  const pick = (items: Item[], c: Item['category']) => items.filter((i) => i.category === c);

  /** 打ち合わせに紐づく写真。無指定の写真は最新の回に出す */
  const photosFor = (meetingId: string, isLatest: boolean) =>
    photos.filter((f) => (f.meetingId ? f.meetingId === meetingId : isLatest));

  return (
    <main className="min-h-screen bg-[#FAF9F7] text-slate-900">
      {/* ヒーロー */}
      <header className="relative">
        {hero || defaultHero ? (
          <div className="relative h-[300px] w-full overflow-hidden sm:h-[420px]">
            {hero ? (
              <Zoomable
                src={`/api/share/${token}/files/${hero.stored}`}
                alt={hero.caption || '現場の写真'}
                caption={hero.caption}
                className="h-[300px] w-full object-cover sm:h-[420px]"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={defaultHero as string}
                alt=""
                className="h-full w-full object-cover"
              />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-black/5" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto w-full max-w-[640px] px-5 pb-6">
              <p className="text-[11px] font-bold tracking-[0.2em] text-white/80">
                PROJECT STORY
              </p>
              <h1 className="mt-1 text-[26px] font-bold leading-snug text-white sm:text-[30px]">
                {project.name}
              </h1>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-[640px] px-5 pt-10">
            <p className="text-[11px] font-bold tracking-[0.2em] text-slate-400">PROJECT STORY</p>
            <h1 className="mt-1 text-[26px] font-bold leading-snug sm:text-[30px]">
              {project.name}
            </h1>
          </div>
        )}
      </header>

      <div className="mx-auto w-full max-w-[640px] px-5 pb-16">
        {/* リード */}
        <section className="mt-6">
          <p className="text-[15px] leading-[2] text-slate-600">
            打ち合わせから完成までの過程を、このページでご覧いただけます。
            打ち合わせのたびに、記録がここへ積み上がっていきます。
          </p>
        </section>

        {/* いま、ここです */}
        {stages.length > 0 && (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-[13px] font-bold tracking-widest text-slate-400">
              いま、ここです
            </h2>
            <ol className="mt-4 space-y-0">
              {stages.map((s, i) => {
                const isCurrent = !s.done && stages.slice(0, i).every((x) => x.done);
                return (
                  <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < stages.length - 1 && (
                      <span
                        className={`absolute left-[9px] top-5 bottom-0 w-px ${
                          s.done ? 'bg-emerald-400' : 'bg-slate-200'
                        }`}
                        aria-hidden
                      />
                    )}
                    <span
                      className={`relative z-10 mt-0.5 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
                        s.done
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : isCurrent
                            ? 'border-slate-900 bg-white text-slate-900'
                            : 'border-slate-300 bg-white text-slate-300'
                      }`}
                    >
                      {s.done ? '✓' : i + 1}
                    </span>
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span
                        className={`text-[15px] ${
                          isCurrent ? 'font-bold' : s.done ? 'text-slate-700' : 'text-slate-400'
                        }`}
                      >
                        {s.label}
                      </span>
                      {s.date && <span className="text-[12px] text-slate-400">{formatShort(s.date)}</span>}
                      {isCurrent && (
                        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">
                          いまここ
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
            <p className="mt-3 text-[12px] text-slate-400">
              {doneCount} / {stages.length} 段階が完了
              {property?.completionDate && ` ・ 竣工予定 ${formatDate(property.completionDate)}`}
            </p>
          </section>
        )}

        {/* 物件情報とメンバー */}
        {(property?.address || members.length > 0) && (
          <section className="mt-4 grid gap-4 sm:grid-cols-2">
            {property?.address && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-[13px] font-bold tracking-widest text-slate-400">物件情報</h2>
                <dl className="mt-3 space-y-1.5 text-[14px]">
                  {(
                    [
                      ['所在地', property.address],
                      ['専有面積', property.area],
                      ['構造', property.structure],
                      ['築年数', property.age],
                    ] as const
                  )
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k} className="flex gap-3">
                        <dt className="w-[72px] shrink-0 text-slate-400">{k}</dt>
                        <dd className="text-slate-700">{v}</dd>
                      </div>
                    ))}
                </dl>
              </div>
            )}
            {members.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-[13px] font-bold tracking-widest text-slate-400">
                  プロジェクトメンバー
                </h2>
                <ul className="mt-3 space-y-1.5 text-[14px]">
                  {members.map((m, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="w-[72px] shrink-0 text-slate-400">{m.role}</span>
                      <span className="text-slate-700">{m.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* 資料・図面 */}
        {files.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-[13px] font-bold tracking-widest text-slate-400">
              資料・図面・写真
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {files.map((f) => (
                <figure key={f.stored} className="overflow-hidden rounded-xl bg-white shadow-sm">
                  {f.mime === 'application/pdf' ? (
                    <a
                      href={`/api/share/${token}/files/${f.stored}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-28 items-center justify-center bg-slate-100 text-[12px] font-bold text-slate-600"
                    >
                      PDFを開く
                    </a>
                  ) : (
                    <Zoomable
                      src={`/api/share/${token}/files/${f.stored}`}
                      alt={f.caption || f.kind}
                      caption={f.caption}
                      className="h-28 w-full object-cover"
                    />
                  )}
                  <figcaption className="p-2">
                    <span className="text-[10px] font-bold text-slate-400">{f.kind}</span>
                    <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-slate-700">
                      {f.caption}
                    </p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* 打ち合わせの歩み */}
        <section className="mt-10">
          <h2 className="mb-4 text-[13px] font-bold tracking-widest text-slate-400">
            打ち合わせの歩み{total > 0 && `（${total}回）`}
          </h2>

          {total === 0 && (
            <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-[14px] text-slate-500">
              まだ記録がありません。
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
                  <article key={m.id} className="relative pl-8">
                    <span className="absolute left-0 top-2 h-[15px] w-[15px] rounded-full border-[3px] border-[#FAF9F7] bg-slate-900" />

                    <p className="text-[13px] font-bold text-slate-400">第{no}回</p>
                    <h3 className="mt-0.5 text-[19px] font-bold">{formatDate(m.date)}</h3>

                    <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      {shots.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {shots.slice(0, 4).map((f) => (
                            <div key={f.stored} className="h-24 w-32 shrink-0">
                              <Zoomable
                                src={`/api/share/${token}/files/${f.stored}`}
                                alt={f.caption || '打ち合わせの写真'}
                                caption={f.caption}
                                className="h-24 w-32 rounded-lg object-cover"
                              />
                            </div>
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

        <footer className="mt-14 border-t border-slate-200 pt-6 text-center">
          <Logo size="sm" />
          <p className="mt-3 text-[12px] leading-relaxed text-slate-400">
            内容に相違がありましたら、担当者までご連絡ください。
            <br />
            このページは打ち合わせのたびに更新されます。
          </p>
        </footer>
      </div>
    </main>
  );
}
