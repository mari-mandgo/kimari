/**
 * 拾い出しの下書きを実際に出させて、実務者が赤入れするためのスクリプト。
 *
 *   npm run dev -- -p 3001
 *   node scripts/try-takeoff.mjs
 *
 * 同じ変更でも、工事のどの段階かで追加見積の中身は変わる。
 * 契約前は工事の全部が対象、解体後は「延びた分」だけ。そこを見比べる。
 */
const ENDPOINT = process.env.KIMARI_ENDPOINT ?? 'http://localhost:3001/api/takeoff';
const USD_JPY = 155;

const CHANGE = {
  title: 'キッチンの位置を600mm窓側へ移動',
  detail: 'システムキッチンを現状の位置から窓側へ600mm移動する。',
  reason: '給排水の移設が発生するため、床下配管のやり直しが必要になる。',
  quote: 'キッチン、もう少し窓側に寄せられないかな。60センチくらい？',
};

const CASES = [
  {
    label: '契約前（見積を作る段階）',
    phaseLabel: '見積提出',
    context: 'プランと仕様が固まり、見積を作成している段階の打ち合わせ。',
  },
  {
    label: '解体後（現地確認）',
    phaseLabel: '解体確認',
    context:
      '解体が終わり、現地を一緒に確認しながら調整を決めている打ち合わせ。スケルトンの状態。',
  },
];

for (const c of CASES) {
  const started = Date.now();
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...CHANGE,
      phaseLabel: c.phaseLabel,
      context: c.context,
      model: 'orcarouter/fusion-flash',
    }),
  });
  const j = await res.json();

  console.log('='.repeat(70));
  console.log(c.label);
  console.log('='.repeat(70));

  if (!res.ok) {
    console.log('エラー:', String(j.error).slice(0, 300));
    continue;
  }

  console.log(`判定した段階: ${j.phase_week}週目・${j.phase}`);
  console.log(`  ${j.phase_reason}\n`);

  console.log(`■ 追加見積に載せる ${j.work_items.length}項目`);
  let current = '';
  for (const w of j.work_items) {
    if (w.category !== current) {
      current = w.category;
      console.log(`  【${current}】`);
    }
    const mark = w.kind === '増分' ? ' [増分]' : '';
    console.log(`    ${w.name}（${w.unit}）${mark}`);
    if (w.note) console.log(`        ${w.note}`);
  }

  console.log(`\n■ もともとの工事に含まれるので外した ${j.already_included.length}件`);
  for (const e of j.already_included) console.log(`  ・${e.name} … ${e.why}`);

  console.log('\n■ 現調で確認すべきこと');
  for (const m of j.missing_info) console.log(`  ・${m}`);

  console.log('\n■ 注意点');
  for (const m of j.cautions) console.log(`  ・${m}`);

  const call = j.calls[0];
  const usd = call.costUsd ?? call.estCostUsd;
  console.log(
    `\n[${call.servedModel} / ${((Date.now() - started) / 1000).toFixed(1)}秒 / 約${(usd * USD_JPY).toFixed(2)}円]\n`
  );
}
