import fs from 'node:fs';
import path from 'node:path';

/**
 * 拾い出しへの現場からの補正。
 *
 * 拾い出しの型は会社ごとに違う。単価が会社ごとに違うのと同じで、
 * 商流（ガス工事を自社で持つか、ガス会社が施主と直接契約するか）や
 * 標準仕様（ユニットバスか造作浴室か）で、立てるべき項目が変わる。
 * 書く側が全部を先回りするのは無理なので、使う人が直せるようにする。
 *
 * ただし **効く範囲は会社の中だけ** に閉じる。
 * scope は現場を作った人のID（＝その会社）。
 * 他社の現場に招かれた職人が、こちらの判定を書き換えられてはいけない。
 *
 * 判定基準そのものの誤り（どの会社にも当てはまるもの）は、
 * ここではなく takeoff-reports.jsonl に集め、開発側が本体のプロンプトを直す。
 */

export type TakeoffRule = {
  id: string;
  /** どの会社のルールか。現場を作った人のID */
  scope: string;
  /** 補正の本文。そのままプロンプトへ入る */
  text: string;
  /** どの変更を拾い出したときの指摘か。文脈として残す */
  context: string;
  by: string;
  at: string;
};

const FILE = path.join(process.cwd(), 'data', 'takeoff-rules.json');
const REPORTS = path.join(process.cwd(), 'data', 'takeoff-reports.jsonl');

function read(): TakeoffRule[] {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8')) as TakeoffRule[];
  } catch {
    return [];
  }
}

function write(rules: TakeoffRule[]) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(rules, null, 2), 'utf8');
}

export function listRules(scope: string): TakeoffRule[] {
  if (!scope) return [];
  return read().filter((r) => r.scope === scope);
}

export function addRule(input: {
  scope: string;
  text: string;
  context: string;
  by: string;
}): TakeoffRule {
  const rule: TakeoffRule = {
    id: `r-${Math.random().toString(36).slice(2, 10)}`,
    scope: input.scope,
    text: input.text.trim(),
    context: input.context.trim(),
    by: input.by,
    at: new Date().toISOString(),
  };
  const rules = read();
  rules.push(rule);
  write(rules);
  return rule;
}

/** 取り消しは同じ会社のルールに対してのみ */
export function removeRule(id: string, scope: string) {
  write(read().filter((r) => !(r.id === id && r.scope === scope)));
}

/**
 * 貯まった補正をプロンプトの追記に変える。
 * 新しいものほど下に置く。競合したときは後に書いてあるほうが効きやすいため。
 */
export function rulesAsPrompt(scope: string): string {
  const rules = listRules(scope);
  if (rules.length === 0) return '';
  const lines = rules.map((r) => `- ${r.text}`).join('\n');
  return `

## この会社での補正（実際に現場から指摘されたもの。上のどの記述よりも優先します）

${lines}`;
}

/** 判定基準そのものへの指摘。すぐには効かせず、開発側が読んで本体を直す */
export function addReport(input: { text: string; context: string; by: string }) {
  fs.mkdirSync(path.dirname(REPORTS), { recursive: true });
  const line =
    JSON.stringify({
      at: new Date().toISOString(),
      by: input.by,
      context: input.context.trim(),
      text: input.text.trim(),
    }) + '\n';
  fs.appendFileSync(REPORTS, line, 'utf8');
}
