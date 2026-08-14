import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { currentUser } from '@/lib/session';
import { IS_DEMO } from '@/lib/demo';

export const runtime = 'nodejs';
export const maxDuration = 600;

const TMP = path.join(process.cwd(), 'data', 'tmp');
const PYTHON = path.join(process.cwd(), '.venv', 'Scripts', 'python.exe');
const SCRIPT = path.join(process.cwd(), 'scripts', 'transcribe.py');
const MAX_BYTES = 100 * 1024 * 1024;

/**
 * 録音した音声を、このサーバーの中で文字起こしする。
 *
 * ブラウザ内蔵の音声認識は口元の声に最適化されており、机に置いた端末で
 * 会議室の声を拾う用途では精度が出ない。そのため本命はこちらの経路。
 * 音声は外部サービスへ送らず、処理後に一時ファイルも消す。
 *
 * モデルは small を使う。実測で 90秒の音声が28秒（約1/3倍速）。
 * 誤認識（給排水→吸湯水 など）が出ても、後段の仕分けが文脈から
 * 復元することを実録音で確認済み。
 */
export async function POST(req: Request) {
  /*
    公開デモには faster-whisper（Python）が無い。
    音声を外へ出さない作りなので、代わりに外部の文字起こしサービスへ回す、
    という逃げ方はしない。**できないことは、できないと返す。**
  */
  if (IS_DEMO) {
    return NextResponse.json(
      { error: 'この公開デモでは文字起こしを行いません（自社サーバーで動かす部分のため）' },
      { status: 501 }
    );
  }

  const me = await currentUser();
  if (!me) return NextResponse.json({ error: 'ログインしてください' }, { status: 401 });

  if (!fs.existsSync(PYTHON)) {
    return NextResponse.json(
      { error: '文字起こし環境が未設定です（.venv がありません）' },
      { status: 500 }
    );
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: '音声ファイルがありません' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: '100MBまでの音声に対応しています' }, { status: 400 });
  }

  fs.mkdirSync(TMP, { recursive: true });
  const id = crypto.randomUUID();
  const ext = (path.extname(file.name) || '.webm').slice(0, 8);
  const audioPath = path.join(TMP, `${id}${ext}`);
  const textPath = path.join(TMP, `${id}.txt`);

  try {
    fs.writeFileSync(audioPath, Buffer.from(await file.arrayBuffer()));

    const text = await new Promise<string>((resolve, reject) => {
      execFile(
        PYTHON,
        [SCRIPT, audioPath, '--model', 'small', '--out', textPath],
        { timeout: 570_000, windowsHide: true },
        (err) => {
          if (err) return reject(new Error(`文字起こしに失敗しました: ${err.message.slice(0, 200)}`));
          try {
            resolve(fs.readFileSync(textPath, 'utf8'));
          } catch {
            reject(new Error('文字起こし結果を読めませんでした'));
          }
        }
      );
    });

    return NextResponse.json({ text });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    // 音声は残さない。文字起こしが済んだら消す
    for (const p of [audioPath, textPath]) {
      try {
        fs.unlinkSync(p);
      } catch {
        // 無ければそれでよい
      }
    }
  }
}
