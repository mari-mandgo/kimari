/**
 * ファイル種別の定義。
 * lib/files.ts は Node 専用モジュール（fs / crypto）を読むため、
 * ブラウザ側からも使う定数と型はこちらに置く（lib/roles.ts と同じ分離）。
 */

/** 施主にも見せるので、種別で出し分けられるようにしておく */
export const FILE_KINDS = ['写真', '図面', 'パース', '見積', 'その他'] as const;
export type FileKind = (typeof FILE_KINDS)[number];

export type StoredFile = {
  id: string;
  /** 保存時のファイル名（拡張子つき） */
  stored: string;
  /** 元のファイル名 */
  original: string;
  kind: FileKind;
  mime: string;
  size: number;
  /** 施主に見せるひとこと */
  caption: string;
  /** どの打ち合わせに紐づくか。無ければ現場全体 */
  meetingId?: string;
  uploadedAt: string;
};
