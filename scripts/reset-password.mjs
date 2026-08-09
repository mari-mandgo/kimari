/**
 * パスワードの再設定（ローカル管理者用）。
 *
 * メール送信の仕組みを持たないため、サーバーの持ち主が自分の端末で
 * 直接実行する形にしている。新しいパスワードはこの端末の外に出ない。
 *
 *   node scripts/reset-password.mjs <メールアドレス> <新しいパスワード>
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.log('使い方: node scripts/reset-password.mjs <メールアドレス> <新しいパスワード>');
  process.exit(1);
}
if (password.length < 8) {
  console.log('パスワードは8文字以上にしてください');
  process.exit(1);
}

const usersPath = path.join(process.cwd(), 'data', 'users.json');
const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
const user = users.find((u) => u.email === email.trim().toLowerCase());

if (!user) {
  console.log(`見つかりません: ${email}`);
  console.log('登録済み:', users.map((u) => u.email).join(', '));
  process.exit(1);
}

// lib/auth.ts の hashPassword と同じ形式
const salt = crypto.randomBytes(16).toString('hex');
const derived = crypto.scryptSync(password, salt, 64).toString('hex');
user.passwordHash = `scrypt:${salt}:${derived}`;

fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf8');

// 既存のセッションを無効化する（他の端末に残っているログインを切る）
const sessionsPath = path.join(process.cwd(), 'data', 'sessions.json');
try {
  const sessions = JSON.parse(fs.readFileSync(sessionsPath, 'utf8'));
  fs.writeFileSync(
    sessionsPath,
    JSON.stringify(sessions.filter((s) => s.userId !== user.id), null, 2),
    'utf8'
  );
} catch {
  // セッションファイルが無ければそれでよい
}

console.log(`${user.name}（${user.email}）のパスワードを再設定しました。`);
console.log('新しいパスワードでログインし直してください。');
