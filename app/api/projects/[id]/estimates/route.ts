import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { getProject, saveProject, canAccess, type Estimate, type EstimateRow } from '@/lib/store';

export const runtime = 'nodejs';

/**
 * 追加見積の作成・更新。
 *
 * 拾い出しの結果（工事項目）を受け取って器を作り、数量と単価は人が入れる。
 * AIに金額を出させないのは、単価が会社ごと・時期ごとに違うことと、
 * 変更工事の見積は建設業法上、事業者が書面で提示する責任を負うため。
 */

async function guard(id: string) {
  const me = await currentUser();
  if (!me) return { error: 'ログインが必要です', status: 401 as const };
  const project = getProject(id);
  if (!project) return { error: '現場が見つかりません', status: 404 as const };
  if (!canAccess(project, me.id)) return { error: '権限がありません', status: 403 as const };
  return { me, project };
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guard(id);
  if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status });

  const body = await req.json();
  const rows: EstimateRow[] = (body.rows ?? []).map(
    (r: Partial<EstimateRow>): EstimateRow => ({
      category: String(r.category ?? ''),
      name: String(r.name ?? ''),
      unit: String(r.unit ?? '式'),
      qty: null,
      unitPrice: null,
      note: String(r.note ?? ''),
    })
  );

  const list = g.project.estimates ?? [];
  const today = new Date().toISOString().slice(0, 10);

  const estimate: Estimate = {
    id: `e-${Math.random().toString(36).slice(2, 10)}`,
    no: list.length + 1,
    template: body.template ?? 'cover',
    title: String(body.title ?? '追加工事').slice(0, 120),
    clientName: body.clientName ?? '',
    issuedOn: today,
    meetingId: body.meetingId,
    sourceTitle: body.sourceTitle,
    // 作った時点の工程で決まる。あとから現場が進んでも表題は変えない
    beforeContract: Boolean(body.beforeContract),
    rows,
    taxRate: 10,
    note: '',
    createdBy: g.me.name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  g.project.estimates = [...list, estimate];
  saveProject(g.project);

  return NextResponse.json({ estimate });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guard(id);
  if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status });

  const body = await req.json();
  const list = g.project.estimates ?? [];
  const target = list.find((e) => e.id === body.id);
  if (!target) return NextResponse.json({ error: '見積が見つかりません' }, { status: 404 });

  for (const key of ['template', 'title', 'clientName', 'issuedOn', 'note'] as const) {
    if (body[key] !== undefined) (target[key] as unknown) = body[key];
  }
  if (typeof body.taxRate === 'number') target.taxRate = body.taxRate;
  if (body.baseAmount === null || typeof body.baseAmount === 'number') {
    target.baseAmount = body.baseAmount;
  }
  if (typeof body.baseFileId === 'string') target.baseFileId = body.baseFileId || undefined;
  if (Array.isArray(body.rows)) target.rows = body.rows;
  target.updatedAt = new Date().toISOString();

  saveProject(g.project);
  return NextResponse.json({ estimate: target });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guard(id);
  if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status });

  const { estimateId } = await req.json();
  g.project.estimates = (g.project.estimates ?? []).filter((e) => e.id !== estimateId);
  saveProject(g.project);
  return NextResponse.json({ ok: true });
}
