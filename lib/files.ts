/**
 * 現場に紐づくファイル（写真・図面・見積など）の保存。
 *
 * 外部ストレージを使わず data/uploads/<projectId>/ に置く。
 * 実データは公開リポジトリに含めない（.gitignore 済み）。
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { FileKind, StoredFile } from './file-kinds';
import { DATA_ROOT, IS_DEMO } from './demo';

export { FILE_KINDS } from './file-kinds';
export type { FileKind, StoredFile };

const ROOT = path.join(process.cwd(), DATA_ROOT, 'uploads');

const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
  // 見積書。中身を読んで「契約に含まれる工事」を取り出すため受け付ける
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);

export function isAllowed(mime: string): boolean {
  return ALLOWED.has(mime);
}

function dirFor(projectId: string): string {
  // パス操作を防ぐため、IDは英数字とハイフンだけに限る
  if (!/^[A-Za-z0-9-]+$/.test(projectId)) throw new Error('不正なID');
  const dir = path.join(ROOT, projectId);
  // デモのディスクは読み取り専用。作ろうとすると読み取りまで巻き込んで落ちる
  if (!IS_DEMO) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export async function saveFile(
  projectId: string,
  file: File,
  meta: { kind: FileKind; caption: string; meetingId?: string }
): Promise<StoredFile> {
  // デモは書き込まない。見知らぬ人がアップロードしたものを他人に見せない意味もある
  if (IS_DEMO) throw new Error('このデモではファイルを追加できません');
  const dir = dirFor(projectId);
  const ext = path.extname(file.name).toLowerCase().slice(0, 10) || '';
  const id = crypto.randomUUID();
  const stored = `${id}${ext}`;

  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(dir, stored), buf);

  return {
    id,
    stored,
    original: file.name,
    kind: meta.kind,
    mime: file.type,
    size: buf.length,
    caption: meta.caption,
    meetingId: meta.meetingId,
    uploadedAt: new Date().toISOString(),
  };
}

export function readFile(projectId: string, stored: string): { buf: Buffer; mime: string } | null {
  // ディレクトリを遡られないよう、ファイル名部分だけを使う
  const safe = path.basename(stored);
  const full = path.join(dirFor(projectId), safe);
  if (!fs.existsSync(full)) return null;
  const ext = path.extname(safe).toLowerCase();
  const mime =
    ext === '.png'
      ? 'image/png'
      : ext === '.webp'
        ? 'image/webp'
        : ext === '.pdf'
          ? 'application/pdf'
          : 'image/jpeg';
  return { buf: fs.readFileSync(full), mime };
}

export function deleteFile(projectId: string, stored: string): boolean {
  const full = path.join(dirFor(projectId), path.basename(stored));
  if (!fs.existsSync(full)) return false;
  fs.unlinkSync(full);
  return true;
}
