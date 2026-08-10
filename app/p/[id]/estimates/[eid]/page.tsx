import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/lib/session';
import { getProject, canAccess } from '@/lib/store';
import { getCompany } from '@/lib/companies';
import EstimateEditor from '@/components/EstimateEditor';

export const dynamic = 'force-dynamic';

export default async function EstimatePage({
  params,
}: {
  params: Promise<{ id: string; eid: string }>;
}) {
  const { id, eid } = await params;
  const me = await currentUser();
  if (!me) redirect('/login');

  const project = getProject(id);
  if (!project || !canAccess(project, me.id)) notFound();

  const estimate = (project.estimates ?? []).find((e) => e.id === eid);
  if (!estimate) notFound();

  return (
    <EstimateEditor
      projectId={project.id}
      projectName={project.name}
      companyName={getCompany(me.companyId)?.name}
      initial={estimate}
    />
  );
}
