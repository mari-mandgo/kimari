/**
 * デモ用の打ち合わせ履歴を作る。
 *
 * 14週の進め方では、契約までに4回の打ち合わせがある。
 * デモ動画では解体確認の回をその場で録音・仕分けするので、
 * それ以前の4回は履歴として残っていればよい。
 *
 * 中身は作り物にせず、実際に /api/analyze へ通す。
 * 画面に出ているものが本当にAIの出力である状態を保つため。
 *
 *   npx next start -p 3001   （または npm run dev）
 *   node scripts/seed-history.mjs
 */
import fs from 'node:fs';

const BASE = process.env.KIMARI_BASE ?? 'http://localhost:3001';
const EMAIL = process.env.KIMARI_EMAIL ?? 'mari@example.com';
const PASSWORD = process.env.KIMARI_PASSWORD ?? 'password123';

let cookie = '';
async function call(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers ?? {}) };
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(BASE + path, { ...options, headers });
  const sc = res.headers.get('set-cookie');
  if (sc) cookie = sc.split(';')[0];
  return { status: res.status, json: await res.json().catch(() => ({})) };
}
const post = (p, b) => call(p, { method: 'POST', body: JSON.stringify(b) });
const patch = (p, b) => call(p, { method: 'PATCH', body: JSON.stringify(b) });

await post('/api/auth', { action: 'login', email: EMAIL, password: PASSWORD });
const { json: list } = await call('/api/projects');
const projectId = list.projects[0].id;
console.log('現場:', projectId);

const meetings = JSON.parse(fs.readFileSync('docs/demo/meetings.json', 'utf8'));

for (const m of meetings) {
  process.stdout.write(`${m.date}  ${m.phase} … 仕分け中`);
  const started = Date.now();

  const a = await post('/api/analyze', {
    transcript: m.transcript,
    names: ['田中'],
    model: 'orcarouter/fusion-flash',
    meetingDate: m.date,
  });
  if (a.status !== 200) {
    console.log(`  失敗: ${a.json.error}`);
    continue;
  }

  const saved = await patch(`/api/projects/${projectId}`, {
    phaseWeek: m.week,
    meeting: {
      date: m.date,
      transcript: m.transcript,
      items: a.json.items,
      summary: a.json.summary,
    },
  });

  // いま作った回を探して公開する
  const created = saved.json.project.meetings.find((x) => x.date === m.date && !x.published);
  if (created) {
    await patch(`/api/projects/${projectId}`, {
      publishMeeting: { id: created.id, published: true },
    });
  }

  const cost = a.json.calls[0];
  const usd = cost.costUsd ?? cost.estCostUsd ?? 0;
  console.log(
    `  → ${a.json.items.length}件 / ${((Date.now() - started) / 1000).toFixed(0)}秒 / 約${(usd * 155).toFixed(2)}円`
  );
}

// 履歴を入れ終えたら、現場の段階は解体確認（7週目）に戻す
await patch(`/api/projects/${projectId}`, { phaseWeek: 7 });

const { json: after } = await call(`/api/projects/${projectId}`);
console.log('\n公開中の打ち合わせ:');
for (const m of after.project.meetings.filter((x) => x.published).sort((a, b) => a.date.localeCompare(b.date))) {
  console.log(`  ${m.date}  ${m.items.length}件  ${m.summary.slice(0, 40)}…`);
}
