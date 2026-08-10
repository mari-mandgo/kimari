/**
 * マンション専有部リノベーションの標準工程。
 *
 * 業界で広く使われている「14週」の進め方に沿う。
 * 週数はあくまで標準で、現場ごとに前後する。
 *
 * この工程がプロダクトの土台になる理由は2つ。
 *
 * 1. **追加見積は「契約」を境に意味が変わる。**
 *    契約前（0〜3週）は、まだ何も約束していないので工事の全部が見積の対象。
 *    契約後（4週〜）は、契約に含まれる工事はやって当たり前なので、
 *    追加になるのは「その変更がなければ発生しなかった分」だけになる。
 *
 * 2. **施主にとっては「いま何週目で、次に何があるか」が最大の関心事。**
 *    工事は3か月以上かかる。いまどこにいるのかが見えないと不安になる。
 *
 * lib/store.ts の Project.stages（自由入力の段階）とは別物。
 * あちらは現場ごとの任意の目印、こちらは業界標準の物差し。
 */

export type Phase = {
  /** 標準の週。0週目が初回打合せ */
  week: number;
  /** 社内で使う呼び方 */
  label: string;
  /** 施主に見せる言い方 */
  ownerLabel: string;
  /** 施主向けの説明。この週に何が起きるか */
  ownerDetail: string;
  /** 契約より後か。追加見積の判定がここで変わる */
  afterContract: boolean;
  /** 工事が始まっているか */
  onSite: boolean;
};

export const PHASES: Phase[] = [
  {
    week: 0,
    label: '事前調査・初回打合せ',
    ownerLabel: 'はじめの打ち合わせ',
    ownerDetail: '現地を調査し、間取りの方向性を決めます。',
    afterContract: false,
    onSite: false,
  },
  {
    week: 1,
    label: '仕様決定',
    ownerLabel: '仕上げと設備を決める',
    ownerDetail: 'サンプルを見ながら、床・壁の仕上げ、キッチンや浴室を選びます。',
    afterContract: false,
    onSite: false,
  },
  {
    week: 2,
    label: '仕様調整・見積依頼',
    ownerLabel: '見積の準備',
    ownerDetail: '図面を仕上げ、工事会社へ見積を依頼します。管理組合への工事申請もこの時期です。',
    afterContract: false,
    onSite: false,
  },
  {
    week: 3,
    label: '見積提出',
    ownerLabel: 'お見積のご提示',
    ownerDetail: '見積と工程表をお出しします。金額の調整もここで行います。',
    afterContract: false,
    onSite: false,
  },
  {
    week: 4,
    label: 'ご契約',
    ownerLabel: 'ご契約',
    ownerDetail: '工事の内容と金額が確定します。ここから先の変更は、追加のお見積が必要になります。',
    afterContract: true,
    onSite: false,
  },
  {
    week: 5,
    label: '発注・工事用図面',
    ownerLabel: '材料の発注',
    ownerDetail: '材料と設備を発注し、工事用の図面を仕上げます。',
    afterContract: true,
    onSite: false,
  },
  {
    week: 6,
    label: '着工',
    ownerLabel: '工事のはじまり',
    ownerDetail: '近隣へご挨拶し、養生をして解体に入ります。',
    afterContract: true,
    onSite: true,
  },
  {
    week: 7,
    label: '解体確認',
    ownerLabel: '解体後の現地確認',
    ownerDetail:
      '解体が終わり、図面では分からなかった部分が見えてきます。現地を一緒に見て、必要な調整を決めます。',
    afterContract: true,
    onSite: true,
  },
  {
    week: 8,
    label: '下地工事',
    ownerLabel: '下地と配管の工事',
    ownerDetail: '壁や床の下地を組み、配管・配線を通します。',
    afterContract: true,
    onSite: true,
  },
  {
    week: 9,
    label: '中間確認',
    ownerLabel: '中間の現地確認',
    ownerDetail: '壁で隠れる前に、コンセントの位置などを現地で確認します。',
    afterContract: true,
    onSite: true,
  },
  {
    week: 10,
    label: 'ボード・フローリング工事',
    ownerLabel: '壁と床ができる',
    ownerDetail: '壁のボードを張り、床を仕上げます。部屋の形が見えてきます。',
    afterContract: true,
    onSite: true,
  },
  {
    week: 11,
    label: '塗装工事',
    ownerLabel: '塗装・仕上げ',
    ownerDetail: '壁と天井を仕上げます。',
    afterContract: true,
    onSite: true,
  },
  {
    week: 12,
    label: '器具付',
    ownerLabel: '設備・照明の取り付け',
    ownerDetail: 'キッチン・洗面・照明などを取り付けます。',
    afterContract: true,
    onSite: true,
  },
  {
    week: 13,
    label: '竣工確認',
    ownerLabel: '仕上がりの確認',
    ownerDetail: '一緒に仕上がりを確認します。追加・変更があった分の増減も、ここで精算します。',
    afterContract: true,
    onSite: true,
  },
  {
    week: 14,
    label: 'お引渡し',
    ownerLabel: 'お引渡し',
    ownerDetail: '鍵をお渡しし、設備の使い方をご説明します。',
    afterContract: true,
    onSite: true,
  },
];

