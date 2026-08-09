import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session';
import MyPage from '@/components/MyPage';

export const dynamic = 'force-dynamic';

export default async function Me() {
  const me = await currentUser();
  if (!me) redirect('/login');
  return <MyPage me={me} />;
}
