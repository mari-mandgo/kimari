import { NextResponse } from 'next/server';
import { chat, parseJsonLoose, type CallMeta, MODEL_AUTO } from '@/lib/orca';
import { maskPII, unmask, verifyMasked } from '@/lib/mask';
import { EXTRACT_SYSTEM, extractUser } from '@/lib/prompts';

export const runtime = 'nodejs';
export const maxDuration = 120;

export type Item = {
  category: 'cost_impact' | 'decision_no_cost' | 'pending' | 'risk';
  title: string;
  detail: string;
  reason: string;
  quote: string;
  owner: string;
  needs_estimate: boolean;
};

export type AnalyzeResponse = {
  items: Item[];
  summary: string;
  /** マスキングの実演用。何件伏せたか、漏れがないか */
  privacy: { maskedCount: number; tokens: string[]; verified: boolean };
  /** 採点項目「LLMコスト」の証跡 */
  calls: CallMeta[];
  /** ルーターへ実際に送った本文（マスク後）。デモで並べて見せる */
  sentToRouter: string;
};

export async function POST(req: Request) {
  try {
    const { transcript, names = [], model = MODEL_AUTO } = await req.json();

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json({ error: 'transcript がありません' }, { status: 400 });
    }

    // 1. 個人情報を伏せる（ルーターへ送る前に必ず通す）
    const { masked, map } = maskPII(transcript, names);
    const check = verifyMasked(masked, map);

    // 2. 仕分け
    const { data, meta } = await chat({
      task: 'extract',
      system: EXTRACT_SYSTEM,
      user: extractUser(masked),
      model,
      json: true,
    });

    const parsed = parseJsonLoose<{ items: Item[]; summary: string }>(data);

    // 3. 個人情報を戻す（この復元はサーバー内でのみ行う）
    const items = (parsed.items ?? []).map((it) => ({
      ...it,
      title: unmask(it.title ?? '', map),
      detail: unmask(it.detail ?? '', map),
      reason: unmask(it.reason ?? '', map),
      quote: unmask(it.quote ?? '', map),
    }));

    const body: AnalyzeResponse = {
      items,
      summary: unmask(parsed.summary ?? '', map),
      privacy: {
        maskedCount: Object.keys(map).length,
        tokens: Object.keys(map),
        verified: check.ok,
      },
      calls: [meta],
      sentToRouter: masked,
    };

    return NextResponse.json(body);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
