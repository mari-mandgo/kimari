/**
 * 個人情報のマスキング。
 *
 * LLM（OrcaRouter）へ送る前に必ず通す。施主の氏名・電話・住所・メールを
 * トークンへ置き換え、対応表は「このサーバーのメモリ内だけ」で保持する。
 * 生成された文書は unmask() で元に戻すため、利用者から見た体験は変わらない。
 *
 * 設計意図: ルーターは振り分けのためにプロンプト本文を解析する。
 * つまり「素通し」ではないので、個人情報は渡さないという前提で組む。
 */

export type MaskMap = Record<string, string>;

type Rule = { label: string; re: RegExp };

const RULES: Rule[] = [
  // メールアドレス
  { label: 'MAIL', re: /[\w.+-]+@[\w-]+\.[\w.-]+/g },
  // 電話番号（携帯・固定）
  // ※ 郵便番号より必ず先に処理すること。
  //   090-1234-5678 の前半 090-1234 が郵便番号として先に拾われてしまうため。
  { label: 'TEL', re: /0\d{1,4}-\d{1,4}-\d{3,4}|0\d{9,10}/g },
  // 郵便番号（前後に数字やハイフンが続くものは電話番号の一部なので除外）
  { label: 'ZIP', re: /〒?(?<![\d-])\d{3}-\d{4}(?![\d-])/g },
  // 住所（都道府県から丁目・番地まで）
  {
    label: 'ADDR',
    re: /(?:北海道|(?:京都|大阪)府|東京都|.{2,3}県)?[^\s、。]{1,6}[市区町村][^\s、。]{0,12}?(?:\d+丁目)?(?:\d+(?:-\d+)*番?地?)?/g,
  },
];

/** 住所は誤検出しやすいので、市区町村を含む場合だけ採用する */
function looksLikeAddress(s: string): boolean {
  return /[市区町村]/.test(s) && s.length >= 4;
}

/**
 * @param text  マスク対象のテキスト
 * @param names 案件に登録済みの固有名詞（施主名・会社名など）。完全一致で置換する
 */
export function maskPII(text: string, names: string[] = []): { masked: string; map: MaskMap } {
  const map: MaskMap = {};
  const counters: Record<string, number> = {};
  let masked = text;

  const put = (label: string, original: string): string => {
    // 同じ値は同じトークンに寄せる（文書内で一貫させるため）
    const found = Object.entries(map).find(([, v]) => v === original);
    if (found) return found[0];
    counters[label] = (counters[label] ?? 0) + 1;
    const token = `[[${label}_${counters[label]}]]`;
    map[token] = original;
    return token;
  };

  // 1. 登録済みの固有名詞（氏名など）。敬称が付いていても拾えるよう名前部分だけ置換する
  for (const name of names.filter(Boolean)) {
    const re = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    masked = masked.replace(re, () => put('NAME', name));
  }

  // 2. パターンで拾えるもの
  for (const rule of RULES) {
    masked = masked.replace(rule.re, (m) => {
      if (rule.label === 'ADDR' && !looksLikeAddress(m)) return m;
      return put(rule.label, m);
    });
  }

  return { masked, map };
}

/** LLMの出力に残っているトークンを元の値へ戻す */
export function unmask(text: string, map: MaskMap): string {
  let out = text;
  for (const [token, original] of Object.entries(map)) {
    out = out.split(token).join(original);
  }
  return out;
}

/** 検証用: マスク後のテキストに個人情報が残っていないかを確認する */
export function verifyMasked(masked: string, map: MaskMap): { ok: boolean; leaked: string[] } {
  const leaked = Object.values(map).filter((v) => masked.includes(v));
  return { ok: leaked.length === 0, leaked };
}
