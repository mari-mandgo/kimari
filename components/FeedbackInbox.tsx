'use client';

import { useState } from 'react';
import type { Project } from '@/lib/store';

type Row = {
  meetingId: string;
  meetingDate: string;
  id: string;
  name: string;
  body: string;
  createdAt: string;
  read: boolean;
};

/** 施主から届いた連絡。未読を上に出す */
export default function FeedbackInbox({ project }: { project: Project }) {
  const initial: Row[] = project.meetings
    .flatMap((m) =>
      (m.feedbacks ?? []).map((f) => ({
        meetingId: m.id,
        meetingDate: m.date,
        ...f,
      }))
    )
    .sort((a, b) => Number(a.read) - Number(b.read) || b.createdAt.localeCompare(a.createdAt));

  const [rows, setRows] = useState<Row[]>(initial);
  const unread = rows.filter((r) => !r.read);

  if (rows.length === 0) return null;

  async function markRead(id: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, read: true } : r)));
    await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markFeedbackRead: id }),
    });
  }

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-[15px] font-bold">
        施主からの連絡
        {unread.length > 0 && (
          <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-bold text-white">
            未読 {unread.length}
          </span>
        )}
      </h2>

      <div className="mt-4 space-y-3">
        {rows.map((r) => (
          <div
            key={r.id}
            className={`rounded-xl border p-4 ${
              r.read ? 'border-slate-200 bg-white' : 'border-rose-200 bg-rose-50'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
              <span className="font-bold text-slate-700">{r.name || 'お客様'}</span>
              <span>{r.meetingDate} の打ち合わせについて</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-[1.9]">{r.body}</p>
            {!r.read && (
              <button
                onClick={() => markRead(r.id)}
                className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-[12px] font-bold text-white"
              >
                確認しました
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
