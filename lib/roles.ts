/**
 * 役割の定義。
 * lib/auth.ts は Node 専用のモジュール（fs / crypto）を読むため、
 * クライアントからも使う定数はこちらに置く。
 *
 * 施主は登録しないので、ここには含めない。共有リンクを開くだけで読める。
 */
export const ROLES = ['設計', '現場管理', '職人'] as const;
export type Role = (typeof ROLES)[number];

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  createdAt: string;
};
