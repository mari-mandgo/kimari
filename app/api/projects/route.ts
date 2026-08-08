import { NextResponse } from 'next/server';
import { listProjects, createProject, findByInviteCode, joinProject } from '@/lib/store';
import { currentUser } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: 'ログインしてください' }, { status: 401 });
  return NextResponse.json({ projects: listProjects(me.id) });
}

export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: 'ログインしてください' }, { status: 401 });

  const body = await req.json();

  // 招待コードで既存の現場に参加する
  if (body.inviteCode) {
    const found = findByInviteCode(body.inviteCode);
    if (!found) return NextResponse.json({ error: '招待コードが違います' }, { status: 404 });
    const project = joinProject(found, me.id);
    return NextResponse.json({ project });
  }

  const project = createProject(
    body.name ?? '',
    Array.isArray(body.names) ? body.names : [],
    me.id
  );
  return NextResponse.json({ project });
}
