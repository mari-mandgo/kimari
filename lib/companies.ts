import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * 会社。拾い出しのルールを共有する単位。
 *
 * **会社名では突き合わせない。** 「株式会社山田工務店」は全国にあるので、
 * 名前が同じというだけで束ねると、別会社のルールが混ざる。
 * 参加は必ず会社コード経由にして、文字列一致では絶対に繋がないようにする。
 *
 * 住所・電話は識別のために持つ。参加した本人が「入った会社が合っているか」を
 * 目で確かめるためのもので、突合には使わない。
 */

export type Company = {
  id: string;
  name: string;
  address?: string;
  tel?: string;
  /** 社員を招くためのコード。現場の招待コードと同じ考え方 */
  inviteCode: string;
  /** 会社を作った人 */
  ownerUserId: string;
  createdAt: string;
};

const FILE = path.join(process.cwd(), 'data', 'companies.json');

function read(): Company[] {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8')) as Company[];
  } catch {
    return [];
  }
}

function write(list: Company[]) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2), 'utf8');
}

/** 紛らわしい文字（0/O, 1/I）を外す。電話で伝えることがあるため */
function newCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[crypto.randomInt(chars.length)];
  return read().some((c) => c.inviteCode === code) ? newCode() : code;
}

export function getCompany(id: string | undefined): Company | null {
  if (!id) return null;
  return read().find((c) => c.id === id) ?? null;
}

export function findByInviteCode(code: string): Company | null {
  const norm = code.trim().toUpperCase();
  if (!norm) return null;
  return read().find((c) => c.inviteCode === norm) ?? null;
}

export function createCompany(input: {
  name: string;
  address?: string;
  tel?: string;
  ownerUserId: string;
}): Company {
  const company: Company = {
    id: `c-${crypto.randomBytes(5).toString('hex')}`,
    name: input.name.trim(),
    address: input.address?.trim() || undefined,
    tel: input.tel?.trim() || undefined,
    inviteCode: newCode(),
    ownerUserId: input.ownerUserId,
    createdAt: new Date().toISOString(),
  };
  const list = read();
  list.push(company);
  write(list);
  return company;
}
