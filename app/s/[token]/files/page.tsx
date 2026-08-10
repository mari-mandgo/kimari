import { notFound } from 'next/navigation';
import { findByShareToken } from '@/lib/store';
import FeedbackForm from '@/components/FeedbackForm';
import Zoomable from '@/components/Zoomable';

export const dynamic = 'force-dynamic';

const WEEKDAY = ['日', '月', '火', '水', '木', '金', '土'];

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WEEKDAY[d.getDay()]}）`;
}

/**
 * 資料・写真。
 *
 * 打ち合わせごと（無ければ登録日ごと）にまとめる。
 * 「いつの図面か」「いつの現場写真か」が分からないと、施主は前後を追えない。
 *
 * 1件ずつ質問できるようにしてあるのは、
 * 「この図面のここ」という聞き方が実際に一番多いため。
 */
export default async function SharedFiles({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = findByShareToken(token);
  if (!project) notFound();

  const files = project.files ?? [];
  const published = project.meetings.filter((m) => m.published);

  // 打ち合わせに紐づくもの → その回。紐づかないもの → 登録日でまとめる
  const groups = new Map<
    string,
    { key: string; label: string; sub: string; date: string; meetingId?: string; files: typeof files }
  >();

  for (const f of files) {
    const meeting = f.meetingId ? published.find((m) => m.id === f.meetingId) : null;
    const key = meeting ? `m-${meeting.id}` : `d-${f.uploadedAt.slice(0, 10)}`;
    if (!groups.has(key)) {
      const no = meeting
        ? [...published].sort((a, b) => a.date.localeCompare(b.date)).findIndex((m) => m.id === meeting.id) + 1
        : 0;
      // 打ち合わせ外の資料は日ごとに分かれるので、見出しにも日付を出す。
      // 「追加の資料」が同じ名前で並ぶと、どれが新しいのか分からなくなる
      groups.set(key, {
        key,
        label: meeting ? `第${no}回 打ち合わせ` : '追加の資料',
        sub: formatDate(meeting ? meeting.date : f.uploadedAt.slice(0, 10)) + (meeting ? '' : ' に追加'),
        date: meeting ? meeting.date : f.uploadedAt.slice(0, 10),
        meetingId: meeting?.id,
        files: [],
      });
    }
    groups.get(key)!.files.push(f);
  }

  const sorted = [...groups.values()].sort((a, b) => b.date.localeCompare(a.date));
  /** 質問の宛先。回に紐づかない資料は、最新の回にぶら下げる */
  const latestMeetingId = published.sort((a, b) => b.date.localeCompare(a.date))[0]?.id;

  // 画像を枠いっぱいに出すので、余白は figcaption の側で持つ。
  // 余白ありの card に p-0 を重ねると、指定の順ではなくCSSの並び順で決まって効かない
  const tile = 'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm';

  return (
    <>
      <section>
        <h2 className="text-[22px] font-bold">資料・図面・写真</h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-slate-600">
          打ち合わせごとにまとめています。画像は押すと大きくなります。
          気になるところは、それぞれの下からご質問いただけます。
        </p>
      </section>

      {files.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-[14px] text-slate-500">
          まだ資料がありません。
        </p>
      )}

      {sorted.map((g) => (
        <section key={g.key} id={g.key} className="scroll-mt-24">
          <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
            <h3 className="text-[17px] font-bold">{g.label}</h3>
            <span className="text-[13px] text-slate-500">{g.sub}</span>
            <span className="text-[13px] text-slate-400">{g.files.length}件</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {g.files.map((f) => (
              <figure key={f.stored} className={`flex flex-col ${tile}`}>
                {/* 画像以外（PDF・Excel）は開くだけにする。画像として描けないため */}
                {!f.mime.startsWith('image/') ? (
                  <a
                    href={`/api/share/${token}/files/${f.stored}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-40 items-center justify-center rounded-t-2xl bg-slate-100 text-[13px] font-bold text-slate-600"
                  >
                    {f.mime === 'application/pdf' ? 'PDFを開く' : 'ファイルを開く'}
                  </a>
                ) : (
                  <Zoomable
                    src={`/api/share/${token}/files/${f.stored}`}
                    alt={f.caption || f.kind}
                    caption={f.caption}
                    className="h-40 w-full rounded-t-2xl object-cover"
                  />
                )}
                {/* 質問ボタンをカードの下端に揃える。写真の説明の長さで位置がずれないように */}
                <figcaption className="flex flex-1 flex-col p-4">
                  <span className="self-start rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                    {f.kind}
                  </span>
                  {f.caption && (
                    <p className="mt-2 text-[13px] leading-relaxed text-slate-700">{f.caption}</p>
                  )}
                  {(g.meetingId || latestMeetingId) && (
                    <div className="mt-auto pt-3">
                      <FeedbackForm
                        token={token}
                        meetingId={(g.meetingId ?? latestMeetingId) as string}
                        sentCount={0}
                        variant="file"
                        about={f.caption || f.original}
                      />
                    </div>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
