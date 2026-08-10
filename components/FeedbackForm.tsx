'use client';

import { useState } from 'react';

/**
 * 施主が気づいたことをその場で送るためのフォーム。
 * 見た瞬間に言えないと忘れてしまう、という前提で置いている。
 *
 * 置き場所で文言が変わる。
 * meeting … 打ち合わせの記録の下。その回についての指摘
 * file    … 資料・写真の下。「この図面のここ」という聞き方が一番多い
 * general … 相談ページ。打ち合わせに限らない問い合わせ
 *
 * 写真を添えられるようにしているのは、「ここが気になる」を
 * 言葉だけで伝えるのが難しいため。
 */
export default function FeedbackForm({
  token,
  meetingId,
  sentCount,
  variant = 'meeting',
  about,
  openByDefault = false,
}: {
  token: string;
  meetingId: string;
  sentCount: number;
  variant?: 'meeting' | 'file' | 'general';
  /** 何についての連絡か。資料からの質問ならその資料の名前 */
  about?: string;
  openByDefault?: boolean;
}) {
  const isGeneral = variant === 'general';
  const isFile = variant === 'file';

  const [open, setOpen] = useState(openByDefault);
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('meetingId', meetingId);
      form.append('name', name);
      form.append('body', body);
      if (about) form.append('about', about);
      for (const f of files) form.append('files', f);

      const r = await fetch(`/api/share/${token}`, { method: 'POST', body: form });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? '送れませんでした');
      setDone(true);
      setBody('');
      setFiles([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-[14px] leading-relaxed text-emerald-900">
        担当者に届きました。確認のうえご連絡いたします。
      </p>
    );
  }

  const label = isGeneral ? 'メッセージを送る' : isFile ? 'これについて質問する' : 'この回について伝える';

  return (
    <div className={isFile ? 'mt-3' : 'mt-4'}>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className={`flex w-full items-center justify-center gap-2 rounded-xl font-bold ${
            // 相談窓口は見つけてもらえないと意味がないので、こちらだけ目立たせる
            isGeneral
              ? 'min-h-[44px] bg-slate-900 text-[14px] text-white'
              : isFile
                ? 'min-h-[36px] border border-slate-200 bg-slate-50 text-[12px] text-slate-600'
                : 'min-h-[44px] border border-slate-300 bg-white text-[14px] text-slate-700'
          }`}
        >
          {isGeneral && (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
              <path
                d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4 3.5V16H6.5A2.5 2.5 0 0 1 4 13.5z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          {label}
          {sentCount > 0 && !isGeneral && !isFile && (
            <span className="text-[12px] font-normal text-slate-400">送信済み {sentCount}件</span>
          )}
        </button>
      ) : (
        <div className={isGeneral ? '' : 'rounded-xl border border-slate-200 bg-slate-50 p-4'}>
          {about && (
            <p className="mb-2 rounded-lg bg-white px-3 py-2 text-[12px] text-slate-600">
              <span className="font-bold">対象：</span>
              {about}
            </p>
          )}
          <p className="text-[13px] leading-relaxed text-slate-600">
            {isGeneral
              ? '打ち合わせのことでも、それ以外のことでも構いません。'
              : isFile
                ? 'この資料について、気になるところをお書きください。'
                : '気になったこと、思い出したこと、認識が違うところ。'}
            <br />
            短くて構いませんので、そのままお書きください。
          </p>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="お名前（任意）"
            className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-[14px]"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={isGeneral ? 6 : 4}
            placeholder={
              isGeneral
                ? '例：工事の音について、隣の方から言われたことがあり相談したいです'
                : isFile
                  ? '例：この図面の玄関収納、奥行きをもう少し取れますか'
                  : '例：洗面所のタイル、白ではなくグレーで話していたと思います'
            }
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-[14px] leading-relaxed"
          />

          {/* 写真を添えられるようにする。言葉だけより早く伝わる */}
          <label className="mt-2 flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white text-[13px] text-slate-600">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
              <path d="M4 16.5V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" strokeLinejoin="round" />
              <path d="m4 15.5 4-3.5 4 3.5 3-2.5 5 4.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="9" cy="8.5" r="1.3" />
            </svg>
            写真・資料を添える（5件まで）
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => setFiles([...(e.target.files ?? [])].slice(0, 5))}
            />
          </label>

          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-[12px] text-slate-600">
                  <span className="min-w-0 flex-1 truncate">{f.name}</span>
                  <span className="shrink-0 text-slate-400">{Math.round(f.size / 1024)}KB</span>
                  <button
                    onClick={() => setFiles(files.filter((_, k) => k !== i))}
                    className="shrink-0 text-slate-400 underline"
                  >
                    外す
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && <p className="mt-2 text-[13px] text-rose-700">{error}</p>}

          <div className="mt-3 flex gap-2">
            <button
              onClick={send}
              disabled={busy || !body.trim()}
              className="min-h-[44px] flex-1 rounded-xl bg-slate-900 text-[15px] font-bold text-white disabled:opacity-40"
            >
              {busy ? '送っています…' : '担当者へ送る'}
            </button>
            {!openByDefault && (
              <button
                onClick={() => setOpen(false)}
                className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 text-[14px] text-slate-600"
              >
                閉じる
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
