'use client';

import { useState } from 'react';
import type { Project, PropertyInfo, Member, Stage } from '@/lib/store';

const ROLES = ['施主', '設計担当', 'コーディネーター', '施工管理', '職人'];

/**
 * 現場の基本情報。すべて手入力で、施主と共有するページに出る。
 * 打ち合わせの記録からは取れない情報なので、ここで持つ。
 */
export default function ProjectSettings({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);
  const [property, setProperty] = useState<PropertyInfo>(
    project.property ?? { address: '', area: '', structure: '', age: '', completionDate: '' }
  );
  const [members, setMembers] = useState<Member[]>(project.members ?? []);
  const [stages, setStages] = useState<Stage[]>(project.stages ?? []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property, members, stages }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const currentStage = stages.filter((s) => s.done).length;

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span>
          <span className="text-[15px] font-bold">現場の情報</span>
          <span className="ml-2 text-[13px] text-slate-500">
            {stages.length > 0 && `${currentStage}/${stages.length} 段階`}
            {members.length > 0 && ` ・ メンバー${members.length}名`}
          </span>
        </span>
        <span className="text-[13px] font-bold text-slate-400">{open ? '閉じる' : '編集'}</span>
      </button>

      {open && (
        <div className="space-y-6 border-t border-slate-100 px-5 py-5">
          {/* 物件情報 */}
          <div>
            <h3 className="mb-3 text-[13px] font-bold text-slate-700">物件情報</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ['address', '所在地', '東京都渋谷区◯◯町1-2-3'],
                  ['area', '専有面積', '85.42㎡'],
                  ['structure', '構造', 'RC造'],
                  ['age', '築年数', '25年'],
                  ['completionDate', '竣工予定日', '2026-12-20'],
                ] as const
              ).map(([key, label, ph]) => (
                <label key={key} className="block">
                  <span className="mb-1 block text-[12px] text-slate-500">{label}</span>
                  <input
                    value={property[key]}
                    onChange={(e) => setProperty({ ...property, [key]: e.target.value })}
                    placeholder={ph}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-[14px]"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* メンバー */}
          <div>
            <h3 className="mb-3 text-[13px] font-bold text-slate-700">プロジェクトメンバー</h3>
            <div className="space-y-2">
              {members.map((m, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={m.name}
                    onChange={(e) => {
                      const next = [...members];
                      next[i] = { ...m, name: e.target.value };
                      setMembers(next);
                    }}
                    placeholder="氏名"
                    className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-[14px]"
                  />
                  <select
                    value={m.role}
                    onChange={(e) => {
                      const next = [...members];
                      next[i] = { ...m, role: e.target.value };
                      setMembers(next);
                    }}
                    className="rounded-xl border border-slate-300 px-2 py-2.5 text-[14px]"
                  >
                    {ROLES.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setMembers(members.filter((_, k) => k !== i))}
                    className="rounded-xl border border-slate-300 px-3 text-[13px] text-slate-500"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setMembers([...members, { name: '', role: ROLES[0] }])}
              className="mt-2 rounded-xl border border-slate-300 px-4 py-2 text-[13px] font-bold text-slate-700"
            >
              メンバーを追加
            </button>
          </div>

          {/* 進行段階 */}
          <div>
            <h3 className="mb-1 text-[13px] font-bold text-slate-700">進行状況</h3>
            <p className="mb-3 text-[12px] text-slate-500">
              済んだ段階にチェックを入れると、施主のページに「いま、ここです」が出ます
            </p>
            <div className="space-y-2">
              {stages.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={s.done}
                    onChange={(e) => {
                      const next = [...stages];
                      next[i] = { ...s, done: e.target.checked };
                      setStages(next);
                    }}
                    className="h-5 w-5 shrink-0"
                  />
                  <input
                    value={s.label}
                    onChange={(e) => {
                      const next = [...stages];
                      next[i] = { ...s, label: e.target.value };
                      setStages(next);
                    }}
                    className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-[14px]"
                  />
                  <input
                    type="date"
                    value={s.date}
                    onChange={(e) => {
                      const next = [...stages];
                      next[i] = { ...s, date: e.target.value };
                      setStages(next);
                    }}
                    className="rounded-xl border border-slate-300 px-2 py-2.5 text-[13px]"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="min-h-[48px] w-full rounded-xl bg-slate-900 text-[15px] font-bold text-white disabled:opacity-40"
          >
            {saving ? '保存しています…' : saved ? '保存しました' : '保存する'}
          </button>
        </div>
      )}
    </section>
  );
}
