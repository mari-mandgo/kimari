import { NextResponse } from 'next/server';
import { chat, type CallMeta } from '@/lib/orca';
import { maskPII, unmask } from '@/lib/mask';
import {
  OWNER_DOC_SYSTEM,
  WORKER_DOC_SYSTEM,
  INTERNAL_DOC_SYSTEM,
  translateSystem,
} from '@/lib/prompts';
import type { Item } from '../analyze/route';

export const runtime = 'nodejs';
export const maxDuration = 180;

/**
 * 文書生成は定型処理なので、安いモデルへ寄せる。
 * 実測（docs/benchmark.md）で、この種の整形は品質差がほぼ出なかった。
 */
const DOC_MODEL = 'orcarouter/fusion-flash';

export type DocumentsResponse = {
  owner: string;
  worker: string;
  internal: string;
  workerTranslated: string | null;
  lang: string | null;
  calls: CallMeta[];
};

/** 仕分け結果を、文書生成用のテキストに整える */
function toBrief(items: Item[], summary: string): string {
  const group = (c: Item['category']) => items.filter((i) => i.category === c);
  const fmt = (list: Item[]) =>
    list.length
      ? list
          .map(
            (i) =>
              `- ${i.title}\n  内容: ${i.detail}\n  理由: ${i.reason}\n  発言: 「${i.quote}」\n  担当: ${i.owner}`
          )
          .join('\n')
      : '- なし';

  return [
    `【打ち合わせの概要】\n${summary || '（記載なし）'}`,
    `\n【金額に影響する変更（追加見積の対象）】\n${fmt(group('cost_impact'))}`,
    `\n【決定（金額の変更なし）】\n${fmt(group('decision_no_cost'))}`,
    `\n【保留】\n${fmt(group('pending'))}`,
    `\n【認識のズレの可能性】\n${fmt(group('risk'))}`,
  ].join('\n');
}

export async function POST(req: Request) {
  try {
    const {
      items = [],
      summary = '',
      names = [],
      lang = null,
    }: { items: Item[]; summary: string; names: string[]; lang: string | null } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: '仕分け結果がありません' }, { status: 400 });
    }

    // 文書生成でも、ルーターへ出る手前で必ずマスクを通す
    const brief = toBrief(items, summary);
    const { masked, map } = maskPII(brief, names);

    const [owner, worker, internal] = await Promise.all([
      chat({ task: 'doc:owner', system: OWNER_DOC_SYSTEM, user: masked, model: DOC_MODEL }),
      chat({ task: 'doc:worker', system: WORKER_DOC_SYSTEM, user: masked, model: DOC_MODEL }),
      chat({ task: 'doc:internal', system: INTERNAL_DOC_SYSTEM, user: masked, model: DOC_MODEL }),
    ]);

    const calls: CallMeta[] = [owner.meta, worker.meta, internal.meta];

    // 職人向けだけ翻訳する（施主向け・社内向けは日本語のまま）
    let workerTranslated: string | null = null;
    if (lang) {
      const t = await chat({
        task: `doc:worker:${lang}`,
        system: translateSystem(lang),
        user: worker.data,
        model: DOC_MODEL,
      });
      workerTranslated = unmask(t.data, map);
      calls.push(t.meta);
    }

    const body: DocumentsResponse = {
      owner: unmask(owner.data, map),
      worker: unmask(worker.data, map),
      internal: unmask(internal.data, map),
      workerTranslated,
      lang,
      calls,
    };

    return NextResponse.json(body);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
