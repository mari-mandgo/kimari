'use client';

import { useState } from 'react';
import type { Item } from '@/app/api/analyze/route';
import type { TakeoffResponse } from '@/app/api/takeoff/route';
import { formatCost } from '@/lib/pricing';

/**
 * 拾い出し。追加見積が必要と判定された項目を、実際の工事項目へ展開する。
 *
 * 金額欄は作らない。単価は会社ごと・時期ごとに違うので、AIが出した金額は使えない。
 * ここで出すのは「何を拾うべきか」までで、値段を入れるのは見積担当の仕事とする。
 */
export default function Takeoff({
  item,
  names,
  projectId,
  canEditRules,
}: {
  item: Item;
  names: string[];
  projectId: string;
  /** ルールを直せるのは、その会社の設計・現場管理だけ */
  canEditRules: boolean;
}) {
  const [res, setRes] = useState<TakeoffResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  /** 拾い出しへの指摘。会社ごとに立てる項目が違うので、使う人が直せるようにする */
  const [fixOpen, setFixOpen] = useState(false);
  const [fixText, setFixText] = useState('');
  const [fixNote, setFixNote] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/takeoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title,
          detail: item.detail,
          reason: item.reason,
          quote: item.quote,
          names,
          projectId,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? '拾い出しに失敗しました');
      setRes(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  /**
   * 指摘を送る。
   * company … 自社のルールにする。すぐ効くが、効くのは自社の現場だけ
   * report  … 判定基準そのものへの指摘。すぐには効かせず、開発元が読んで直す
   */
  async function sendFix(target: 'company' | 'report') {
    if (!fixText.trim()) return;
    setError(null);
    const r = await fetch('/api/takeoff/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: fixText, context: item.title, projectId, target }),
    });
    const j = await r.json();
    if (!r.ok) return setError(j.error ?? '送れませんでした');

    setFixText('');
    setFixOpen(false);
    if (target === 'report') {
      setFixNote('開発元へ送りました。判定基準そのものを見直します');
    } else {
      setFixNote('自社のルールにしました。この会社の現場すべてに効きます');
      await run();
    }
  }

  /** 自社ルールの取り消し。間違えて入れてもすぐ戻せるようにする */
  async function dropRule(id: string) {
    const r = await fetch('/api/takeoff/rules', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, projectId }),
    });
    if (r.ok) await run();
  }

  /** Excelにそのまま貼れるタブ区切り。金額列は空のまま渡す */
  async function copyForExcel() {
    if (!res) return;
    const header = ['工種', '名称', '単位', '数量', '単価', '金額', '備考'].join('\t');
    const rows = res.work_items.map((w) =>
      [w.category, w.name, w.unit, '', '', '', w.note].join('\t')
    );
    await navigator.clipboard.writeText([header, ...rows].join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!res) {
    return (
      <div className="mt-4 border-t border-slate-200 pt-4">
        <button
          onClick={run}
          disabled={loading}
          className="min-h-[44px] rounded-xl border-2 border-slate-900 px-4 text-[14px] font-bold text-slate-900 disabled:opacity-40"
        >
          {loading ? '拾い出しています…' : '拾い出しを展開する'}
        </button>
        <span className="ml-3 text-[13px] text-slate-500">
          この変更で発生する工事項目を出します（金額は出しません）
        </span>
        {error && <p className="mt-2 text-[13px] text-rose-700">{error}</p>}
      </div>
    );
  }

  const call = res.calls[0];
  // 同じ工種は隣り合っている前提。見出しは切り替わったところにだけ出す
  let lastCategory = '';

  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <h4 className="text-[15px] font-bold">拾い出し {res.work_items.length}項目</h4>
        <button
          onClick={copyForExcel}
          className="min-h-[36px] rounded-lg bg-slate-900 px-3 text-[12px] font-bold text-white"
        >
          {copied ? 'コピーしました' : 'Excelにコピー'}
        </button>
        <button
          onClick={() => setRes(null)}
          className="text-[12px] text-slate-400 underline"
        >
          閉じる
        </button>
      </div>

      <p className="mt-1.5 text-[12px] text-slate-500">
        金額はAIが出しません。単価は会社ごと・時期ごとに違い、変更工事の見積は書面で提示する必要があるためです。
      </p>

      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[540px] text-left text-[13px]">
          <thead className="bg-slate-50 text-[12px] text-slate-500">
            <tr>
              <th className="px-3 py-2 font-bold">名称</th>
              <th className="w-16 px-3 py-2 font-bold">単位</th>
              <th className="w-40 px-3 py-2 font-bold">数量の根拠</th>
            </tr>
          </thead>
          <tbody>
            {res.work_items.map((w, i) => {
              const heading = w.category !== lastCategory ? w.category : null;
              lastCategory = w.category;
              return (
                <tr key={i} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2">
                    {heading && (
                      <p className="mb-1 text-[11px] font-bold text-slate-400">{heading}</p>
                    )}
                    <span className="font-bold">{w.name}</span>
                    {w.note && (
                      <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{w.note}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{w.unit}</td>
                  <td className="px-3 py-2 text-[12px] text-slate-500">{w.qty_basis}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {res.missing_info.length > 0 && (
        <div className="mt-4 rounded-xl border-l-[6px] border-l-sky-600 border-y border-r border-slate-200 bg-white p-4">
          <h5 className="text-[14px] font-bold">現地で確認すること</h5>
          <p className="mt-0.5 text-[12px] text-slate-500">
            数量を出すために要る情報です。ここはAIには分かりません。
          </p>
          <ul className="mt-2 space-y-1.5">
            {res.missing_info.map((m, i) => (
              <li key={i} className="text-[13px] leading-relaxed">
                ・{m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {res.cautions.length > 0 && (
        <div className="mt-3 rounded-xl border-l-[6px] border-l-amber-500 border-y border-r border-slate-200 bg-white p-4">
          <h5 className="text-[14px] font-bold">注意点</h5>
          <ul className="mt-2 space-y-1.5">
            {res.cautions.map((m, i) => (
              <li key={i} className="text-[13px] leading-relaxed">
                ・{m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 効いている自社ルール。何が効いているか見えないと、直したくても直せない */}
      {res.appliedRules.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <h5 className="text-[14px] font-bold">
            この拾い出しに効いている自社のルール {res.appliedRules.length}件
          </h5>
          <ul className="mt-2 space-y-2">
            {res.appliedRules.map((r) => (
              <li key={r.id} className="flex items-start gap-3 text-[13px] leading-relaxed">
                <span className="flex-1">{r.text}</span>
                <span className="shrink-0 text-[11px] text-slate-400">{r.by}</span>
                {canEditRules && (
                  <button
                    onClick={() => dropRule(r.id)}
                    className="shrink-0 text-[11px] text-slate-400 underline"
                  >
                    取り消す
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 拾い出しの型は会社ごとに違う。書いた側が全部先回りするのは無理なので、使う人が直す */}
      <div className="mt-4 rounded-xl bg-slate-50 p-4">
        {fixOpen ? (
          <>
            <h5 className="text-[14px] font-bold">おかしいところを教えてください</h5>
            <textarea
              value={fixText}
              onChange={(e) => setFixText(e.target.value)}
              rows={3}
              placeholder="例：ガス工事はガス会社が施主と直接契約するので、うちの見積には入れない&#10;例：ユニットバスを入れるので防水工事は出さない。耐水ボード下地で足りる"
              className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-[14px] leading-relaxed"
            />
            <div className="mt-3 space-y-2">
              {canEditRules && (
                <button
                  onClick={() => sendFix('company')}
                  disabled={!fixText.trim() || loading}
                  className="min-h-[44px] w-full rounded-xl bg-slate-900 px-5 text-[14px] font-bold text-white disabled:opacity-40 sm:w-auto"
                >
                  {loading ? '出し直しています…' : '自社のルールにする（すぐ反映）'}
                </button>
              )}
              <button
                onClick={() => sendFix('report')}
                disabled={!fixText.trim()}
                className="min-h-[44px] w-full rounded-xl border-2 border-slate-300 px-5 text-[14px] font-bold text-slate-700 disabled:opacity-40 sm:ml-2 sm:w-auto"
              >
                開発元に報告する
              </button>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
              {canEditRules ? (
                <>
                  <b>自社のルール</b>は、この会社の現場すべてにすぐ効きます（他社には影響しません）。
                  どの会社にも当てはまる誤りだと思うときは<b>開発元に報告</b>してください。判定基準そのものを直します。
                </>
              ) : (
                <>
                  拾い出しのルールを変更できるのは、設計・現場管理の方だけです。
                  気づいたことは開発元へ報告できます。
                </>
              )}
            </p>
            <button
              onClick={() => setFixOpen(false)}
              className="mt-2 text-[13px] text-slate-400 underline"
            >
              やめる
            </button>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <button
              onClick={() => setFixOpen(true)}
              className="text-[13px] font-bold text-slate-900 underline"
            >
              おかしいところを直す
            </button>
            <span className="text-[12px] text-slate-500">
              {fixNote ?? '会社によって、立てる項目も商流も違います'}
            </span>
          </div>
        )}
        {error && <p className="mt-2 text-[13px] text-rose-700">{error}</p>}
      </div>

      {call && (
        <p className="mt-3 text-[11px] text-slate-400">
          {call.servedModel} ・ {(call.ms / 1000).toFixed(1)}秒 ・{' '}
          {formatCost(call.costUsd ?? call.estCostUsd)}
        </p>
      )}
    </div>
  );
}
