import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session';
import { listProjects } from '@/lib/store';
import { getCompany } from '@/lib/companies';
import ProjectList from '@/components/ProjectList';
import { IS_DEMO } from '@/lib/demo';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const me = await currentUser();
  if (!me) redirect('/login');
  // 一覧はサーバー側で描画して渡す。JSが動かない端末でも表示される
  // デモは所属で絞らない。置いてある現場をそのまま見せる
  const projects = listProjects(IS_DEMO ? undefined : me.id);
  const companyCode = getCompany(me.companyId)?.inviteCode;
  return (
    <ProjectList
      me={me}
      initialProjects={projects}
      companyCode={companyCode}
      isDemo={IS_DEMO}
    />
  );
}
