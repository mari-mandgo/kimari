import { notFound } from 'next/navigation';
import { findByShareToken } from '@/lib/store';
import type { Item } from '@/app/api/analyze/route';

export const dynamic = 'force-dynamic';

const WEEKDAY = ['日', '月', '火', '水', '木', '金', '土'];

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WEEKDAY[d.getDay()]}）`;
}

/**
 * 施主が見るページ。打ち合わせが増えるたびに、下へ積み上がっていく。
 *
 * 「認識のズレ（risk）」は社内で確認するためのものなので、ここには出さない。
 * 施主に「あなたと認識が食い違っています」と突きつける画面にはしない。
 */
export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = findByShareToken(token);
  if (!project) notFound();

  const meetings = [...project.meetings].sort((a, b) => b.date.localeCompare(a.date));
  const total = meetings.length;

  const pick = (items: Item[], c: Item['category']) => items.filter((i) => i.category === c);

  return (
    <main className="min-h-screen bg-[#FAF9F7] text-slate-900">
      <div className="mx-auto w-full max-w-[600px] px-5 py-10">
        <header className="mb-9">
          <p className="text-[12px] font-bold tracking-widest text-slate-400">打ち合わせの記録</p>
          <h1 className="mt-2 text-[26px] font-bold leading-snug">{project.name}</h1>
          <p className="mt-2 text-[14px] text-slate-500">
            これまでの打ち合わせ {total} 回分をまとめています
          </p>
        </header>

        {total === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-[14px] text-slate-500">
            まだ記録がありません。
          </p>
        )}

        <div className="relative">
          {/* 縦のライン */}
          {total > 0 && (
            <span className="absolute left-[7px] top-3 bottom-3 w-px bg-slate-200" aria-hidden />
          )}

          <div className="space-y-8">
            {meetings.map((m, idx) => {
              const no = total - idx;
              const decided = pick(m.items, 'decision_no_cost');
              const costs = pick(m.items, 'cost_impact');
              const pendings = pick(m.items, 'pending');

              return (
                <article key={m.id} className="relative pl-8">
                  <span className="absolute left-0 top-2 h-[15px] w-[15px] rounded-full border-[3px] border-[#FAF9F7] bg-slate-900" />

                  <p className="text-[13px] font-bold text-slate-400">第{no}回</p>
                  <h2 className="mt-0.5 text-[19px] font-bold">{formatDate(m.date)}</h2>

                  <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    {decided.length > 0 && (
                      <section>
                        <h3 className="text-[13px] font-bold text-emerald-700">決まったこと</h3>
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
                        <h3 className="text-[13px] font-bold text-rose-800">
                          追加のお見積りとなるもの
                        </h3>
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
                        <h3 className="text-[13px] font-bold text-amber-700">次回までに</h3>
                        <ul className="mt-2 space-y-2">
                          {pendings.map((i, k) => (
                            <li key={k} className="flex flex-wrap items-baseline gap-2 text-[15px] leading-[1.8]">
                              <span className="flex gap-2.5">
                                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                                {i.detail || i.title}
                              </span>
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                                {i.owner === '施主' ? 'お客様' : '当社'}
                                {i.due_date ? ` ・ ${i.due_date}` : i.due_text ? ` ・ ${i.due_text}` : ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {decided.length + costs.length + pendings.length === 0 && (
                      <p className="text-[14px] text-slate-500">この回の記録はまだ整理中です。</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <p className="mt-12 text-center text-[12px] leading-relaxed text-slate-400">
          内容に相違がありましたら、担当者までご連絡ください。
          <br />
          このページは打ち合わせのたびに更新されます。
        </p>
      </div>
    </main>
  );
}
