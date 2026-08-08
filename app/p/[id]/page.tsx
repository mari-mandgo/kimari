import { notFound } from 'next/navigation';
import { getProject } from '@/lib/store';
import Workspace from '@/components/Workspace';

export const dynamic = 'force-dynamic';

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();
  return <Workspace project={project} />;
}
