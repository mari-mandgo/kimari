import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { updateUser, findUserById, listUsers, toPublic } from '@/lib/auth';
import { createCompany, findByInviteCode, getCompany, updateCompany } from '@/lib/companies';

export const runtime = 'nodejs';

/** 自分の会社と、同じ会社の人 */
export async function GET() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

  const company = getCompany(me.companyId);
  const members = company
    ? listUsers()
        .filter((u) => u.companyId === company.id)
        .map(toPublic)
    : [];

  return NextResponse.json({ company, members });
}

/**
 * 会社を作る、または会社コードで参加する。
 * 会社名では突き合わせない。同名の別会社が混ざらないようにするため。
 */
export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

  const body = await req.json();

  if (body.action === 'join') {
    const found = findByInviteCode(String(body.code ?? ''));
    if (!found) return NextResponse.json({ error: '会社コードが見つかりません' }, { status: 400 });
    updateUser(me.id, { companyId: found.id });
    return NextResponse.json({ company: found });
  }

  if (body.action === 'create') {
    const name = String(body.name ?? '').trim();
    if (!name) return NextResponse.json({ error: '会社名を入力してください' }, { status: 400 });

    const company = createCompany({
      name,
      address: body.address,
      tel: body.tel,
      ownerUserId: me.id,
    });
    updateUser(me.id, { companyId: company.id });
    return NextResponse.json({ company });
  }

  if (body.action === 'edit') {
    if (!me.companyId) {
      return NextResponse.json({ error: '会社に所属していません' }, { status: 400 });
    }
    // 会社の情報を変えられるのは、その会社に属している設計・現場管理だけ
    if (!['設計', '現場管理'].includes(me.role)) {
      return NextResponse.json(
        { error: '会社の情報を変更できるのは、設計・現場管理の方だけです' },
        { status: 403 }
      );
    }
    const patch: Record<string, string | undefined> = {};
    for (const key of ['name', 'address', 'tel'] as const) {
      if (typeof body[key] === 'string') patch[key] = body[key];
    }
    // 空文字は「ロゴを外す」。未指定なら今のロゴを残す
    if (typeof body.logo === 'string') patch.logo = body.logo || undefined;

    const company = updateCompany(me.companyId, patch);
    return NextResponse.json({ company });
  }

  if (body.action === 'leave') {
    // 会社を離れると、拾い出しのルールは自分だけの範囲に戻る
    const u = findUserById(me.id);
    if (u) updateUser(me.id, { companyId: undefined });
    return NextResponse.json({ company: null });
  }

  return NextResponse.json({ error: '不明な操作です' }, { status: 400 });
}
