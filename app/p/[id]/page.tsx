import { notFound, redirect } from 'next/navigation';
import { getProject, canAccess } from '@/lib/store';
import { currentUser } from '@/lib/session';
import Workspace from '@/components/Workspace';

export const dynamic = 'force-dynamic';

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await currentUser();
  if (!me) redirect('/login');

  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();
  // 参加していない現場は開けない
  if (!canAccess(project, me.id)) notFound();

  return <Workspace project={project} me={me} />;
}
