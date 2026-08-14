'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Meeting } from '@/lib/store';

/**
 * 保存済みの打ち合わせ。
 *
 * ここがある理由は2つ。
 * 1. 仕分けた結果は保存されているのに、現場ページを開き直すと見えなくなっていた
 * 2. 仕分けたものが即座に施主ページへ出ていた。
 *    試しに流した分ややり直した分まで施主に見えてしまう
 *
 * AIの結果を人が確かめてから公開する。それがこの画面の役目。
 */
export default function MeetingList({
  projectId,
  meetings,
  shareToken,
  openId,
  onOpen,
}: {
  projectId: string;
  meetings: Meeting[];
  shareToken?: string;
  /** いま下に開いている打ち合わせ */
  openId?: string | null;
  /** 仕分けた直後と同じ画面に戻す */
  onOpen?: (m: Meeting) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>, key: string) {
    setBusy(key);
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const sorted = [...meetings].sort((a, b) => b.date.localeCompare(a.date));
  const publishedCount = sorted.filter((m) => m.published).length;

  if (sorted.length === 0) return null;

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-[15px] font-bold">
        保存した打ち合わせ {sorted.length}件
        <span className="ml-2 text-[13px] font-normal text-slate-500">
          施主ページに公開中 {publishedCount}件
        </span>
      </h2>
      <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
        仕分けただけでは施主に見えません。内容を確かめてから公開してください。
        <br />
        「開く」を押すと、仕分けた直後と同じ画面に戻ります。3つの文書の作成、拾い出し、
        ルーターへ送った本文の確認は、そこから行えます。
      </p>

      <ul className="mt-3 space-y-2">
        {sorted.map((m) => {
          const costs = m.items.filter((i) => i.category === 'cost_impact').length;
          const risks = m.items.filter((i) => i.category === 'risk').length;
          const isOpen = open === m.id;

          return (
            <li key={m.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="text-[15px] font-bold">{m.date}</span>
                {m.published ? (
                  <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-bold text-white">
                    公開中
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                    未公開
                  </span>
                )}
                <span className="text-[12px] text-slate-500">
                  {m.items.length}件
                  {costs > 0 && ` ・ 要見積 ${costs}`}
                  {risks > 0 && ` ・ ズレ ${risks}`}
                  {m.documents ? ' ・ 文書あり' : ''}
                </span>

                <div className="ml-auto flex flex-wrap gap-2">
                  {onOpen && (
                    <button
                      onClick={() => onOpen(m)}
                      className={`min-h-[34px] rounded-lg px-3 text-[12px] font-bold ${
                        openId === m.id
                          ? 'bg-slate-200 text-slate-700'
                          : 'border border-slate-900 text-slate-900'
                      }`}
                    >
                      {openId === m.id ? '開いています' : '開く'}
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(isOpen ? null : m.id)}
                    className="min-h-[34px] rounded-lg border border-slate-300 px-3 text-[12px] font-bold text-slate-700"
                  >
                    {isOpen ? '閉じる' : '中身を見る'}
                  </button>
                  <button
                    onClick={() =>
                      patch({ publishMeeting: { id: m.id, published: !m.published } }, m.id)
                    }
                    disabled={busy === m.id}
                    className={`min-h-[34px] rounded-lg px-3 text-[12px] font-bold disabled:opacity-40 ${
                      m.published
                        ? 'border border-slate-300 text-slate-700'
                        : 'bg-slate-900 text-white'
                    }`}
                  >
                    {busy === m.id ? '…' : m.published ? '公開をやめる' : '施主ページに公開'}
                  </button>
                  <button
                    onClick={() => {
                      if (!confirm(`${m.date} の打ち合わせを削除します。元に戻せません。`)) return;
                      patch({ deleteMeeting: m.id }, m.id);
                    }}
                    disabled={busy === m.id}
                    className="min-h-[34px] rounded-lg px-2 text-[12px] text-slate-400 underline disabled:opacity-40"
                  >
                    削除
                  </button>
                </div>
              </div>

              {m.summary && (
                <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-slate-600">
                  {m.summary}
                </p>
              )}

              {isOpen && (
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                  {m.items.map((i, k) => (
                    <div key={k} className="text-[13px] leading-relaxed">
                      <span
                        className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          i.category === 'cost_impact'
                            ? 'bg-rose-600 text-white'
                            : i.category === 'risk'
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {i.category === 'cost_impact'
                          ? '要見積'
                          : i.category === 'risk'
                            ? 'ズレ'
                            : i.category === 'pending'
                              ? '保留'
                              : '決定'}
                      </span>
                      <span className="font-bold">{i.title}</span>
                      <span className="text-slate-500">　{i.detail}</span>
                    </div>
                  ))}
                  {shareToken && m.published && (
                    <a
                      href={`/s/${shareToken}#m-${m.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-[12px] text-slate-500 underline"
                    >
                      施主ページで見る
                    </a>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
