import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  createUser,
  findUserByEmail,
  verifyPassword,
  createSession,
  SESSION_COOKIE,
  ROLES,
  toPublic,
  type Role,
} from '@/lib/auth';

export const runtime = 'nodejs';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
  // secure を付けると http のLAN内アクセス（スマホ実機確認）で Cookie が
  // 受け取り拒否される。公開時に https 配下へ置く際は true に戻すこと。
  secure: false,
};

/**
 * フォーム送信でのログイン・登録。
 *
 * JavaScriptが動かない端末（古いSafariなど）でも入れるように、
 * ブラウザ標準のフォーム送信＋リダイレクトで完結させる。
 * JSが動く端末では /api/auth（fetch）が先に処理するので、こちらは保険。
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const action = String(form.get('action') ?? 'login');
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');

  // 開発サーバーは req.url のホストを束縛アドレス（0.0.0.0）に書き換えることが
  // あるため、絶対URLを組まない。相対Locationならブラウザが今のホストで解決する。
  const redirect = (to: string) =>
    new NextResponse(null, { status: 303, headers: { Location: to } });
  const back = (error: string) =>
    redirect(`/login?error=${encodeURIComponent(error)}&mode=${action}`);

  if (!email || !password) return back('メールアドレスとパスワードを入力してください');

  const jar = await cookies();

  if (action === 'register') {
    const roleRaw = String(form.get('role') ?? '');
    const role: Role = (ROLES as readonly string[]).includes(roleRaw) ? (roleRaw as Role) : '設計';
    const { user, error } = createUser({
      name: String(form.get('name') ?? ''),
      email,
      password,
      role,
    });
    if (error || !user) return back(error ?? '登録できませんでした');
    jar.set(SESSION_COOKIE, createSession(user.id), COOKIE_OPTIONS);
    return redirect('/');
  }

  const found = findUserByEmail(email);
  if (!found || !verifyPassword(password, found.passwordHash)) {
    return back('メールアドレスまたはパスワードが違います');
  }
  jar.set(SESSION_COOKIE, createSession(toPublic(found).id), COOKIE_OPTIONS);
  return redirect('/');
}
