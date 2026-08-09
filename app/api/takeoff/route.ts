import { NextResponse } from 'next/server';
import { chat, parseJsonLoose, type CallMeta, MODEL_AUTO } from '@/lib/orca';
import { maskPII, unmask } from '@/lib/mask';
import { TAKEOFF_SYSTEM, takeoffUser } from '@/lib/prompts';

export const runtime = 'nodejs';
export const maxDuration = 120;

export type WorkItem = {
  category: string;
  name: string;
  unit: string;
  /** 何によって数量が決まるか。数値は入れない */
  qty_basis: string;
  note: string;
};

export type TakeoffResponse = {
  work_items: WorkItem[];
  /** 現調で確認すべきこと。AIには分からず人が見るしかない部分 */
  missing_info: string[];
  cautions: string[];
  calls: CallMeta[];
};

export async function POST(req: Request) {
  try {
    const { title, detail, reason, quote, names = [], model = MODEL_AUTO } = await req.json();

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'title がありません' }, { status: 400 });
    }

    // 仕分け済みの項目でも固有名詞が残っていることがあるので、ここでも通す
    const joined = [title, detail ?? '', reason ?? '', quote ?? ''].join('\n');
    const { masked, map } = maskPII(joined, names);
    const [mTitle, mDetail, mReason, mQuote] = masked.split('\n');

    const { data, meta } = await chat({
      task: 'takeoff',
      system: TAKEOFF_SYSTEM,
      user: takeoffUser({
        title: mTitle,
        detail: mDetail ?? '',
        reason: mReason,
        quote: mQuote,
      }),
      model,
      json: true,
    });

    const parsed = parseJsonLoose<{
      work_items: WorkItem[];
      missing_info: string[];
      cautions: string[];
    }>(data);

    const body: TakeoffResponse = {
      work_items: (parsed.work_items ?? []).map((w) => ({
        category: w.category ?? '',
        name: unmask(w.name ?? '', map),
        unit: w.unit ?? '式',
        qty_basis: unmask(w.qty_basis ?? '', map),
        note: unmask(w.note ?? '', map),
      })),
      missing_info: (parsed.missing_info ?? []).map((s) => unmask(String(s), map)),
      cautions: (parsed.cautions ?? []).map((s) => unmask(String(s), map)),
      calls: [meta],
    };

    return NextResponse.json(body);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
