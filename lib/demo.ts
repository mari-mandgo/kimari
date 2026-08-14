/**
 * 公開デモの設定。
 *
 * 本番の作りは「自社のサーバー1台に全部載せる」で、そこには書き込みも
 * 文字起こし用のPythonもある。公開デモはそれとは前提が違う。
 *
 * - **書き込みをしない。** 誰が何をしても、次に開いた人には元の状態で見える。
 *   ホスティング先のディスクは読み取り専用なので、そもそも書けない
 * - **録音・文字起こしを出さない。** faster-whisper（Python）が動かない。
 *   代わりに、実際に録った打ち合わせ音声を聴けるようにしてある
 * - **ログインを出さない。** 見知らぬ人にアカウントを作らせない。
 *   セッションの保存も書き込みなので、どのみち成立しない
 * - **LLMの呼び出しに上限を置く。** 鍵はこちらの持ち出しなので、
 *   誰でも押せる状態のまま無制限にはしない
 *
 * 読むデータは data/ ではなく demo-data/ に置く。
 * 実案件が混ざった状態のまま公開する事故を、置き場所ごと分けて防ぐ。
 */

export const IS_DEMO = process.env.KIMARI_DEMO === '1';

/** demo-data/ に置いた現場のID。デモを開くとこの現場に入る */
export const DEMO_PROJECT_ID = process.env.KIMARI_DEMO_PROJECT ?? '';

/** データの置き場所。デモは demo-data/ を読む（書きはしない） */
export const DATA_ROOT = IS_DEMO ? 'demo-data' : 'data';

/**
 * デモで名乗る人。
 * 実在のアカウントではなく、この現場の設計担当として画面を出すためだけのもの。
 */
export const DEMO_USER = {
  id: 'demo-user',
  name: '金子麻里',
  email: 'demo@example.com',
  role: '設計' as const,
  company: 'KIMARI デモ',
  createdAt: '2026-08-01T00:00:00.000Z',
};

/**
 * LLMを呼べる回数の上限（サーバーの起動単位）。
 *
 * 1件あたり0.42円なので、金額そのものは小さい。
 * それでも上限を置くのは、公開した鍵を無制限に叩ける状態にしないため。
 * ホスティング先が複数のインスタンスに分かれると、この数え方では
 * 全体の上限にならない。**完全な防御ではなく、暴走を止めるための栓**として置く。
 */
const LIMIT = Number(process.env.KIMARI_DEMO_LIMIT ?? 200);
let used = 0;

export function takeDemoQuota(): { ok: boolean; left: number } {
  if (!IS_DEMO) return { ok: true, left: Infinity };
  if (used >= LIMIT) return { ok: false, left: 0 };
  used += 1;
  return { ok: true, left: LIMIT - used };
}
