import { redirect } from 'next/navigation';
import { IS_DEMO, DEMO_PROJECT_ID } from '@/lib/demo';
import { listProjects } from '@/lib/store';

export const dynamic = 'force-dynamic';

/**
 * 公開デモの入口。
 *
 * ログインを挟まずに、置いてある現場をそのまま開く。
 * 見知らぬ人にアカウントを作らせないため（セッションの保存も書き込みなので、
 * そもそもこの環境では成立しない）。
 *
 * デモとして動かしていないときは、ここは何も見せずにトップへ返す。
 */
export default async function DemoEntry() {
  if (!IS_DEMO) redirect('/');

  // 環境変数で指定があればそれを、無ければ置いてある最初の現場を開く
  const id = DEMO_PROJECT_ID || listProjects()[0]?.id;
  if (!id) redirect('/');
  redirect(`/p/${id}`);
}