/**
 * 施主に見せる5つの節目。14週は細かすぎるので束ねる。
 * 施主が知りたいのは「いま何をしていて、次に何があるか」であって、週番号ではない。
 */
export type PhaseGroup = {
  no: string;
  label: string;
  /** この節目に含まれる週 */
  weeks: number[];
  /** 節目を表す絵。SVGで描く */
  icon: 'talk' | 'plan' | 'doc' | 'build' | 'home';
};

export const PHASE_GROUPS: PhaseGroup[] = [
  { no: '01', label: '初回打合せ', weeks: [0], icon: 'talk' },
  { no: '02', label: 'プラン・仕様', weeks: [1, 2], icon: 'plan' },
  { no: '03', label: 'お見積・ご契約', weeks: [3, 4, 5], icon: 'doc' },
  { no: '04', label: '工事', weeks: [6, 7, 8, 9, 10, 11, 12], icon: 'build' },
  { no: '05', label: '竣工・お引渡し', weeks: [13, 14], icon: 'home' },
];

/**
 * 施主ページに並べる「プロジェクトの歩み」の6枚。
 *
 * 打ち合わせの回数で増やすのではなく、最初から6枚出す。
 * 工事の全体像が最初から見えていたほうが、施主は先を見通せる。
 * 済んだところは明るく、これからのところは沈めて出す。
 *
 * 写真は現場の実物ではなく、共通のイメージを使う。
 * 現場の写真は「資料・写真」と「打ち合わせの記録」にあるので、
 * ここは流れを掴むための絵でよい。
 */
export type StoryStep = {
  no: string;
  label: string;
  /** この段階に入る週。ここを過ぎていれば「済み」 */
  fromWeek: number;
  detail: string;
  icon: PhaseGroup['icon'];
  /** public/story/ に置く画像。無ければ絵柄なしで出す */
  image: string;
};

export const STORY_STEPS: StoryStep[] = [
  {
    no: '01',
    label: '初回打ち合わせ',
    fromWeek: 0,
    detail: 'ご要望やイメージをうかがい、現地を調査します。',
    icon: 'talk',
    image: '/story/01.jpg',
  },
  {
    no: '02',
    label: 'プラン・仕様決定',
    fromWeek: 1,
    detail: '間取りを決め、サンプルを見ながら仕上げと設備を選びます。',
    icon: 'plan',
    image: '/story/02.jpg',
  },
  {
    no: '03',
    label: 'お見積・ご契約',
    fromWeek: 3,
    detail: 'お見積と工程表をご提示し、内容と金額を確定します。',
    icon: 'doc',
    image: '/story/03.jpg',
  },
  {
    no: '04',
    label: '工事開始',
    fromWeek: 6,
    detail: '近隣へご挨拶し、養生をして解体に入ります。',
    icon: 'build',
    image: '/story/04.jpg',
  },
  {
    no: '05',
    label: '工事の様子',
    fromWeek: 8,
    detail: '下地と配管が進み、壁と床ができていきます。',
    icon: 'build',
    image: '/story/05.jpg',
  },
  {
    no: '06',
    label: '竣工・お引渡し',
    fromWeek: 13,
    detail: '一緒に仕上がりを確認し、鍵をお渡しします。',
    icon: 'home',
    image: '/story/06.jpg',
  },
];

export function groupOfWeek(week: number | null | undefined): PhaseGroup | null {
  if (week === null || week === undefined) return null;
  return PHASE_GROUPS.find((g) => g.weeks.includes(week)) ?? null;
}

/** 進行率。14週を100%とする */
export function progressOfWeek(week: number | null | undefined): number | null {
  if (week === null || week === undefined) return null;
  return Math.round((Math.min(Math.max(week, 0), 14) / 14) * 100);
}

export function phaseByWeek(week: number | undefined): Phase | null {
  if (week === undefined || week === null) return null;
  return PHASES.find((p) => p.week === week) ?? null;
}

export function phaseByLabel(label: string | undefined): Phase | null {
  if (!label) return null;
  return PHASES.find((p) => p.label === label) ?? null;
}

/** 拾い出しのプロンプトへ渡す一覧 */
export function phaseListForPrompt(): string {
  return PHASES.map(
    (p) => `${p.week}週目｜${p.label}｜${p.afterContract ? '契約後' : '契約前'}`
  ).join('\n');
}
