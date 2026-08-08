import { NextResponse } from 'next/server';
import { findByShareToken } from '@/lib/store';
import { readFile } from '@/lib/files';

export const runtime = 'nodejs';

/**
 * 施主が共有ページで画像を見るための口。
 * 認証は無いが、共有トークンを知っていること、
 * かつその現場に登録済みのファイルであることの2つを満たす場合だけ返す。
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string; stored: string }> }
) {
  const { token, stored } = await params;
  const project = findByShareToken(token);
  if (!project) return NextResponse.json({ error: '見つかりません' }, { status: 404 });

  // この現場に登録されたファイルでなければ返さない
  const known = (project.files ?? []).some((f) => f.stored === stored);
  if (!known) return NextResponse.json({ error: '見つかりません' }, { status: 404 });

  const found = readFile(project.id, stored);
  if (!found) return NextResponse.json({ error: '見つかりません' }, { status: 404 });

  return new NextResponse(new Uint8Array(found.buf), {
    headers: { 'Content-Type': found.mime, 'Cache-Control': 'private, max-age=3600' },
  });
}
