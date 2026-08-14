/**
 * 案件の保存。
 *
 * 9日間で作りきるため、データベースは使わずJSONファイルで持つ。
 * 提出物はリポジトリとデモ動画なので、ローカルで動けば足りる。
 * スキーマを変えたくなったらファイルを消せば済む、という身軽さを優先した。
 */

import fs from 'node:fs';
import path from 'node:path';
import type { Item } from '@/app/api/analyze/route';
import type { StoredFile } from './files';
// 型だけ。実体は読まない（クライアントへ node のモジュールを持ち込まないため）
import type { CallMeta } from './orca';
import { DATA_ROOT, IS_DEMO } from './demo';

// 公開デモは demo-data/ を読む。実案件が混ざったまま公開する事故を、置き場所ごと分けて防ぐ
const DIR = path.join(process.cwd(), DATA_ROOT, 'projects');

/**
 * 施主からの連絡。共有ページを見て気づいたことを、その場で送ってもらう。
 * どの打ち合わせについての話かが紐づくので、「あの時の話ですけど」が消える。
 */
export type Feedback = {
  id: string;
  /** 名乗ってもらう。空でも送れる */
  name: string;
  body: string;
  /** 何についての連絡か。資料からの質問なら、その資料の名前 */
  about?: string;
  /**
   * 施主が添えたファイル。現場のファイル置き場に入り、id で結びつける。
   * 「ここが気になる」を言葉だけで伝えるのは難しいので、写真を送れるようにする。
   */
  fileIds?: string[];
  createdAt: string;
  read: boolean;
};

export type Meeting = {
  id: string;
  date: string;
  feedbacks?: Feedback[];
  transcript: string;
  items: Item[];
  summary: string;
  /** 共有リンクのトークン。施主・職人はこれで読む */
  shareToken: string;
  /**
   * 施主ページに出すかどうか。
   * 仕分けただけでは出さない。AIの結果を人が確かめてから公開する。
   * 試しに流したものや、やり直した分が施主に見えてしまうのを防ぐ。
   */
  published?: boolean;
  documents?: {
    owner?: string;
    worker?: string;
    internal?: string;
    workerTranslated?: string;
    lang?: string;
  };
  /**
   * ルーターへ実際に送った本文（マスク後）と、そのときの伏せ字の記録。
   *
   * あとから見られないと、「何を外へ出したのか」を自分たちで確かめられない。
   * 音声を外に出さない設計を主張する以上、その場でしか見られないのでは根拠にならない。
   */
  sentToRouter?: string;
  privacy?: { maskedCount: number; tokens: string[]; verified: boolean };
  /** そのときのモデル・トークン・原価。あとから「この打ち合わせにいくらかかったか」を言える */
  calls?: CallMeta[];
  /**
   * この打ち合わせが工事のどの段階だったか。
   * 契約の前後で追加見積の意味が変わるので、拾い出しをやり直すときに必要になる。
   * 現場の phaseWeek は最新の状態を指すため、過去の打ち合わせの再現には使えない。
   */
  phaseLabel?: string;
  createdAt: string;
};

/** 物件の基本情報。施主と共有するページに出す */
export type PropertyInfo = {
  address: string;
  /** 専有面積など。単位ごと文字列で持つ（㎡と坪が混ざるため） */
  area: string;
  structure: string;
  /** 築年数。「25年」のように単位ごと */
  age: string;
  /** 竣工予定日 */
  completionDate: string;
};

export type Member = {
  name: string;
  /** 施主 / 設計担当 / コーディネーター / 施工管理 など */
  role: string;
  /**
   * 顔写真。data URL で持つ（外部ストレージを使わないため）。
   * 未設定でも、名前がこの現場の登録ユーザーと一致すれば
   * そのアカウントの写真を施主ページで使う。二重に登録させないため。
   */
  avatar?: string;
};

/** 工程の段階。今どこにいるかを施主に見せるためのもの */
export type Stage = {
  label: string;
  /** 実施日または予定日 */
  date: string;
  done: boolean;
};

