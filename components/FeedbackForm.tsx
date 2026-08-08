'use client';

import { useState } from 'react';

/**
 * 施主が、その回について気づいたことをその場で送るためのフォーム。
 * 見た瞬間に言えないと忘れてしまう、という前提で置いている。
 */
export default function FeedbackForm({
  token,
  meetingId,
  sentCount,
}: {
  token: string;
  meetingId: string;
  sentCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/share/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId, name, body }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? '送れませんでした');
      setDone(true);
      setBody('');
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

  return (
    <div className="mt-4">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white text-[14px] font-bold text-slate-700"
        >
          この回について伝える
          {sentCount > 0 && (
            <span className="ml-2 text-[12px] font-normal text-slate-400">
              送信済み {sentCount}件
            </span>
          )}
        </button>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[13px] leading-relaxed text-slate-600">
            気になったこと、思い出したこと、認識が違うところ。
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
            rows={4}
            placeholder="例：洗面所のタイル、白ではなくグレーで話していたと思います"
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-[14px] leading-relaxed"
          />
          {error && <p className="mt-2 text-[13px] text-rose-700">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button
              onClick={send}
              disabled={busy || !body.trim()}
              className="min-h-[44px] flex-1 rounded-xl bg-slate-900 text-[15px] font-bold text-white disabled:opacity-40"
            >
              {busy ? '送っています…' : '担当者へ送る'}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 text-[14px] text-slate-600"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
