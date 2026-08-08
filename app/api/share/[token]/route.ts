import { NextResponse } from 'next/server';
import { findByShareToken, saveProject, newId } from '@/lib/store';

export const runtime = 'nodejs';

/**
 * 施主からの連絡を受け取る。
 *
 * 施主は登録しないので、この口だけは認証なしで開いている。
 * 代わりに、書き込める内容を打ち合わせへの連絡だけに絞り、
 * 長さの上限を設けている。読み取りは共有トークンを知っている人に限られる。
 */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = findByShareToken(token);
  if (!project) return NextResponse.json({ error: '見つかりません' }, { status: 404 });

  const { meetingId, name = '', body = '' } = await req.json();

  const text = String(body).trim();
  if (!text) return NextResponse.json({ error: '内容を入力してください' }, { status: 400 });
  if (text.length > 2000) {
    return NextResponse.json({ error: '2000文字以内で入力してください' }, { status: 400 });
  }

  const meeting = project.meetings.find((m) => m.id === meetingId);
  if (!meeting) return NextResponse.json({ error: '対象が見つかりません' }, { status: 404 });

  meeting.feedbacks = [
    ...(meeting.feedbacks ?? []),
    {
      id: newId('f'),
      name: String(name).trim().slice(0, 40),
      body: text,
      createdAt: new Date().toISOString(),
      read: false,
    },
  ];

  saveProject(project);
  return NextResponse.json({ ok: true });
}
