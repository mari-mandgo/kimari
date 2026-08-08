'use client';

import { useState } from 'react';
import type { AnalyzeResponse, Item } from './api/analyze/route';
import { SAMPLE_TRANSCRIPT, SAMPLE_NAMES } from '@/lib/sample';
import { formatCost, USD_JPY } from '@/lib/pricing';

const CATEGORY = {
  cost_impact: { label: '金額に影響する変更', hint: '追加見積の対象', color: 'bg-rose-50 border-rose-200 text-rose-900' },
  decision_no_cost: { label: '決定（金額の変更なし）', hint: '', color: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
  pending: { label: '保留', hint: '判断待ち', color: 'bg-amber-50 border-amber-200 text-amber-900' },
  risk: { label: '認識のズレの可能性', hint: '要確認', color: 'bg-slate-900 border-slate-900 text-white' },
} as const;

const ORDER: Item['category'][] = ['cost_impact', 'risk', 'decision_no_cost', 'pending'];

export default function Home() {
  const [transcript, setTranscript] = useState('');
  const [names, setNames] = useState('田中');
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSent, setShowSent] = useState(false);

  async function run() {
    setLoading(true);
    setError(null);
    setRes(null);
    try {
      const r = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          names: names.split(/[,、\s]+/).filter(Boolean),
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? '失敗しました');
      setRes(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const grouped = (c: Item['category']) => res?.items.filter((i) => i.category === c) ?? [];
  const totalTokens = res?.calls.reduce((a, b) => a + b.totalTokens, 0) ?? 0;
  const totalCost =
    res?.calls.reduce<number | null>((acc, c) => {
      const v = c.costUsd ?? c.estCostUsd;
      if (v === null || acc === null) return acc === null ? null : acc;
      return acc + v;
    }, 0) ?? null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-5 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">KIMARI</h1>
          <p className="mt-2 text-slate-600">
            打ち合わせの記録から、<strong>追加見積が必要な変更</strong>を見つけます。議事録は作りません。
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block text-sm font-bold mb-2">案件に登録された固有名詞（マスク対象）</label>
          <input
            value={names}
            onChange={(e) => setNames(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="田中, 株式会社◯◯"
          />

          <label className="block text-sm font-bold mt-5 mb-2">打ち合わせの記録</label>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={12}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-[13px] leading-relaxed"
            placeholder="文字起こしを貼り付けてください"
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={run}
              disabled={loading || !transcript.trim()}
              className="rounded-xl bg-slate-900 px-6 py-3 font-bold text-white disabled:opacity-40"
            >
              {loading ? '解析中…' : '仕分ける'}
            </button>
            <button
              onClick={() => {
                setTranscript(SAMPLE_TRANSCRIPT);
                setNames(SAMPLE_NAMES);
              }}
              disabled={loading}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 disabled:opacity-40"
            >
              サンプルを読み込む
            </button>
          </div>
        </section>

        {error && (
          <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{error}</p>
        )}

        {res && (
          <>
            <section className="mt-8 grid gap-3 sm:grid-cols-4">
              <Stat label="ルーターが選んだモデル" value={res.calls.map((c) => c.servedModel).join(', ')} />
              <Stat label="消費トークン" value={totalTokens.toLocaleString()} />
              <Stat label="この1件の原価" value={formatCost(totalCost)} note={`概算・$1=${USD_JPY}円`} />
              <Stat
                label="伏せた個人情報"
                value={`${res.privacy.maskedCount} 件${res.privacy.verified ? '（漏れなし）' : '（要確認）'}`}
              />
            </section>

            <p className="mt-6 text-slate-700">{res.summary}</p>

            <section className="mt-6 space-y-6">
              {ORDER.map((c) => {
                const list = grouped(c);
                if (!list.length) return null;
                const meta = CATEGORY[c];
                return (
                  <div key={c}>
                    <h2 className="mb-3 font-bold">
                      {meta.label}
                      <span className="ml-2 text-sm font-normal text-slate-500">
                        {list.length}件{meta.hint && ` ・ ${meta.hint}`}
                      </span>
                    </h2>
                    <div className="space-y-3">
                      {list.map((it, i) => (
                        <div key={i} className={`rounded-xl border p-4 ${meta.color}`}>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold">{it.title}</h3>
                            {it.needs_estimate && (
                              <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white">
                                要見積
                              </span>
                            )}
                            <span className="text-[11px] opacity-70">担当: {it.owner}</span>
                          </div>
                          <p className="mt-2 text-sm leading-relaxed">{it.detail}</p>
                          <p className="mt-2 text-sm leading-relaxed opacity-90">
                            <span className="font-bold">理由：</span>
                            {it.reason}
                          </p>
                          {it.quote && (
                            <p className="mt-2 border-l-2 border-current/30 pl-3 text-[13px] opacity-70">
                              「{it.quote}」
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </section>

            <section className="mt-8">
              <button
                onClick={() => setShowSent((v) => !v)}
                className="text-sm font-bold text-slate-600 underline"
              >
                {showSent ? '閉じる' : 'ルーターへ実際に送った本文を見る（個人情報のマスク確認）'}
              </button>
              {showSent && (
                <pre className="mt-3 max-h-96 overflow-auto rounded-xl border border-slate-200 bg-white p-4 text-[12px] leading-relaxed whitespace-pre-wrap">
                  {res.sentToRouter}
                </pre>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-bold text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-sm">{value}</p>
      {note && <p className="mt-1 text-[10px] text-slate-400">{note}</p>}
    </div>
  );
}
