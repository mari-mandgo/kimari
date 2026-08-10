import { notFound } from 'next/navigation';
import { findByShareToken } from '@/lib/store';
import FeedbackForm from '@/components/FeedbackForm';

export const dynamic = 'force-dynamic';

/**
 * ご相談。
 *
 * ページの隅に置くと見つけてもらえないので、独立した1ページにする。
 * 工事中は「これ聞いていいのかな」という小さな迷いが溜まる。
 * 送り先が1つに決まっていれば、そこで止まらずに済む。
 */
export default async function SharedContact({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = findByShareToken(token);
  if (!project) notFound();

  const published = project.meetings
    .filter((m) => m.published)
    .sort((a, b) => b.date.localeCompare(a.date));
  const members = (project.members ?? []).filter((m) => m.role !== '施主');

  const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';

  return (
    <>
      <section>
        <h2 className="text-[22px] font-bold">ご相談・お問い合わせ</h2>
        <p className="mt-1.5 text-[14px] leading-[1.9] text-slate-600">
          打ち合わせのことでも、それ以外のことでも構いません。
          写真や資料を添えていただくこともできます。担当者に届きます。
        </p>
      </section>

      <section className={card}>
        {published[0] ? (
          <FeedbackForm
            token={token}
            meetingId={published[0].id}
            sentCount={0}
            variant="general"
            openByDefault
          />
        ) : (
          <p className="text-[14px] text-slate-500">
            最初の打ち合わせのあと、こちらからご連絡いただけるようになります。
          </p>
        )}
      </section>

      {members.length > 0 && (
        <section className={card}>
          <h3 className="text-[15px] font-bold">担当者</h3>
          <ul className="mt-3 space-y-2.5">
            {members.map((m, i) => (
              <li key={i} className="flex items-center gap-2.5">
                {m.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[13px] font-bold text-slate-500">
                    {m.name.slice(0, 1)}
                  </span>
                )}
                <span className="text-[15px] font-bold">{m.name}</span>
                <span className="text-[13px] text-slate-400">{m.role}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={card}>
        <h3 className="text-[15px] font-bold">お急ぎの場合</h3>
        <p className="mt-1.5 text-[13px] leading-[1.9] text-slate-600">
          水漏れなど、すぐに対応が必要なことは、
          お手数ですが担当者へお電話ください。このフォームは順に確認しております。
        </p>
      </section>
    </>
  );
}
