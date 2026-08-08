import { NextResponse } from 'next/server';
import { getProject, saveProject, canAccess } from '@/lib/store';
import { currentUser } from '@/lib/session';
import { readFile, deleteFile } from '@/lib/files';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string; stored: string }> };

/** 現場の参加者だけが読める */
export async function GET(_req: Request, { params }: Ctx) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: 'ログインしてください' }, { status: 401 });

  const { id, stored } = await params;
  const project = getProject(id);
  if (!project || !canAccess(project, me.id)) {
    return NextResponse.json({ error: '見つかりません' }, { status: 404 });
  }

  const found = readFile(id, stored);
  if (!found) return NextResponse.json({ error: '見つかりません' }, { status: 404 });

  return new NextResponse(new Uint8Array(found.buf), {
    headers: { 'Content-Type': found.mime, 'Cache-Control': 'private, max-age=3600' },
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: 'ログインしてください' }, { status: 401 });

  const { id, stored } = await params;
  const project = getProject(id);
  if (!project || !canAccess(project, me.id)) {
    return NextResponse.json({ error: '見つかりません' }, { status: 404 });
  }

  deleteFile(id, stored);
  project.files = (project.files ?? []).filter((f) => f.stored !== stored);
  saveProject(project);
  return NextResponse.json({ ok: true });
}
