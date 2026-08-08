import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session';
import ProjectList from '@/components/ProjectList';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const me = await currentUser();
  if (!me) redirect('/login');
  return <ProjectList me={me} />;
}
