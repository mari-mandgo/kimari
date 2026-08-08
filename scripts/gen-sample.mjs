// docs/demo-transcript.txt から lib/sample.ts を生成する
import fs from 'node:fs';

const text = fs.readFileSync('docs/demo-transcript.txt', 'utf8').trim();

// テンプレートリテラルに埋めるためのエスケープ
const escaped = text
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\$\{/g, '\\${');

const out = `/**
 * デモ用のサンプル記録（docs/demo-daihon.md から生成）。
 * 登場する氏名・電話番号・住所は、すべて架空のものです。
 * 再生成: node scripts/gen-sample.mjs
 */

export const SAMPLE_TRANSCRIPT = \`${escaped}\`;

export const SAMPLE_NAMES = '田中';
`;

fs.writeFileSync('lib/sample.ts', out, 'utf8');
console.log(`lib/sample.ts を生成しました（${text.length} 文字）`);
