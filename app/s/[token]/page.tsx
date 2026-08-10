import fs from 'node:fs';
import path from 'node:path';
import { notFound } from 'next/navigation';
import { findByShareToken } from '@/lib/store';
import { listUsers } from '@/lib/auth';
import { PHASE_GROUPS, groupOfWeek, progressOfWeek, phaseByWeek } from '@/lib/phases';
import type { Item } from '@/app/api/analyze/route';
import FeedbackForm from '@/components/FeedbackForm';
import PhaseIcon from '@/components/PhaseIcon';
import ShareNav from '@/components/ShareNav';
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
 * 施主が見るページ。「◯◯様邸の歴史」が打ち合わせのたびに積み上がっていく。
 *
 * 左は変わらない情報（物件・進行・メンバー・連絡先）、右は増えていく情報。
 * 工事は3か月以上かかるので、施主の関心は「いまどこで、次に何があるか」に集まる。
 * それを常に目に入る左側に固定し、右側で経過を追えるようにしている。
 *
 * - 更新の手間はゼロ。打ち合わせを記録すれば、ここが勝手に育つ
 * - 「認識のズレ（risk）」は社内用なので出さない
 * - 原価・モデル名などの技術情報も出さない
 */
export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = findByShareToken(token);
  if (!project) notFound();

  // 公開したものだけを出す。仕分けただけの回や、試しに流した分は施主に見せない
  const meetings = project.meetings
    .filter((m) => m.published)
    .sort((a, b) => b.date.localeCompare(a.date));
  const total = meetings.length;
  const files = project.files ?? [];
  const photos = files.filter((f) => f.mime !== 'application/pdf');

  // 表紙は明示的に選ばれた写真だけを使う。現場写真は縦横も内容もまちまちで、
  // 自動で選ぶと表紙として成立しないため。未選択なら全現場共通の画像を出す。
  const hero = project.heroFileId ? (photos.find((f) => f.id === project.heroFileId) ?? null) : null;
  /** 拡張子は問わない。差し替えのたびにコードを直さなくてよいように */
  const publicFile = (...names: string[]) =>
    names.map((n) => (fs.existsSync(path.join(process.cwd(), 'public', n)) ? `/${n}` : null)).find(Boolean) ??
    null;

  const heroSrc = hero
    ? `/api/share/${token}/files/${hero.stored}`
    : publicFile('hero-default.jpg', 'hero-default.png');
  /** 左上に置くこのページ自体の見出し画像。現場によらず共通 */
  const storySrc = publicFile('renovation-story.jpg', 'renovation-story.png');

  const property = project.property;

  // メンバーの顔写真は、現場に個別登録したものを優先する。
  // 無ければ、この現場に参加している登録ユーザーから同名の人を探して使う。
  // すでにアカウントに写真があるのに、現場ごとに入れ直させたくないため。
  const accounts = listUsers().filter((u) =>
    [project.ownerId, ...(project.memberUserIds ?? [])].includes(u.id)
  );
  const norm = (s: string) => s.replace(/\s/g, '');
  const members = (project.members ?? []).map((m) => {
    // 同名のアカウントが複数あることがあるので、写真を持っているほうを優先する
    const same = accounts.filter((u) => norm(u.name) === norm(m.name));
    return { ...m, avatar: m.avatar ?? same.find((u) => u.avatar)?.avatar };
  });

  const week = project.phaseWeek ?? null;
  const phase = phaseByWeek(week ?? undefined);
  const currentGroup = groupOfWeek(week);
  const progress = progressOfWeek(week);

  const pick = (items: Item[], c: Item['category']) => items.filter((i) => i.category === c);

  /** 打ち合わせに紐づく写真。無指定の写真は最新の回に出す */
  const photosFor = (meetingId: string, isLatest: boolean) =>
    photos.filter((f) => (f.meetingId ? f.meetingId === meetingId : isLatest));

  /**
   * 最新のアップデート。打ち合わせ記録と、資料の種別ごとの更新を1本の時系列に混ぜる。
   * 施主にとっては「何が新しくなったか」が関心事で、それが打ち合わせか図面かは後の話。
   */
  type Update = {
    kind: string;
    at: string;
    title: string;
    body: string;
    href: string;
    action: string;
    thumb?: string;
  };

  /** 上に並べる写真カード。古い順に 01,02… と振る */
  const story = [...meetings]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m, i, arr) => ({
      id: m.id,
      date: m.date,
      no: String(i + 1).padStart(2, '0'),
      count: i + 1,
      summary: m.summary,
      photo: photosFor(m.id, i === arr.length - 1)[0] ?? null,
    }));

  const byKind = (kind: string) => files.filter((f) => f.kind === kind);
  const latestOf = (list: typeof files) =>
    [...list].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))[0] ?? null;

  const updates: Update[] = [
    // 打ち合わせで枠を埋めきらない。図面・写真・見積の更新も見えるようにする
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
            kind === '写真'
              ? '現場の様子を追加しました'
              : `${kind}を更新しました（${list.length}件）`,
          body: latest.caption || `最新の${kind}をご覧いただけます。`,
          href: '#files',
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
  const heading = 'text-[12px] font-bold tracking-[0.15em] text-slate-400';

  return (
    <main className="min-h-screen bg-[#FAF9F7] text-slate-900">
      {/* 上部の帯 */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-[#FAF9F7]/90 backdrop-blur">
        <div className="relative mx-auto flex w-full max-w-[1320px] items-center gap-4 px-5 py-3.5">
          {/* 施主が毎回開くページなので、ここにKIMARIの名前を出す */}
          <Logo size="md" />
          <span className="hidden truncate text-[13px] text-slate-500 sm:block">{project.name}</span>
          <ShareNav />
        </div>
      </header>

      <div
        id="top"
        className="mx-auto grid w-full max-w-[1320px] gap-6 px-5 py-6 lg:grid-cols-[300px_minmax(0,1fr)]"
      >
        {/* ── 左：変わらない情報 ───────────────────────── */}
        {/* 左は固定するが、中身が画面より高いときは左だけで縦に流す。
            そうしないと、右を一番下まで送らないと相談窓口に届かない */}
        <aside className="scroll-clean space-y-4 lg:sticky lg:top-[64px] lg:max-h-[calc(100vh-80px)] lg:self-start lg:overflow-y-auto">
          {/*
            左上は現場の写真ではなく、このページ自体の見出し画像を置く。
            右のヒーローと同じ写真を並べても情報が増えないため。
          */}
          {storySrc && (
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {/* 高さを固定すると、幅の広いスマホで上下が切れる。画像の比率のまま出す */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={storySrc} alt="" className="block w-full" />
              {/* 文字は画像に焼き込まず、ここで重ねる。
                  画面幅で大きさが変わり、文言を変えても画像を作り直さずに済む */}
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
                <div
                  className="h-full rounded-full bg-[#8B9A5B]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {phase && (
                <p className="mt-3 text-[13px] leading-relaxed text-slate-600">
                  {phase.ownerDetail}
                </p>
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
                      <img
                        src={m.avatar}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded-full object-cover"
                      />
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

          <div id="contact" className={card}>
            <h2 className="text-[14px] font-bold">ご不明点・ご相談</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
              お気軽にご連絡ください。担当者に届きます。
            </p>
            {meetings[0] ? (
              <div className="mt-3">
                <FeedbackForm
                  token={token}
                  meetingId={meetings[0].id}
                  sentCount={(meetings[0].feedbacks ?? []).length}
                  variant="general"
                />
              </div>
            ) : (
              <p className="mt-3 text-[12px] text-slate-400">
                最初の打ち合わせのあと、ここからご連絡いただけます。
              </p>
            )}
          </div>
        </aside>

        {/* ── 右：増えていく情報 ───────────────────────── */}
        <div className="min-w-0 space-y-8">
          {/* ヒーロー＋5つの節目 */}
          <section className="relative overflow-hidden rounded-2xl bg-slate-800">
            {heroSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
            {/* 文字が乗る左側だけ落とし、右へ抜けるにつれて写真を活かす。
                節目の文字は影で読ませているので、幕はここまで薄くできる */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/15 to-transparent" />

            <div className="relative grid gap-6 p-5 sm:p-9 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="min-w-0 text-white">
                <p className="text-[11px] font-bold tracking-[0.2em] text-white/70">
                  PROJECT STORY
                </p>
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
                        {/* 写真の上なので、薄くすると読めなくなる。
                            済み・これからは影で沈め、文字自体は白のまま残す */}
                        <p
                          className={`mt-1.5 text-[10px] font-bold ${
                            now ? 'text-white' : 'text-white/80'
                          }`}
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
                          className={`mt-5 h-px w-2 sm:mt-7 sm:w-3 ${
                            done ? 'bg-white/60' : 'bg-white/20'
                          }`}
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
            <section id="updates">
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

          {/* 資料・図面 */}
          {files.length > 0 && (
            <section id="files">
              <h2 className="mb-3 text-[19px] font-bold">資料・図面・写真</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {files.map((f) => (
                  <figure key={f.stored} className="overflow-hidden rounded-xl bg-white shadow-sm">
                    {/* 画像以外（PDF・Excel）は開くだけにする。画像として描けないため */}
                    {!f.mime.startsWith('image/') ? (
                      <a
                        href={`/api/share/${token}/files/${f.stored}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-32 items-center justify-center bg-slate-100 text-[12px] font-bold text-slate-600"
                      >
                        {f.mime === 'application/pdf' ? 'PDFを開く' : 'ファイルを開く'}
                      </a>
                    ) : (
                      <Zoomable
                        src={`/api/share/${token}/files/${f.stored}`}
                        alt={f.caption || f.kind}
                        caption={f.caption}
                        className="h-32 w-full object-cover"
                      />
                    )}
                    <figcaption className="p-2.5">
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

          {/* プロジェクトの歩み。写真で一目で追えるようにする。
              下の時系列は読むもの、こちらは眺めるもの */}
          {story.length > 0 && (
            <section id="story">
              <h2 className="mb-3 text-[19px] font-bold">プロジェクトの歩み</h2>
              <div className="scroll-clean -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
                {story.map((s) => (
                  <a
                    key={s.id}
                    href={`#m-${s.id}`}
                    className="w-[220px] shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="flex items-baseline gap-2 px-4 pt-3.5">
                      <span className="text-[15px] font-bold text-slate-400">{s.no}</span>
                      <span className="text-[14px] font-bold">第{s.count}回 打ち合わせ</span>
                    </div>
                    <p className="px-4 pb-2 text-[12px] text-slate-400">{formatShort(s.date)}</p>
                    {s.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/share/${token}/files/${s.photo.stored}`}
                        alt={s.photo.caption || ''}
                        className="h-[130px] w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-[130px] w-full items-center justify-center bg-slate-100 text-[12px] text-slate-400">
                        写真はまだありません
                      </div>
                    )}
                    <p className="line-clamp-3 p-4 text-[12px] leading-relaxed text-slate-600">
                      {s.photo?.caption || s.summary}
                    </p>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* 打ち合わせの記録 */}
          <section id="log">
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
                    <article key={m.id} id={`m-${m.id}`} className="relative scroll-mt-20 pl-8">
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
              内容に相違がありましたら、担当者までご連絡ください。
              <br />
              このページは打ち合わせのたびに更新されます。
            </p>
          </footer>
        </div>
      </div>
    </main>
  );
}
