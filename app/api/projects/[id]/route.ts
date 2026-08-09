import { NextResponse } from 'next/server';
import { getProject, saveProject, deleteProject, newId, type Meeting } from '@/lib/store';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 });
  return NextResponse.json({ project });
}

/** 打ち合わせの追加・更新、現場情報の更新をまとめて受ける */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 });

  const body = await req.json();

  if (typeof body.name === 'string') project.name = body.name;
  if (Array.isArray(body.names)) project.names = body.names;
  if (body.property && typeof body.property === 'object') {
    project.property = { ...project.property, ...body.property };
  }
  if (Array.isArray(body.members)) project.members = body.members;
  if (Array.isArray(body.stages)) project.stages = body.stages;
  if (typeof body.heroFileId === 'string') project.heroFileId = body.heroFileId || undefined;

  // 施主からの連絡を確認済みにする
  if (body.markFeedbackRead) {
    for (const m of project.meetings) {
      for (const f of m.feedbacks ?? []) {
        if (body.markFeedbackRead === 'all' || f.id === body.markFeedbackRead) f.read = true;
      }
    }
  }

  if (body.meeting) {
    const incoming = body.meeting as Partial<Meeting>;
    const existing = incoming.id ? project.meetings.find((m) => m.id === incoming.id) : null;

    if (existing) {
      Object.assign(existing, incoming);
    } else {
      project.meetings.push({
        id: newId('m'),
        date: incoming.date ?? new Date().toISOString().slice(0, 10),
        transcript: incoming.transcript ?? '',
        items: incoming.items ?? [],
        summary: incoming.summary ?? '',
        shareToken: newId('s'),
        documents: incoming.documents,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json({ project: saveProject(project) });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const ok = deleteProject(id);
  if (!ok) return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
