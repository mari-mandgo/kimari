/**
 * 既に登録済みのアカウントに会社を紐づける。
 * 会社の仕組みを後から入れたので、それ以前に作ったアカウント用。
 *
 *   node scripts/set-company.mjs <メール> "会社名" ["所在地"] ["電話"]
 *
 * 同じ会社に2人目を入れるときは、発行された会社コードを使って
 * 新規登録画面の「会社コードで参加」から入る。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [email, name, address, tel] = process.argv.slice(2);
if (!email || !name) {
  console.error('使い方: node scripts/set-company.mjs <メール> "会社名" ["所在地"] ["電話"]');
  process.exit(1);
}

const DIR = path.join(process.cwd(), 'data');
const USERS = path.join(DIR, 'users.json');
const COMPANIES = path.join(DIR, 'companies.json');

const read = (f, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return fallback;
  }
};

const users = read(USERS, []);
const user = users.find((u) => u.email === email.trim().toLowerCase());
if (!user) {
  console.error(`${email} が見つかりません`);
  process.exit(1);
}

const companies = read(COMPANIES, []);

// 紛らわしい文字（0/O, 1/I）は使わない。電話で伝えることがあるため
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let code;
do {
  code = Array.from({ length: 6 }, () => CHARS[crypto.randomInt(CHARS.length)]).join('');
} while (companies.some((c) => c.inviteCode === code));

const company = {
  id: `c-${crypto.randomBytes(5).toString('hex')}`,
  name: name.trim(),
  address: address?.trim() || undefined,
  tel: tel?.trim() || undefined,
  inviteCode: code,
  ownerUserId: user.id,
  createdAt: new Date().toISOString(),
};

companies.push(company);
user.companyId = company.id;

fs.mkdirSync(DIR, { recursive: true });
fs.writeFileSync(COMPANIES, JSON.stringify(companies, null, 2), 'utf8');
fs.writeFileSync(USERS, JSON.stringify(users, null, 2), 'utf8');

console.log(`${user.name}（${user.email}）を「${company.name}」に所属させました。`);
console.log(`会社コード: ${company.inviteCode}`);
console.log('同僚の方は、新規登録の「会社コードで参加」からこのコードを入れてください。');
