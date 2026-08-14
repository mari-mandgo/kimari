import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/lib/session';
import { getProject, canAccess } from '@/lib/store';
import { getCompany } from '@/lib/companies';
import EstimateEditor from '@/components/EstimateEditor';
import { IS_DEMO } from '@/lib/demo';

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
  // デモは誰でも入れる現場を1つだけ置いてある（app/p/[id]/page.tsx と同じ扱い）
  if (!project || (!IS_DEMO && !canAccess(project, me.id))) notFound();

  const estimate = (project.estimates ?? []).find((e) => e.id === eid);
  if (!estimate) notFound();

  const company = getCompany(me.companyId);

  return (
    <EstimateEditor
      projectId={project.id}
      projectName={project.name}
      companyName={company?.name}
      companyLogo={company?.logo}
      companyAddress={company?.address}
      companyTel={company?.tel}
      estimateFiles={(project.files ?? [])
        .filter((f) => f.kind === '見積')
        .map((f) => ({ id: f.id, original: f.original }))}
      initial={estimate}
    />
  );
}
