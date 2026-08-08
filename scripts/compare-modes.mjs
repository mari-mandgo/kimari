/**
 * ルーティングモード別のコスト・速度・抽出品質を比較する。
 * 開発サーバーを起動した状態で実行すること。
 *
 *   npm run dev
 *   node scripts/compare-modes.mjs
 *
 * 結果は docs/benchmark.md に手で転記する（数値の解釈を人が確認するため）。
 */
import fs from 'node:fs';

const ENDPOINT = process.env.KIMARI_ENDPOINT ?? 'http://localhost:3001/api/analyze';
const USD_JPY = 155;

const MODES = [
  'orcarouter/fusion-flash',
  'orcarouter/fusion-mini',
  'orcarouter/auto',
  // 比較の基準線。高いので必要なときだけ有効化する
  // 'anthropic/claude-opus-5',
];

const transcript = fs.readFileSync('docs/demo-transcript.txt', 'utf8');

for (const model of MODES) {
  const started = Date.now();
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, names: ['田中'], model }),
    });
    const json = await res.json();
    if (!res.ok) {
      console.log(`${model} → エラー: ${String(json.error).slice(0, 160)}`);
      continue;
    }
    const call = json.calls[0];
    const byCategory = {};
    for (const item of json.items) {
      byCategory[item.category] = (byCategory[item.category] ?? 0) + 1;
    }
    const usd = call.costUsd ?? call.estCostUsd;

    console.log(model);
    console.log(`  実モデル : ${call.servedModel}`);
    console.log(`  所要     : ${((Date.now() - started) / 1000).toFixed(1)}秒`);
    console.log(`  トークン : in ${call.promptTokens} / out ${call.completionTokens}`);
    console.log(
      `  概算原価 : ${usd === null ? '—' : `$${usd.toFixed(6)}（約${(usd * USD_JPY).toFixed(2)}円）`}`
    );
    console.log(`  抽出     : ${json.items.length}件 ${JSON.stringify(byCategory)}`);
    console.log('');
  } catch (e) {
    console.log(`${model} → 例外: ${String(e).slice(0, 160)}`);
  }
}
