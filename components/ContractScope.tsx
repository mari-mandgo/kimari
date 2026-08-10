'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Project } from '@/lib/store';

/**
 * 当初見積書を読んで、この契約に含まれる工事を取り出す。
 *
 * 拾い出しの差分判定は、これが無いと「もともとの契約に含まれるか」を
 * AIが常識から推し量ることになる。見積書を読めば、その現場で実際に
 * 何が契約されたのかが分かる。推測を事実に置き換えるための機能。
 */
export default function ContractScope({ project }: { project: Project }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [fileId, setFileId] = useState('');

  // Excelの見積だけを対象にする。PDFは中身の構造が読めないため
  const candidates = (project.files ?? []).filter(
    (f) => f.kind === '見積' && /\.xlsx?$/i.test(f.original)
  );
  const scope = project.contractScope;

  async function read() {
    const target = fileId || candidates[0]?.id;
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/projects/${project.id}/contract-scope`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: target, model: 'orcarouter/fusion-flash' }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? '読み取れませんでした');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-[15px] font-bold">当初見積書の読み取り</h2>
      <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
        上で<b>種別「見積」としてアップロードしたExcel</b>を読むと、
        <b>この契約に何が含まれているか</b>が分かります。
        拾い出しはそれを避けて、追加になる分だけを出すようになります。
      </p>

      {scope ? (
        <>
          <div className="mt-3 rounded-xl bg-emerald-50 p-4">
            <p className="text-[14px] font-bold text-emerald-900">
              {scope.fileName} を読み込み済み
            </p>
            <p className="mt-0.5 text-[13px] text-emerald-900/80">
              契約に含まれる工事 {scope.included.length}件を把握しています
            </p>
            <button
              onClick={() => setOpen((v) => !v)}
              className="mt-2 text-[12px] text-emerald-900 underline"
            >
              {open ? '閉じる' : '中身を見る'}
            </button>
          </div>

          {open && (
            <div className="scroll-clean mt-3 max-h-[320px] overflow-y-auto rounded-xl border border-slate-200 p-4">
              <ul className="space-y-1">
                {scope.included.map((x, i) => (
                  <li key={i} className="text-[13px]">
                    <span className="mr-2 text-[11px] text-slate-400">{x.category}</span>
                    {x.name}
                  </li>
                ))}
              </ul>
              {scope.excluded.length > 0 && (
                <>
                  <p className="mt-4 text-[13px] font-bold">別途工事・対象外</p>
                  <ul className="mt-1 space-y-1">
                    {scope.excluded.map((s, i) => (
                      <li key={i} className="text-[13px] text-slate-600">
                        ・{s}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {scope.notes.length > 0 && (
                <>
                  <p className="mt-4 text-[13px] font-bold">前提として書かれていたこと</p>
                  <ul className="mt-1 space-y-1">
                    {scope.notes.map((s, i) => (
                      <li key={i} className="text-[13px] text-slate-600">
                        ・{s}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </>
      ) : candidates.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-4 text-[13px] leading-relaxed text-slate-500">
          Excelの見積書がまだありません。
          <b>「資料・図面・写真」から、種別「見積」でアップロード</b>してください。
          （いまは .xlsx に対応しています）
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {candidates.length > 1 && (
          <select
            value={fileId || candidates[0].id}
            onChange={(e) => setFileId(e.target.value)}
            className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-[14px]"
          >
            {candidates.map((f) => (
              <option key={f.id} value={f.id}>
                {f.original}
              </option>
            ))}
          </select>
        )}
        {candidates.length > 0 && (
          <button
            onClick={read}
            disabled={busy}
            className="min-h-[44px] rounded-xl bg-slate-900 px-5 text-[14px] font-bold text-white disabled:opacity-40"
          >
            {busy ? '読み取っています…' : scope ? '読み直す' : '見積書を読み込む'}
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-[13px] text-rose-700">{error}</p>}
    </section>
  );
}
