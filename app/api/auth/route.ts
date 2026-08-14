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
import { createCompany, findByInviteCode } from '@/lib/companies';

export const runtime = 'nodejs';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
  /*
    secure を付けると、http のLAN内アクセス（スマホ実機確認）で Cookie が受け取り拒否される。
    そのため開発中は付けない。**https へ出すときは必ず付ける。**
    人の記憶に頼ると戻し忘れるので、本番ビルドかどうかで自動的に切り替える。
  */
  secure: process.env.NODE_ENV === 'production',
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

    // 会社コードが入っていれば既存の会社へ参加。会社名では突き合わせない
    let joining: string | undefined;
    if (String(body.companyCode ?? '').trim()) {
      const found = findByInviteCode(String(body.companyCode));
      if (!found) {
        return NextResponse.json({ error: '会社コードが見つかりません' }, { status: 400 });
      }
      joining = found.id;
    }

    const { user, error } = createUser({
      name: body.name ?? '',
      email: body.email ?? '',
      password: body.password ?? '',
      role,
      companyId: joining,
      avatar: body.avatar,
    });
    if (error || !user) return NextResponse.json({ error }, { status: 400 });

    // コードでの参加でなく、会社名が入っていれば新しい会社を作る
    let created = null;
    if (!joining && String(body.companyName ?? '').trim()) {
      created = createCompany({
        name: String(body.companyName),
        address: body.companyAddress,
        tel: body.companyTel,
        ownerUserId: user.id,
      });
      updateUser(user.id, { companyId: created.id });
    }

    jar.set(SESSION_COOKIE, createSession(user.id), COOKIE_OPTIONS);
    return NextResponse.json({ user, company: created });
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
      // 空文字は「写真を外す」。未指定（undefined）なら今の写真を残す
      avatar: typeof body.avatar === 'string' ? body.avatar || undefined : me.avatar,
    });
    return NextResponse.json({ user: updated });
  }

  return NextResponse.json({ error: '不正な操作です' }, { status: 400 });
}
