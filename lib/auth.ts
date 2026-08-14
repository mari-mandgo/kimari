/**
 * ユーザーと認証。
 *
 * 外部の認証基盤やライブラリを足さず、Node標準の scrypt で組む。
 * 依存を増やすとその分だけ「なぜ安全か」を説明できなくなるため。
 *
 * - パスワードは scrypt でハッシュ（ソルト付き・比較は時間一定）
 * - セッションは httpOnly Cookie ＋ サーバー側のトークン管理
 * - 施主は登録させない。共有リンクを開くだけで読める
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import { DATA_ROOT, DEMO_USER, IS_DEMO } from './demo';

const DIR = path.join(process.cwd(), DATA_ROOT);
const USERS = path.join(DIR, 'users.json');
const SESSIONS = path.join(DIR, 'sessions.json');

export const SESSION_COOKIE = 'kimari_session';
const SESSION_DAYS = 30;

export { ROLES } from './roles';
import type { Role } from './roles';
export type { Role };

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** 所属する会社のID。会社名では突き合わせない（同名の別会社があるため） */
  companyId?: string;
  /** プロフィール画像。data URL で持つ（外部ストレージを使わないため） */
  avatar?: string;
  passwordHash: string;
  createdAt: string;
};

import type { PublicUser } from './roles';
export type { PublicUser };
import { getCompany } from './companies';

type Session = { token: string; userId: string; expiresAt: string };

function read<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

function write(file: string, data: unknown) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

/* ---------- パスワード ---------- */

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, expected] = stored.split(':');
  if (scheme !== 'scrypt' || !salt || !expected) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expected, 'hex');
  // 長さが違うと timingSafeEqual が例外を投げるため先に確認する
  if (derived.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(derived, expectedBuf);
}

/* ---------- ユーザー ---------- */

export function listUsers(): User[] {
  return read<User[]>(USERS, []);
}

export function toPublic(u: User): PublicUser {
  const { passwordHash: _omit, ...rest } = u;
  void _omit;
  // 会社名は表示のためだけに添える。判定に使うのは常に companyId のほう
  return { ...rest, companyName: getCompany(u.companyId)?.name };
}

export function findUserByEmail(email: string): User | null {
  const norm = email.trim().toLowerCase();
  return listUsers().find((u) => u.email === norm) ?? null;
}

export function findUserById(id: string): User | null {
  return listUsers().find((u) => u.id === id) ?? null;
}

export function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: Role;
  companyId?: string;
  avatar?: string;
}): { user?: PublicUser; error?: string } {
  const email = input.email.trim().toLowerCase();
  if (!input.name.trim()) return { error: '氏名を入力してください' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'メールアドレスの形式が正しくありません' };
  if (input.password.length < 8) return { error: 'パスワードは8文字以上にしてください' };
  if (findUserByEmail(email)) return { error: 'このメールアドレスは登録済みです' };

  const user: User = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    email,
    role: input.role,
    companyId: input.companyId,
    avatar: input.avatar,
    passwordHash: hashPassword(input.password),
    createdAt: new Date().toISOString(),
  };
  const users = listUsers();
  users.push(user);
  write(USERS, users);
  return { user: toPublic(user) };
}

export function updateUser(
  id: string,
  patch: Partial<Pick<User, 'name' | 'role' | 'avatar' | 'companyId'>>
): PublicUser | null {
  const users = listUsers();
  const u = users.find((x) => x.id === id);
  if (!u) return null;
  Object.assign(u, patch);
  write(USERS, users);
  return toPublic(u);
}

/* ---------- セッション ---------- */

function listSessions(): Session[] {
  return read<Session[]>(SESSIONS, []);
}

export function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString();
  const sessions = listSessions().filter((s) => s.expiresAt > new Date().toISOString());
  sessions.push({ token, userId, expiresAt });
  write(SESSIONS, sessions);
  return token;
}

export function destroySession(token: string) {
  write(SESSIONS, listSessions().filter((s) => s.token !== token));
}

export function userFromToken(token: string | undefined): PublicUser | null {
  /*
    デモは常にこの人として通す。
    見知らぬ人にアカウントを作らせないため。
    セッションの保存も書き込みなので、そもそも成立しない。
  */
  if (IS_DEMO) return DEMO_USER;
  if (!token) return null;
  const s = listSessions().find((x) => x.token === token);
  if (!s) return null;
  if (s.expiresAt <= new Date().toISOString()) {
    destroySession(token);
    return null;
  }
  const u = findUserById(s.userId);
  return u ? toPublic(u) : null;
}