export const DEFAULT_STAGES: Stage[] = [
  { label: '初回打合せ', date: '', done: false },
  { label: 'プラン提案', date: '', done: false },
  { label: '見積もり提示', date: '', done: false },
  { label: '工事開始', date: '', done: false },
  { label: '竣工', date: '', done: false },
];

// 見積書の定数・型はクライアントからも読むので lib/estimate-kinds.ts にある
export type { Estimate, EstimateRow, EstimateTemplate } from './estimate-kinds';
import type { Estimate } from './estimate-kinds';

export type Project = {
  id: string;
  /** 現場名。「田中様邸リノベーション」など */
  name: string;
  /** 施主と共有する物件情報。すべて手入力 */
  property?: PropertyInfo;
  members?: Member[];
  stages?: Stage[];
  /** マスク対象の固有名詞 */
  names: string[];
  /**
   * 現場ごとの共有トークン。
   * 打ち合わせ単位ではなく現場単位で渡すことで、
   * 施主は1つのURLをブックマークするだけで、打ち合わせが増えるたびに
   * 内容が積み上がっていく。
   */
  shareToken: string;
  /** 職人などを現場へ招くためのコード */
  inviteCode?: string;
  /** 現場を作った人 */
  ownerId?: string;
  /** この現場に参加しているユーザー（施主は含まない） */
  memberUserIds?: string[];
  /** 写真・図面・パース・見積など */
  files?: StoredFile[];
  /** 施主ページの先頭に出す写真。未設定なら共通のヒーロー画像を使う */
  heroFileId?: string;
  /**
   * いま標準工程の何週目か（lib/phases.ts）。
   * 打ち合わせを記録するたびに、選ばれた段階で更新される。
   * 施主ページの進行状況の土台になる。
   */
  phaseWeek?: number;
  /** 追加見積。打ち合わせの拾い出しから作られる */
  estimates?: Estimate[];
  /**
   * 当初見積書から読み取った「契約に含まれる工事」。
   * これがあると、拾い出しの差分判定が推測でなく事実にもとづくものになる。
   */
  contractScope?: {
    /** 読み取り元のファイル */
    fileId: string;
    fileName: string;
    included: { category: string; name: string }[];
    excluded: string[];
    notes: string[];
    readAt: string;
  };
  meetings: Meeting[];
  createdAt: string;
  updatedAt: string;
};

export type ProjectSummary = {
  id: string;
  name: string;
  /** 施主からの未読の連絡 */
  unreadFeedback: number;
  meetingCount: number;
  lastMeetingDate: string | null;
  /** 未対応の要見積件数 */
  openEstimates: number;
  /** 直近の期限 */
  nextDue: { date: string; title: string; owner: string } | null;
  updatedAt: string;
};

function ensureDir() {
  // デモのディスクは読み取り専用。作ろうとすると例外で全部止まる
  if (IS_DEMO) return;
  fs.mkdirSync(DIR, { recursive: true });
}

export function newId(prefix = ''): string {
  const s = Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  return prefix ? `${prefix}-${s}` : s;
}

/** userId を渡すと、その人が参加している現場だけを返す */
export function listProjects(userId?: string): ProjectSummary[] {
  ensureDir();
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json'));
  const list = files
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')) as Project;
      } catch {
        return null;
      }
    })
    .filter((p): p is Project => p !== null)
    .filter((p) => !userId || (p.memberUserIds ?? []).includes(userId) || p.ownerId === userId)
    .map(summarize);
  return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** その人がこの現場を見てよいか */
export function canAccess(p: Project, userId: string): boolean {
  return p.ownerId === userId || (p.memberUserIds ?? []).includes(userId);
}

export function joinProject(p: Project, userId: string): Project {
  const ids = new Set(p.memberUserIds ?? []);
  ids.add(userId);
  p.memberUserIds = [...ids];
  return saveProject(p);
}

