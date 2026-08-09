import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { getProject, canAccess } from '@/lib/store';
import { findUserById } from '@/lib/auth';
import { scopeOf } from '@/lib/roles';
import { addRule, addReport, listRules, removeRule } from '@/lib/takeoff-rules';

export const runtime = 'nodejs';

/** 拾い出しのルールを直せるのは、その会社の設計・現場管理だけ */
const CAN_EDIT = ['設計', '現場管理'];

/**
 * 現場から「その会社」を引く。
 *
 * 範囲は現場を作った人の会社。他社の現場に招かれた職人が、
 * こちらの判定を書き換えられないようにするため。
 * また、書き換えられるのは自分と同じ会社の現場に限る。
 */
async function resolve(projectId: unknown) {
  const me = await currentUser();
  if (!me) return { error: 'ログインが必要です', status: 401 as const };

  const project = getProject(String(projectId ?? ''));
  if (!project) return { error: '現場が見つかりません', status: 404 as const };
  if (!canAccess(project, me.id)) return { error: 'この現場を見る権限がありません', status: 403 as const };

  const owner = project.ownerId ? findUserById(project.ownerId) : null;
  if (!owner) return { error: 'この現場には持ち主が設定されていません', status: 400 as const };

  const scope = scopeOf(owner);
  /** 自分の会社の現場か。違う会社の現場では読めても書けない */
  const sameCompany = scopeOf(me) === scope;

  return { me, scope, sameCompany };
}

/** マイページ用。自分の範囲に貯まっているルールを返す */
export async function GET() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
  return NextResponse.json({
    rules: listRules(scopeOf(me)),
    canEdit: CAN_EDIT.includes(me.role),
  });
}

export async function POST(req: Request) {
  const { projectId, text, context = '', target = 'company' } = await req.json();
  const r = await resolve(projectId);
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });

  if (!text || typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: '内容が空です' }, { status: 400 });
  }

  // 判定基準そのものへの指摘。すぐには効かせない
  if (target === 'report') {
    addReport({ text, context, by: r.me.name });
    return NextResponse.json({ reported: true, rules: listRules(r.scope) });
  }

  if (!CAN_EDIT.includes(r.me.role)) {
    return NextResponse.json(
      { error: '拾い出しのルールを変更できるのは、設計・現場管理の方だけです' },
      { status: 403 }
    );
  }
  if (!r.sameCompany) {
    return NextResponse.json(
      { error: '他社の現場では、拾い出しのルールを変更できません' },
      { status: 403 }
    );
  }

  addRule({ scope: r.scope, text, context, by: r.me.name });
  return NextResponse.json({ rules: listRules(r.scope) });
}

export async function DELETE(req: Request) {
  const { projectId, id } = await req.json();

  // マイページからは現場を経由しない。自分の範囲のルールだけを消せる
  if (!projectId) {
    const me = await currentUser();
    if (!me) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    if (!CAN_EDIT.includes(me.role)) {
      return NextResponse.json({ error: '取り消せるのは設計・現場管理の方だけです' }, { status: 403 });
    }
    const scope = scopeOf(me);
    removeRule(String(id), scope);
    return NextResponse.json({ rules: listRules(scope) });
  }

  const r = await resolve(projectId);
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });

  if (!CAN_EDIT.includes(r.me.role) || !r.sameCompany) {
    return NextResponse.json(
      { error: '取り消せるのは、その会社の設計・現場管理の方だけです' },
      { status: 403 }
    );
  }

  removeRule(String(id), r.scope);
  return NextResponse.json({ rules: listRules(r.scope) });
}
