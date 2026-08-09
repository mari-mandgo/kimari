/**
 * デモ用の現場データを作る。
 *
 * 実際の録音（data/audio/uchiawase.txt）を1回目の打ち合わせとして登録し、
 * 仕分けと3文書の生成まで通す。開発サーバーを起動した状態で実行すること。
 *
 *   node scripts/seed-demo.mjs
 */
import fs from 'node:fs';

const BASE = process.env.KIMARI_BASE ?? 'http://localhost:3001';
const EMAIL = process.env.KIMARI_EMAIL ?? 'mari@example.com';
const PASSWORD = process.env.KIMARI_PASSWORD ?? 'password123';

let cookie = '';

async function api(path, options = {}) {
  const headers = { ...(options.headers ?? {}) };
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(BASE + path, { ...options, headers });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path} → ${res.status} ${JSON.stringify(json).slice(0, 200)}`);
  return json;
}

const post = (path, body) =>
  api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const patch = (path, body) =>
  api(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

console.log('ログイン');
await post('/api/auth', { action: 'login', email: EMAIL, password: PASSWORD });

console.log('現場を作成');
const { project } = await post('/api/projects', {
  name: '田中様邸リノベーション',
  names: ['田中'],
});

console.log('物件情報・メンバー・進行段階を設定');
await patch(`/api/projects/${project.id}`, {
  property: {
    address: '東京都渋谷区◯◯町1-2-3',
    area: '85.42㎡',
    structure: 'RC造',
    age: '25年',
    completionDate: '2026-12-20',
  },
  members: [
    { name: '田中 太郎', role: '施主' },
    { name: '金子 麻里', role: '設計' },
    { name: '佐藤 健', role: '現場管理' },
  ],
  stages: [
    { label: '初回打合せ', date: '2026-07-20', done: true },
    { label: 'プラン提案', date: '2026-08-02', done: true },
    { label: '見積もり提示', date: '', done: false },
    { label: '工事開始', date: '', done: false },
    { label: '竣工', date: '2026-12-20', done: false },
  ],
});

const transcript = fs.readFileSync('data/audio/uchiawase.txt', 'utf8');

console.log('仕分け中…（1分ほどかかります）');
const analysis = await post('/api/analyze', {
  transcript,
  names: ['田中'],
  model: 'orcarouter/fusion-flash',
  meetingDate: '2026-08-09',
});
console.log(`  ${analysis.items.length}件を抽出`);

await patch(`/api/projects/${project.id}`, {
  meeting: { date: '2026-08-09', transcript, items: analysis.items, summary: analysis.summary },
});

console.log('3文書とベトナム語訳を作成中…');
const docs = await post('/api/documents', {
  items: analysis.items,
  summary: analysis.summary,
  names: ['田中'],
  lang: 'ベトナム語',
});

const current = await api(`/api/projects/${project.id}`);
const meeting = current.project.meetings[0];
await patch(`/api/projects/${project.id}`, {
  meeting: {
    id: meeting.id,
    date: meeting.date,
    transcript,
    items: analysis.items,
    summary: analysis.summary,
    documents: {
      owner: docs.owner,
      worker: docs.worker,
      internal: docs.internal,
      workerTranslated: docs.workerTranslated ?? undefined,
      lang: docs.lang ?? undefined,
    },
  },
});

const calls = [...analysis.calls, ...docs.calls];
const usd = calls.reduce((sum, c) => sum + (c.costUsd ?? c.estCostUsd ?? 0), 0);

console.log('');
console.log('完了しました');
console.log(`  現場ページ　: ${BASE}/p/${current.project.id}`);
console.log(`  施主ページ　: ${BASE}/s/${current.project.shareToken}`);
console.log(`  招待コード　: ${current.project.inviteCode}`);
console.log(`  この処理の原価: 約${(usd * 155).toFixed(2)}円（${calls.length}回の呼び出し）`);