function summarize(p: Project): ProjectSummary {
  const all = p.meetings.flatMap((m) => m.items);
  const openEstimates = all.filter((i) => i.needs_estimate).length;

  const dues = all
    .filter((i) => i.due_date)
    .map((i) => ({ date: i.due_date as string, title: i.title, owner: i.owner }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const dates = p.meetings.map((m) => m.date).sort();

  const unreadFeedback = p.meetings.reduce(
    (n, m) => n + (m.feedbacks ?? []).filter((f) => !f.read).length,
    0
  );

  return {
    id: p.id,
    name: p.name,
    unreadFeedback,
    meetingCount: p.meetings.length,
    lastMeetingDate: dates.length ? dates[dates.length - 1] : null,
    openEstimates,
    nextDue: dues[0] ?? null,
    updatedAt: p.updatedAt,
  };
}

/** 古いデータに無い項目を、読み込み時に補う */
function migrate(p: Project): Project {
  let changed = false;
  if (!p.shareToken) {
    p.shareToken = newId('s');
    changed = true;
  }
  if (!p.stages) {
    p.stages = DEFAULT_STAGES.map((s) => ({ ...s }));
    changed = true;
  }
  if (!p.members) {
    p.members = [];
    changed = true;
  }
  if (!p.property) {
    p.property = { address: '', area: '', structure: '', age: '', completionDate: '' };
    changed = true;
  }
  if (!p.inviteCode) {
    p.inviteCode = makeInviteCode();
    changed = true;
  }
  if (!p.memberUserIds) {
    p.memberUserIds = p.ownerId ? [p.ownerId] : [];
    changed = true;
  }
  if (changed) saveProject(p);
  return p;
}

/** 口頭でも伝えられるよう、紛らわしい文字を除いた6桁にする */
export function makeInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function findByInviteCode(code: string): Project | null {
  ensureDir();
  const target = code.trim().toUpperCase();
  for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.json'))) {
    try {
      const p = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')) as Project;
      if (p.inviteCode === target) return migrate(p);
    } catch {
      // 壊れたファイルは飛ばす
    }
  }
  return null;
}

export function getProject(id: string): Project | null {
  ensureDir();
  const file = path.join(DIR, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return migrate(JSON.parse(fs.readFileSync(file, 'utf8')) as Project);
  } catch {
    return null;
  }
}

export function saveProject(p: Project): Project {
  const next = { ...p, updatedAt: new Date().toISOString() };
  /*
    デモは保存しない。
    画面には保存できたように返すので、その場では最後まで触れる。
    次に開いた人には元の状態で見える。誰かの操作が次の人に残らないようにする。
  */
  if (IS_DEMO) return next;
  ensureDir();
  fs.writeFileSync(path.join(DIR, `${p.id}.json`), JSON.stringify(next, null, 2), 'utf8');
  return next;
}

export function createProject(name: string, names: string[] = [], ownerId?: string): Project {
  const now = new Date().toISOString();
  const p: Project = {
    id: newId('p'),
    name: name.trim() || '名称未設定の現場',
    names,
    inviteCode: makeInviteCode(),
    ownerId,
    memberUserIds: ownerId ? [ownerId] : [],
    property: { address: '', area: '', structure: '', age: '', completionDate: '' },
    members: [],
    stages: DEFAULT_STAGES.map((s) => ({ ...s })),
    shareToken: newId('s'),
    meetings: [],
    createdAt: now,
    updatedAt: now,
  };
  return saveProject(p);
}

export function deleteProject(id: string): boolean {
  if (IS_DEMO) return false;
  const file = path.join(DIR, `${id}.json`);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  return true;
}

/**
 * 共有トークンから現場を引く。施主・職人向けの読み取り専用ページで使う。
 * 現場のトークンでも、古い打ち合わせ単位のトークンでも引けるようにしてある。
 */
export function findByShareToken(token: string): Project | null {
  ensureDir();
  for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.json'))) {
    try {
      const p = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')) as Project;
      if (p.shareToken === token) return migrate(p);
      if (p.meetings.some((m) => m.shareToken === token)) return migrate(p);
    } catch {
      // 壊れたファイルは飛ばす
    }
  }
  return null;
}
