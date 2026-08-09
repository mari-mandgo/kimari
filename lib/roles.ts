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
  /**
   * 所属する会社のID。拾い出しのルールはこの単位で共有する。
   * 単価が会社ごとに違うのと同じで、立てる項目や商流も会社ごとに違うため。
   * 会社名ではなくIDで持つ。同名の別会社が混ざらないようにするため。
   */
  companyId?: string;
  /** 表示用の会社名。突合には使わない */
  companyName?: string;
  avatar?: string;
  createdAt: string;
};

/**
 * ルールが効く範囲。
 * 会社に属していればその会社、まだ属していなければ本人だけ。
 * 1人で使い始めても壊れないように、未所属でも範囲は必ず決まる。
 */
export function scopeOf(user: { id: string; companyId?: string }): string {
  return user.companyId ? `company:${user.companyId}` : `user:${user.id}`;
}
