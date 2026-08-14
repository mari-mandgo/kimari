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
  // 打ち合わせを記録するたびに、選ばれた工程で現場の進行を更新する
  if (typeof body.phaseWeek === 'number') project.phaseWeek = body.phaseWeek;

  // 施主ページへの公開・非公開。AIの結果を人が確かめてから出す
  if (body.publishMeeting && typeof body.publishMeeting.id === 'string') {
    const m = project.meetings.find((x) => x.id === body.publishMeeting.id);
    if (m) m.published = Boolean(body.publishMeeting.published);
  }

  // 打ち合わせの削除。試しに流した分を消せないと施主ページが汚れる
  if (typeof body.deleteMeeting === 'string') {
    project.meetings = project.meetings.filter((m) => m.id !== body.deleteMeeting);
  }

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
        // あとから開き直したときに、その場と同じものを見せるために残す
        sentToRouter: incoming.sentToRouter,
        privacy: incoming.privacy,
        calls: incoming.calls,
        phaseLabel: incoming.phaseLabel,
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
