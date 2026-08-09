import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session';
import { listProjects } from '@/lib/store';
import ProjectList from '@/components/ProjectList';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const me = await currentUser();
  if (!me) redirect('/login');
  // 一覧はサーバー側で描画して渡す。JSが動かない端末でも表示される
  const projects = listProjects(me.id);
  return <ProjectList me={me} initialProjects={projects} />;
}
