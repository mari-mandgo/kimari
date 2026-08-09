'use client';

import { useState } from 'react';
import type { Project } from '@/lib/store';
import { FILE_KINDS, type StoredFile } from '@/lib/file-kinds';

/** 現場の写真・図面・見積。施主の共有ページにも出る */
export default function FileBoard({ project }: { project: Project }) {
  const [files, setFiles] = useState<StoredFile[]>(project.files ?? []);
  const [kind, setKind] = useState<string>(FILE_KINDS[0]);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function upload(list: FileList | null) {
    if (!list || list.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(list)) {
        const form = new FormData();
        form.set('file', file);
        form.set('kind', kind);
        form.set('caption', caption);
        const r = await fetch(`/api/projects/${project.id}/files`, { method: 'POST', body: form });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? 'アップロードできませんでした');
        setFiles((prev) => [...prev, j.file]);
      }
      setCaption('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(f: StoredFile) {
    setFiles((prev) => prev.filter((x) => x.stored !== f.stored));
    await fetch(`/api/projects/${project.id}/files/${f.stored}`, { method: 'DELETE' });
  }

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span>
          <span className="text-[15px] font-bold">資料・図面・写真</span>
          <span className="ml-2 text-[13px] text-slate-500">{files.length}件</span>
        </span>
        <span className="text-[13px] font-bold text-slate-400">{open ? '閉じる' : '開く'}</span>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 py-5">
          <div className="flex flex-wrap gap-2">
            {FILE_KINDS.map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`min-h-[40px] rounded-xl px-4 text-[13px] font-bold ${
                  kind === k ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="ひとこと説明（施主にも表示されます）"
            className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-[14px]"
          />

          <label className="mt-3 flex min-h-[80px] cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-[14px] font-bold text-slate-500">
            {busy ? 'アップロードしています…' : `${kind}を選ぶ（複数可・1件20MBまで）`}
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={(e) => upload(e.target.files)}
              className="hidden"
              disabled={busy}
            />
          </label>

          {error && <p className="mt-2 text-[13px] text-rose-700">{error}</p>}

          {files.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {files.map((f) => (
                <div key={f.stored} className="overflow-hidden rounded-xl border border-slate-200">
                  {f.mime === 'application/pdf' ? (
                    <div className="flex h-28 items-center justify-center bg-slate-50 text-[12px] font-bold text-slate-500">
                      PDF
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/projects/${project.id}/files/${f.stored}`}
                      alt={f.caption || f.original}
                      className="h-28 w-full object-cover"
                    />
                  )}
                  <div className="p-2">
                    <p className="text-[11px] font-bold text-slate-500">{f.kind}</p>
                    <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug">
                      {f.caption || f.original}
                    </p>
                    <button
                      onClick={() => remove(f)}
                      className="mt-1 text-[11px] text-slate-400 underline"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
