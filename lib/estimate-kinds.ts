/**
 * 見積書の定義。
 * lib/store.ts は Node 専用モジュール（fs）を読むため、
 * ブラウザ側からも使う定数と型はこちらに置く（lib/roles.ts / lib/file-kinds.ts と同じ分離）。
 */

export const ESTIMATE_TEMPLATES = [
  { key: 'detail', label: '明細のみ', hint: '社内・工事会社とのやり取り用' },
  { key: 'cover', label: '表紙付き', hint: '施主へお出しする追加見積書' },
  { key: 'delta', label: '工事金額増減表', hint: '竣工確認で追加と減額をまとめて精算' },
] as const;
export type EstimateTemplate = (typeof ESTIMATE_TEMPLATES)[number]['key'];

export type EstimateRow = {
  category: string;
  name: string;
  unit: string;
  /** 数量・単価は人が入れる。AIには出させない */
  qty: number | null;
  unitPrice: number | null;
  note: string;
  /** 減額の行。増減表で差し引く */
  isDeduction?: boolean;
};

/**
 * 追加見積。
 * 金額はすべて人が入れる。単価は会社ごと・時期ごとに違い、
 * 変更工事の見積は建設業法上、事業者が書面で提示する責任を負うため。
 */
export type Estimate = {
  id: string;
  /** 追加見積 No.1 のような通し番号 */
  no: number;
  template: EstimateTemplate;
  /** 件名 */
  title: string;
  /** 宛名。「◯◯様」 */
  clientName: string;
  /** 発行日 YYYY-MM-DD */
  issuedOn: string;
  /** どの打ち合わせ・どの変更から作ったか */
  meetingId?: string;
  sourceTitle?: string;
  rows: EstimateRow[];
  /** 消費税率（%） */
  taxRate: number;
  note: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};
