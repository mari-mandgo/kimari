/**
 * モデル別の単価表（100万トークンあたり・USD）。
 *
 * 出典: AI HACK 2026 OrcaRouter スポンサーセッション資料 p.5（2026-08-08時点）
 * OrcaRouter の /v1/models は価格を返さないため、画面表示用の「概算」に使う。
 * 正確な実測原価は OrcaRouter コンソールのリクエストログを参照すること。
 */

export type Price = { input: number; output: number; quality?: number };

export const PRICE_TABLE: Record<string, Price> = {
  'anthropic/claude-opus-5': { input: 5.0, output: 25.0, quality: 10.0 },
  'google/gemini-3.6-flash': { input: 1.5, output: 7.5, quality: 8.0 },
  'meta/muse-spark-1.1': { input: 1.25, output: 4.25, quality: 8.0 },
  'google/gemini-3.5-flash-lite': { input: 0.3, output: 2.5, quality: 6.0 },
  'deepseek/deepseek-v4-flash': { input: 0.147, output: 0.295, quality: 6.0 },
  'qwen/qwen3.7-flash': { input: 0.03, output: 0.13, quality: 7.0 },
};

/** 表に無いモデルは、同じ系列の値で近似する（概算であることを明示して使う） */
const FALLBACK_PREFIX: { match: RegExp; price: Price }[] = [
  { match: /^qwen/i, price: { input: 0.03, output: 0.13 } },
  { match: /^deepseek/i, price: { input: 0.147, output: 0.295 } },
  { match: /gemini.*lite/i, price: { input: 0.3, output: 2.5 } },
  { match: /^google|gemini/i, price: { input: 1.5, output: 7.5 } },
  { match: /^anthropic|claude/i, price: { input: 5.0, output: 25.0 } },
];

export function lookupPrice(model: string): { price: Price | null; exact: boolean } {
  const key = model.replace(/^orcarouter\//, '');
  if (PRICE_TABLE[key]) return { price: PRICE_TABLE[key], exact: true };
  // 「qwen3.7-plus」のようにプロバイダ名が付かずに返ることがある
  const byName = Object.entries(PRICE_TABLE).find(([k]) => k.endsWith('/' + key));
  if (byName) return { price: byName[1], exact: true };
  const fb = FALLBACK_PREFIX.find((f) => f.match.test(key));
  return { price: fb ? fb.price : null, exact: false };
}

export function estimateCostUsd(model: string, promptTokens: number, completionTokens: number) {
  const { price, exact } = lookupPrice(model);
  if (!price) return { usd: null, exact: false };
  const usd = (promptTokens / 1_000_000) * price.input + (completionTokens / 1_000_000) * price.output;
  return { usd, exact };
}

/** 画面表示用。為替は固定値で、必ず併記して使うこと */
export const USD_JPY = 155;

export function formatCost(usd: number | null): string {
  if (usd === null) return '—';
  const jpy = usd * USD_JPY;
  if (jpy < 1) return `$${usd.toFixed(6)}（約${jpy.toFixed(2)}円）`;
  return `$${usd.toFixed(4)}（約${jpy.toFixed(1)}円）`;
}
