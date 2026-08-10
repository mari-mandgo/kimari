import { NextResponse } from 'next/server';
import { chat, parseJsonLoose, type CallMeta, MODEL_AUTO } from '@/lib/orca';
import { maskPII, unmask } from '@/lib/mask';
import { TAKEOFF_SYSTEM, takeoffUser } from '@/lib/prompts';
import { rulesAsPrompt, listRules, type TakeoffRule } from '@/lib/takeoff-rules';
import { getProject } from '@/lib/store';
import { findUserById } from '@/lib/auth';
import { scopeOf } from '@/lib/roles';

export const runtime = 'nodejs';
export const maxDuration = 120;

export type WorkItem = {
  category: string;
  /** 新規＝この変更で初めて発生 / 増分＝もともとやるが数量が増える */
  kind?: string;
  name: string;
  unit: string;
  /** 何によって数量が決まるか。数値は入れない */
  qty_basis: string;
  note: string;
};

/** 検討したうえで「もともとの工事に含まれる」と判断して外したもの */
export type ExcludedItem = { name: string; why: string };

export type TakeoffResponse = {
  /** 工事のどの段階か。契約前後で差分の意味が変わる */
  phase_week: number | null;
  phase: string;
  phase_reason: string;
  work_items: WorkItem[];
  already_included: ExcludedItem[];
  /** 現調で確認すべきこと。AIには分からず人が見るしかない部分 */
  missing_info: string[];
  cautions: string[];
  calls: CallMeta[];
  /** この拾い出しに効いた、自社の補正。取り消せるように中身ごと返す */
  appliedRules: TakeoffRule[];
  /** 当初見積書を読んで判定したか。推測との違いを画面で示す */
  usedContract: { fileName: string; count: number } | null;
};

export async function POST(req: Request) {
  try {
    const {
      title,
      detail,
      reason,
      quote,
      names = [],
      projectId,
      context = '',
      phaseLabel = '',
      model = MODEL_AUTO,
    } = await req.json();

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'title がありません' }, { status: 400 });
    }

    const project = getProject(String(projectId ?? ''));

    // 当初見積書から読み取った契約範囲。あれば推測でなく事実で判定できる
    const scope = project?.contractScope;
    const contractScope = scope
      ? scope.included.map((x) => `- ${x.category ? `[${x.category}] ` : ''}${x.name}`).join('\n')
      : '';

    // 補正は会社ごと。他社のルールは混ざらない
    const ownerId = project?.ownerId;
    const owner = ownerId ? findUserById(ownerId) : null;
    const rulesScope = owner ? scopeOf(owner) : '';

    // 仕分け済みの項目でも固有名詞が残っていることがあるので、ここでも通す
    // 改行で連結すると、要約や詳細に改行が入ったときに項目がずれる。
    // 本文に現れない制御文字で区切る（マスク処理はこの文字に触れない）。
    const SEP = '\x1f';
    const joined = [title, detail ?? '', reason ?? '', quote ?? '', context].join(SEP);
    const { masked, map } = maskPII(joined, names);
    const [mTitle, mDetail, mReason, mQuote, mContext] = masked.split(SEP);

    // 自社の補正を足す。使うほど自社の型に寄っていく
    const { data, meta } = await chat({
      task: 'takeoff',
      system: TAKEOFF_SYSTEM + rulesAsPrompt(rulesScope),
      user: takeoffUser({
        title: mTitle,
        detail: mDetail ?? '',
        reason: mReason,
        quote: mQuote,
        context: mContext,
        phaseLabel,
        contractScope,
      }),
      model,
      json: true,
    });

    const parsed = parseJsonLoose<{
      phase_week?: number;
      phase?: string;
      phase_reason?: string;
      work_items: WorkItem[];
      already_included?: ExcludedItem[];
      missing_info: string[];
      cautions: string[];
    }>(data);

    const body: TakeoffResponse = {
      phase_week: typeof parsed.phase_week === 'number' ? parsed.phase_week : null,
      phase: parsed.phase ?? '',
      phase_reason: unmask(parsed.phase_reason ?? '', map),
      already_included: (parsed.already_included ?? []).map((e) => ({
        name: unmask(e.name ?? '', map),
        why: unmask(e.why ?? '', map),
      })),
      work_items: (parsed.work_items ?? []).map((w) => ({
        category: w.category ?? '',
        kind: w.kind ?? '新規',
        name: unmask(w.name ?? '', map),
        unit: w.unit ?? '式',
        qty_basis: unmask(w.qty_basis ?? '', map),
        note: unmask(w.note ?? '', map),
      })),
      missing_info: (parsed.missing_info ?? []).map((s) => unmask(String(s), map)),
      cautions: (parsed.cautions ?? []).map((s) => unmask(String(s), map)),
      calls: [meta],
      appliedRules: listRules(rulesScope),
      usedContract: scope ? { fileName: scope.fileName, count: scope.included.length } : null,
    };

    return NextResponse.json(body);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
