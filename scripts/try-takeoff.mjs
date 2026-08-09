/**
 * 拾い出しの下書きを実際に出させて、実務者が赤入れするためのスクリプト。
 *
 *   npm run dev -- -p 3001
 *   node scripts/try-takeoff.mjs
 *
 * プロンプト（lib/prompts.ts の TAKEOFF_SYSTEM）を直したら、これで出し直して見比べる。
 */
const ENDPOINT = process.env.KIMARI_ENDPOINT ?? 'http://localhost:3001/api/takeoff';
const USD_JPY = 155;

const CASES = [
  {
    title: 'キッチンの位置を600mm窓側へ移動',
    detail: 'システムキッチンを現状の位置から窓側へ600mm移動する。',
    reason: '給排水の移設が発生するため、床下配管のやり直しが必要になる。',
    quote: 'キッチン、もう少し窓側に寄せられないかな。60センチくらい？',
  },
  {
    title: '洗面所の床をクロスからタイルへ変更',
    detail: '洗面所の床仕上げを、標準の塩ビタイルからタイル貼りに変更する。',
    reason: '仕上げのグレードが上がり、下地の造作も変わるため。',
    quote: '洗面所の床、タイルにしたいんですけど',
  },
];

for (const c of CASES) {
  const started = Date.now();
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...c, model: 'orcarouter/fusion-flash' }),
  });
  const j = await res.json();

  console.log('='.repeat(70));
  console.log(c.title);
  console.log('='.repeat(70));

  if (!res.ok) {
    console.log('エラー:', String(j.error).slice(0, 300));
    continue;
  }

  let current = '';
  for (const w of j.work_items) {
    if (w.category !== current) {
      current = w.category;
      console.log(`\n【${current}】`);
    }
    const basis = w.qty_basis ? ` ←${w.qty_basis}` : '';
    console.log(`  ${w.name}（${w.unit}）${basis}`);
    if (w.note) console.log(`      ${w.note}`);
  }

  console.log('\n■ 現調で確認すべきこと');
  for (const m of j.missing_info) console.log(`  ・${m}`);

  console.log('\n■ 注意点');
  for (const m of j.cautions) console.log(`  ・${m}`);

  const call = j.calls[0];
  const usd = call.costUsd ?? call.estCostUsd;
  console.log(
    `\n[${call.servedModel} / ${((Date.now() - started) / 1000).toFixed(1)}秒 / 約${(usd * USD_JPY).toFixed(2)}円 / ${j.work_items.length}項目]\n`
  );
}
