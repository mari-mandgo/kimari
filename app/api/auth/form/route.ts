import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  createUser,
  findUserByEmail,
  verifyPassword,
  createSession,
  updateUser,
  SESSION_COOKIE,
  ROLES,
  toPublic,
  type Role,
} from '@/lib/auth';
import { createCompany, findByInviteCode } from '@/lib/companies';

export const runtime = 'nodejs';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
  // 事情は app/api/auth/route.ts と同じ。本番ビルドでは必ず付ける
  secure: process.env.NODE_ENV === 'production',
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
    const code = String(form.get('companyCode') ?? '').trim();
    let joining: string | undefined;
    if (code) {
      const found = findByInviteCode(code);
      if (!found) return back('会社コードが見つかりません');
      joining = found.id;
    }

    const { user, error } = createUser({
      name: String(form.get('name') ?? ''),
      email,
      password,
      role,
      companyId: joining,
    });
    if (error || !user) return back(error ?? '登録できませんでした');

    const companyName = String(form.get('companyName') ?? '').trim();
    if (!joining && companyName) {
      const created = createCompany({
        name: companyName,
        address: String(form.get('companyAddress') ?? ''),
        tel: String(form.get('companyTel') ?? ''),
        ownerUserId: user.id,
      });
      updateUser(user.id, { companyId: created.id });
    }
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
