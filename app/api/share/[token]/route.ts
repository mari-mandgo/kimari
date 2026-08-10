import { NextResponse } from 'next/server';
import { findByShareToken, saveProject, newId } from '@/lib/store';
import { isAllowed, saveFile } from '@/lib/files';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BYTES = 20 * 1024 * 1024;
const MAX_FILES = 5;

/**
 * 施主からの連絡を受け取る。
 *
 * 施主は登録しないので、この口だけは認証なしで開いている。
 * 代わりに、書き込める内容を打ち合わせへの連絡だけに絞り、
 * 長さと枚数の上限を設けている。読み取りは共有トークンを知っている人に限られる。
 *
 * 写真を添えられるようにしているのは、「ここが気になる」を
 * 言葉だけで伝えるのが難しいため。届いたファイルは現場のファイル置き場に入る。
 */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = findByShareToken(token);
  if (!project) return NextResponse.json({ error: '見つかりません' }, { status: 404 });

  const contentType = req.headers.get('content-type') ?? '';
  let meetingId = '';
  let name = '';
  let body = '';
  let about = '';
  const uploads: File[] = [];

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    meetingId = String(form.get('meetingId') ?? '');
    name = String(form.get('name') ?? '');
    body = String(form.get('body') ?? '');
    about = String(form.get('about') ?? '');
    for (const v of form.getAll('files')) {
      if (v instanceof File && v.size > 0) uploads.push(v);
    }
  } else {
    const json = await req.json();
    meetingId = String(json.meetingId ?? '');
    name = String(json.name ?? '');
    body = String(json.body ?? '');
    about = String(json.about ?? '');
  }

  const text = body.trim();
  if (!text) return NextResponse.json({ error: '内容を入力してください' }, { status: 400 });
  if (text.length > 2000) {
    return NextResponse.json({ error: '2000文字以内で入力してください' }, { status: 400 });
  }

  const meeting = project.meetings.find((m) => m.id === meetingId);
  if (!meeting) return NextResponse.json({ error: '対象が見つかりません' }, { status: 404 });

  if (uploads.length > MAX_FILES) {
    return NextResponse.json({ error: `ファイルは${MAX_FILES}件までです` }, { status: 400 });
  }

  const fileIds: string[] = [];
  for (const f of uploads) {
    if (!isAllowed(f.type)) {
      return NextResponse.json(
        { error: '写真（JPEG / PNG / WebP / HEIC）とPDFをお送りいただけます' },
        { status: 400 }
      );
    }
    if (f.size > MAX_BYTES) {
      return NextResponse.json({ error: '1ファイル20MBまでです' }, { status: 400 });
    }
    const stored = await saveFile(project.id, f, {
      kind: '写真',
      caption: `${name.trim() || '施主'}様からお送りいただいたもの`,
      meetingId: meeting.id,
    });
    project.files = [...(project.files ?? []), stored];
    fileIds.push(stored.id);
  }

  meeting.feedbacks = [
    ...(meeting.feedbacks ?? []),
    {
      id: newId('f'),
      name: name.trim().slice(0, 40),
      body: text,
      about: about.trim().slice(0, 120) || undefined,
      fileIds: fileIds.length ? fileIds : undefined,
      createdAt: new Date().toISOString(),
      read: false,
    },
  ];

  saveProject(project);
  return NextResponse.json({ ok: true, files: fileIds.length });
}
