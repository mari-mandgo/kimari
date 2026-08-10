import { NextResponse } from 'next/server';
import { getProject, saveProject, canAccess } from '@/lib/store';
import { currentUser } from '@/lib/session';
import { saveFile, isAllowed, FILE_KINDS, type FileKind } from '@/lib/files';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BYTES = 20 * 1024 * 1024;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: 'ログインしてください' }, { status: 401 });

  const { id } = await params;
  const project = getProject(id);
  if (!project || !canAccess(project, me.id)) {
    return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'ファイルがありません' }, { status: 400 });
  }
  if (!isAllowed(file.type)) {
    return NextResponse.json(
      { error: '画像（JPEG / PNG / WebP / HEIC）・PDF・Excelの見積書のみ受け付けます' },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: '1ファイル20MBまでです' }, { status: 400 });
  }

  const kindRaw = String(form.get('kind') ?? '');
  const kind: FileKind = (FILE_KINDS as readonly string[]).includes(kindRaw)
    ? (kindRaw as FileKind)
    : '写真';

  const stored = await saveFile(id, file, {
    kind,
    caption: String(form.get('caption') ?? '').slice(0, 200),
    meetingId: String(form.get('meetingId') ?? '') || undefined,
  });

  project.files = [...(project.files ?? []), stored];
  saveProject(project);

  return NextResponse.json({ file: stored });
}
