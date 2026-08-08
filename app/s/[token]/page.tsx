import { notFound } from 'next/navigation';
import { findByShareToken } from '@/lib/store';

export const dynamic = 'force-dynamic';

/**
 * 施主・職人が見る読み取り専用ページ。
 * ログイン不要。金額・原価・技術情報は出さない。
 */
export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = findByShareToken(token);
  if (!found) notFound();

  const { project, meeting } = found;
  const docs = meeting.documents ?? {};

  const sections = [
    { title: 'この打ち合わせの確認書', body: docs.owner },
    { title: '作業指示', body: docs.worker },
    docs.workerTranslated
      ? { title: `作業指示（${docs.lang ?? '翻訳'}）`, body: docs.workerTranslated }
      : null,
  ].filter((s): s is { title: string; body: string } => Boolean(s && s.body));

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto w-full max-w-[560px] px-5 py-8">
        <header className="mb-6">
          <p className="text-[12px] font-bold text-slate-500">{meeting.date} の打ち合わせ</p>
          <h1 className="mt-1 text-[24px] font-bold leading-snug">{project.name}</h1>
        </header>

        {sections.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-[14px] text-slate-500">
            まだ共有できる書類がありません。
          </p>
        )}

        <div className="space-y-6">
          {sections.map((s) => (
            <section key={s.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-[15px] font-bold">{s.title}</h2>
              <pre className="whitespace-pre-wrap text-[14px] leading-[1.95]">{s.body}</pre>
            </section>
          ))}
        </div>

        <p className="mt-8 text-center text-[12px] text-slate-400">
          内容に相違があれば、担当者までご連絡ください。
        </p>
      </div>
    </main>
  );
}
