import { redirect } from 'next/navigation';
import LoginForm from '@/components/LoginForm';
import { IS_DEMO } from '@/lib/demo';

export const dynamic = 'force-dynamic';

/**
 * ログイン画面。
 * 本体はクライアント側の LoginForm だが、JavaScriptが動かない端末でも
 * 素のフォーム送信（/api/auth/form）で入れるようにしてある。
 * その経路のエラーはURLで戻ってくるため、ここで受け取って渡す。
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mode?: string }>;
}) {
  // 公開デモではアカウントを作らせない。LPのボタンもここへ来るので、デモへ送る
  if (IS_DEMO) redirect('/demo');

  const params = await searchParams;
  const initialMode = params.mode === 'register' ? 'register' : 'login';
  return <LoginForm initialError={params.error} initialMode={initialMode} />;
}
