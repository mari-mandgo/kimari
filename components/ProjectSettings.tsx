'use client';

import { useState } from 'react';
import type { Project, PropertyInfo, Member } from '@/lib/store';
import { PHASES } from '@/lib/phases';

const ROLES = ['施主', '設計担当', 'コーディネーター', '施工管理', '職人'];

/**
 * 現場の基本情報。すべて手入力で、施主と共有するページに出る。
 * 打ち合わせの記録からは取れない情報なので、ここで持つ。
 */
export default function ProjectSettings({ project }: { project: Project }) {
  const [property, setProperty] = useState<PropertyInfo>(
    project.property ?? { address: '', area: '', structure: '', age: '', completionDate: '' }
  );
  const [members, setMembers] = useState<Member[]>(project.members ?? []);
  /** 工程は打ち合わせを記録すると自動で進むが、ずれたときに直せるようにしておく */
  const [phaseWeek, setPhaseWeek] = useState<number | ''>(project.phaseWeek ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property,
          members,
          ...(phaseWeek === '' ? {} : { phaseWeek }),
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-[15px] font-bold">現場の情報</h2>
        <p className="mt-0.5 text-[12px] text-slate-500">
          ここで入れた内容が、施主のページにそのまま出ます
        </p>
      </div>

      {(
        <div className="space-y-6 px-5 py-5">
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
                  {/* 顔写真。施主ページに出る。登録ユーザーなら未設定でもアカウントの写真が使われる */}
                  <label
                    className="relative h-[42px] w-[42px] shrink-0 cursor-pointer overflow-hidden rounded-full border border-slate-300 bg-slate-50"
                    title="顔写真を選ぶ"
                  >
                    {m.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-[11px] text-slate-400">
                        写真
                      </span>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 cursor-pointer opacity-0"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const next = [...members];
                          next[i] = { ...m, avatar: String(reader.result) };
                          setMembers(next);
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
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

          {/* 進行状況。手でチェックを入れる段階表はやめた。
              打ち合わせを記録するときに選んだ工程が、そのまま現場の進行になる。
              同じことを2か所で管理すると必ずずれるため、ここは直すためだけの場所 */}
          <div>
            <h3 className="mb-1 text-[13px] font-bold text-slate-700">いまの工程</h3>
            <p className="mb-3 text-[12px] leading-relaxed text-slate-500">
              打ち合わせを記録すると自動で進みます。ずれているときだけ直してください。
              施主のページの進行率は、ここから出ています。
            </p>
            <select
              value={phaseWeek}
              onChange={(e) => setPhaseWeek(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-[14px]"
            >
              <option value="">まだ設定していません</option>
              {PHASES.map((p) => (
                <option key={p.week} value={p.week}>
                  {p.week}週目・{p.label}
                  {p.week === 4 ? '（ここから契約後）' : ''}
                </option>
              ))}
            </select>
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
