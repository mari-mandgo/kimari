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

const DIR = path.join(process.cwd(), 'data', 'projects');

export type Meeting = {
  id: string;
  date: string;
  transcript: string;
  items: Item[];
  summary: string;
  /** 共有リンクのトークン。施主・職人はこれで読む */
  shareToken: string;
  documents?: {
    owner?: string;
    worker?: string;
    internal?: string;
    workerTranslated?: string;
    lang?: string;
  };
  createdAt: string;
};

export type Project = {
  id: string;
  /** 現場名。「田中様邸リノベーション」など */
  name: string;
  /** マスク対象の固有名詞 */
  names: string[];
  /**
   * 現場ごとの共有トークン。
   * 打ち合わせ単位ではなく現場単位で渡すことで、
   * 施主は1つのURLをブックマークするだけで、打ち合わせが増えるたびに
   * 内容が積み上がっていく。
   */
  shareToken: string;
  meetings: Meeting[];
  createdAt: string;
  updatedAt: string;
};

export type ProjectSummary = {
  id: string;
  name: string;
  meetingCount: number;
  lastMeetingDate: string | null;
  /** 未対応の要見積件数 */
  openEstimates: number;
  /** 直近の期限 */
  nextDue: { date: string; title: string; owner: string } | null;
  updatedAt: string;
};

function ensureDir() {
  fs.mkdirSync(DIR, { recursive: true });
}

export function newId(prefix = ''): string {
  const s = Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  return prefix ? `${prefix}-${s}` : s;
}

export function listProjects(): ProjectSummary[] {
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
    .map(summarize);
  return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function summarize(p: Project): ProjectSummary {
  const all = p.meetings.flatMap((m) => m.items);
  const openEstimates = all.filter((i) => i.needs_estimate).length;

  const dues = all
    .filter((i) => i.due_date)
    .map((i) => ({ date: i.due_date as string, title: i.title, owner: i.owner }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const dates = p.meetings.map((m) => m.date).sort();

  return {
    id: p.id,
    name: p.name,
    meetingCount: p.meetings.length,
    lastMeetingDate: dates.length ? dates[dates.length - 1] : null,
    openEstimates,
    nextDue: dues[0] ?? null,
    updatedAt: p.updatedAt,
  };
}

/** 古いデータには現場トークンが無いので、読み込み時に補う */
function migrate(p: Project): Project {
  if (!p.shareToken) {
    p.shareToken = newId('s');
    saveProject(p);
  }
  return p;
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
  ensureDir();
  const next = { ...p, updatedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(DIR, `${p.id}.json`), JSON.stringify(next, null, 2), 'utf8');
  return next;
}

export function createProject(name: string, names: string[] = []): Project {
  const now = new Date().toISOString();
  const p: Project = {
    id: newId('p'),
    name: name.trim() || '名称未設定の現場',
    names,
    shareToken: newId('s'),
    meetings: [],
    createdAt: now,
    updatedAt: now,
  };
  return saveProject(p);
}

export function deleteProject(id: string): boolean {
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
