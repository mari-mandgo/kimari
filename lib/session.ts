import { cookies } from 'next/headers';
import { userFromToken, SESSION_COOKIE, type PublicUser } from './auth';

/** サーバーコンポーネントからログイン中のユーザーを取る */
export async function currentUser(): Promise<PublicUser | null> {
  const jar = await cookies();
  return userFromToken(jar.get(SESSION_COOKIE)?.value);
}
