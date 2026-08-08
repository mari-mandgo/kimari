/**
 * OrcaRouter クライアント（OpenAI互換）。
 *
 * 採点項目「LLMコスト」のため、1リクエストごとに
 * ・どのタスクだったか
 * ・ルーターが実際にどのモデルへ振り分けたか
 * ・トークン数と所要時間
 * を必ず記録する。あとから集計できない形で走らせない。
 */

import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.ORCA_BASE_URL ?? 'https://api.orcarouter.ai/v1';

/** 既定は auto。比較用に明示的なモデルIDも渡せるようにしておく */
export const MODEL_AUTO = 'orcarouter/auto';

export type CallResult<T = string> = {
  data: T;
  meta: CallMeta;
};

export type CallMeta = {
  task: string;
  requestedModel: string;
  /** ルーターが実際に使ったモデル。ここが振り分けの証拠になる */
  servedModel: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** レスポンスに費用が含まれていれば拾う（含まれない場合は null） */
  costUsd: number | null;
  ms: number;
};

type ChatArgs = {
  task: string;
  system: string;
  user: string;
  model?: string;
  /** JSONで返させたいとき true */
  json?: boolean;
  temperature?: number;
};

export async function chat({
  task,
  system,
  user,
  model = MODEL_AUTO,
  json = false,
  temperature = 0.2,
}: ChatArgs): Promise<CallResult> {
  const key = process.env.ORCA_API_KEY;
  if (!key) throw new Error('ORCA_API_KEY が未設定です。.env.local に設定してください。');

  const started = Date.now();
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  const ms = Date.now() - started;

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OrcaRouter ${res.status}: ${body.slice(0, 500)}`);
  }

  const payload = await res.json();
  const usage = payload.usage ?? {};

  const meta: CallMeta = {
    task,
    requestedModel: model,
    servedModel: payload.model ?? 'unknown',
    promptTokens: usage.prompt_tokens ?? 0,
    completionTokens: usage.completion_tokens ?? 0,
    totalTokens: usage.total_tokens ?? 0,
    costUsd: pickCost(payload, usage),
    ms,
  };

  appendCostLog(meta);

  return { data: payload.choices?.[0]?.message?.content ?? '', meta };
}

/** 費用の返却位置はプロバイダによって差があるため、候補を順に見る */
function pickCost(payload: Record<string, unknown>, usage: Record<string, unknown>): number | null {
  const candidates = [
    (usage as { cost?: unknown }).cost,
    (usage as { total_cost?: unknown }).total_cost,
    (payload as { cost?: unknown }).cost,
  ];
  for (const c of candidates) {
    if (typeof c === 'number') return c;
    if (typeof c === 'string' && c !== '' && !Number.isNaN(Number(c))) return Number(c);
  }
  return null;
}

/**
 * ローカル開発時のみ logs/cost.jsonl に追記する。
 * Vercel上は書き込めないので、API レスポンスに載せて画面で見せる。
 */
function appendCostLog(meta: CallMeta) {
  if (process.env.NODE_ENV === 'production') return;
  try {
    const dir = path.join(process.cwd(), 'logs');
    fs.mkdirSync(dir, { recursive: true });
    const line = JSON.stringify({ at: new Date().toISOString(), ...meta }) + '\n';
    fs.appendFileSync(path.join(dir, 'cost.jsonl'), line, 'utf8');
  } catch {
    // ログ失敗で本処理を止めない
  }
}

/** ```json ... ``` で囲まれて返ってきても拾えるようにする */
export function parseJsonLoose<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error(`JSONが見つかりません: ${text.slice(0, 200)}`);
  return JSON.parse(body.slice(start, end + 1)) as T;
}
