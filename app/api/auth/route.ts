import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  createUser,
  findUserByEmail,
  verifyPassword,
  createSession,
  destroySession,
  userFromToken,
  toPublic,
  updateUser,
  SESSION_COOKIE,
  ROLES,
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

/** ログイン中のユーザーを返す */
export async function GET() {
  const jar = await cookies();
  const user = userFromToken(jar.get(SESSION_COOKIE)?.value);
  return NextResponse.json({ user });
}

/** action で登録・ログイン・ログアウト・プロフィール更新を切り替える */
export async function POST(req: Request) {
  const body = await req.json();
  const jar = await cookies();

  if (body.action === 'register') {
    const role: Role = ROLES.includes(body.role) ? body.role : '設計';
    const { user, error } = createUser({
      name: body.name ?? '',
      email: body.email ?? '',
      password: body.password ?? '',
      role,
      avatar: body.avatar,
    });
    if (error || !user) return NextResponse.json({ error }, { status: 400 });

    jar.set(SESSION_COOKIE, createSession(user.id), COOKIE_OPTIONS);
    return NextResponse.json({ user });
  }

  if (body.action === 'login') {
    const found = findUserByEmail(body.email ?? '');
    // 存在しない場合も同じ文言を返す（アカウントの有無を教えない）
    if (!found || !verifyPassword(body.password ?? '', found.passwordHash)) {
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが違います' },
        { status: 401 }
      );
    }
    jar.set(SESSION_COOKIE, createSession(found.id), COOKIE_OPTIONS);
    return NextResponse.json({ user: toPublic(found) });
  }

  if (body.action === 'logout') {
    const token = jar.get(SESSION_COOKIE)?.value;
    if (token) destroySession(token);
    jar.delete(SESSION_COOKIE);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'update') {
    const me = userFromToken(jar.get(SESSION_COOKIE)?.value);
    if (!me) return NextResponse.json({ error: 'ログインしてください' }, { status: 401 });
    const updated = updateUser(me.id, {
      name: body.name ?? me.name,
      role: ROLES.includes(body.role) ? body.role : me.role,
      avatar: body.avatar ?? me.avatar,
    });
    return NextResponse.json({ user: updated });
  }

  return NextResponse.json({ error: '不正な操作です' }, { status: 400 });
}
