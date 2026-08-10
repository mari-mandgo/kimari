import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { currentUser } from '@/lib/session';
import { getProject, saveProject, canAccess } from '@/lib/store';
import { chat, parseJsonLoose, MODEL_AUTO } from '@/lib/orca';
import { maskPII, unmask } from '@/lib/mask';
import { CONTRACT_SCOPE_SYSTEM, contractScopeUser } from '@/lib/prompts';

export const runtime = 'nodejs';
export const maxDuration = 300;

const PYTHON = path.join(process.cwd(), '.venv', 'Scripts', 'python.exe');
const SCRIPT = path.join(process.cwd(), 'scripts', 'read-estimate.py');

/**
 * 当初見積書（Excel）を読み、この契約に含まれる工事を取り出す。
 *
 * 拾い出しの差分判定は、いま「もともとの契約に含まれるか」をAIが常識から
 * 推し量っている。見積書を読めば、その現場で実際に何が契約されたのかが分かる。
 * 推測を事実に置き換えるのが、この処理の目的。
 *
 * Excelの読み取りは Python（openpyxl）で行い、数値セルは捨てる。
 * 契約範囲を知りたいだけで金額は要らないため、単価が外へ出ることもない。
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

  const project = getProject(id);
  if (!project) return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 });
  if (!canAccess(project, me.id)) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 });
  }

  const { fileId, model = MODEL_AUTO } = await req.json();
  const file = (project.files ?? []).find((f) => f.id === fileId);
  if (!file) return NextResponse.json({ error: 'ファイルが見つかりません' }, { status: 404 });

  if (!/\.xlsx?$/i.test(file.original)) {
    return NextResponse.json(
      { error: 'いまはExcel（.xlsx）の見積書に対応しています' },
      { status: 400 }
    );
  }
  if (!fs.existsSync(PYTHON)) {
    return NextResponse.json({ error: '読み取り環境が未設定です（.venv がありません）' }, { status: 500 });
  }

  const src = path.join(process.cwd(), 'data', 'uploads', project.id, file.stored);
  const out = path.join(process.cwd(), 'data', 'tmp', `${file.id}.txt`);
  fs.mkdirSync(path.dirname(out), { recursive: true });

  try {
    const text = await new Promise<string>((resolve, reject) => {
      execFile(PYTHON, [SCRIPT, src, '--out', out], { timeout: 60_000, windowsHide: true }, (err) => {
        if (err) return reject(new Error(`Excelを読めませんでした: ${err.message.slice(0, 200)}`));
        try {
          resolve(fs.readFileSync(out, 'utf8'));
        } catch {
          reject(new Error('読み取り結果を取得できませんでした'));
        }
      });
    });

    if (!text.trim()) {
      return NextResponse.json({ error: '工事項目を読み取れませんでした' }, { status: 400 });
    }

    // ルーターへ出る手前で必ずマスクを通す
    const { masked, map } = maskPII(text, project.names);
    const { data, meta } = await chat({
      task: 'contract-scope',
      system: CONTRACT_SCOPE_SYSTEM,
      user: contractScopeUser(masked),
      model,
      json: true,
    });

    const parsed = parseJsonLoose<{
      included: { category: string; name: string }[];
      excluded: string[];
      notes: string[];
    }>(data);

    project.contractScope = {
      fileId: file.id,
      fileName: file.original,
      included: (parsed.included ?? []).map((x) => ({
        category: String(x.category ?? ''),
        name: unmask(String(x.name ?? ''), map),
      })),
      excluded: (parsed.excluded ?? []).map((s) => unmask(String(s), map)),
      notes: (parsed.notes ?? []).map((s) => unmask(String(s), map)),
      readAt: new Date().toISOString(),
    };
    saveProject(project);

    return NextResponse.json({ contractScope: project.contractScope, calls: [meta] });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    try {
      fs.unlinkSync(out);
    } catch {
      // 無ければそれでよい
    }
  }
}
