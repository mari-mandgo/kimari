'use client';

import { useEffect, useState } from 'react';
import type { AnalyzeResponse, Item } from '@/app/api/analyze/route';
import type { DocumentsResponse } from '@/app/api/documents/route';
import { SAMPLE_TRANSCRIPT, SAMPLE_NAMES } from '@/lib/sample';
import { formatCost } from '@/lib/pricing';
import type { Project } from '@/lib/store';
import Link from 'next/link';

const LANGS = ['なし', 'ベトナム語', '英語', 'ミャンマー語', 'インドネシア語'];

const DOC_TABS = [
  { key: 'owner', label: '施主へ', hint: '確認書。金額は書きません' },
  { key: 'worker', label: '職人へ', hint: '作業指示。個人情報と金額は載せません' },
  { key: 'internal', label: '社内保存', hint: '根拠と経緯を残します' },
] as const;

const CATEGORY = {
  cost_impact: {
    label: '追加見積が必要',
    hint: '書面での提示が要ります',
    card: 'bg-white border-l-[6px] border-l-rose-600 border-y border-r border-slate-200',
    chip: 'bg-rose-600 text-white',
  },
  risk: {
    label: '認識のズレ',
    hint: '曖昧なまま流れています',
    card: 'bg-slate-900 text-white border-l-[6px] border-l-amber-400',
    chip: 'bg-amber-400 text-slate-900',
  },
  decision_no_cost: {
    label: '決定（金額の変更なし）',
    hint: '',
    card: 'bg-white border-l-[6px] border-l-emerald-500 border-y border-r border-slate-200',
    chip: 'bg-emerald-500 text-white',
  },
  pending: {
    label: '保留',
    hint: '判断待ちです',
    card: 'bg-white border-l-[6px] border-l-amber-500 border-y border-r border-slate-200',
    chip: 'bg-amber-500 text-white',
  },
} as const;

const ORDER: Item['category'][] = ['cost_impact', 'risk', 'decision_no_cost', 'pending'];

const STEPS = ['個人情報を伏せています', 'ルーターがモデルを選んでいます', '会話を仕分けています'];

export default function Workspace({ project }: { project: Project }) {
  const [transcript, setTranscript] = useState('');
  const [names, setNames] = useState(project.names.join(', '));
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [res, setRes] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSent, setShowSent] = useState(false);
  const [docs, setDocs] = useState<DocumentsResponse | null>(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [tab, setTab] = useState<(typeof DOC_TABS)[number]['key']>('owner');
  const [lang, setLang] = useState('なし');
  const [showTranslated, setShowTranslated] = useState(false);
  const [meetingDate, setMeetingDate] = useState(() => new Date().toISOString().slice(0, 10));
  /** 原価は本番では利用者に見せない。ハッカソンの審査用に切り替えられるようにしておく */
  const [demoMode, setDemoMode] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  /** 共有は現場単位。打ち合わせが増えるたびに同じURLへ積み上がる */
  const [shareToken, setShareToken] = useState<string | null>(project.shareToken ?? null);

  // 待ち時間に「何をしているか」を出す。無言で42秒待たせない
  useEffect(() => {
    if (!loading) return setStep(0);
    const timers = [
      setTimeout(() => setStep(1), 1500),
      setTimeout(() => setStep(2), 5000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [loading]);

  const nameList = () => names.split(/[,、\s]+/).filter(Boolean);

  /** 現場に打ち合わせを保存する。共有リンクはここで発行される */
  async function saveMeeting(patch: Record<string, unknown>) {
    try {
      const r = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          names: nameList(),
          meeting: { id: meetingId ?? undefined, date: meetingDate, ...patch },
        }),
      });
      const j = await r.json();
      if (r.ok) {
        const last = j.project.meetings[j.project.meetings.length - 1];
        const mine = meetingId ? j.project.meetings.find((m: { id: string }) => m.id === meetingId) : last;
        if (mine) setMeetingId(mine.id);
        if (j.project.shareToken) setShareToken(j.project.shareToken);
      }
    } catch {
      // 保存の失敗で画面を止めない
    }
  }

  async function run() {
    setLoading(true);
    setError(null);
    setRes(null);
    setDocs(null);
    try {
      const r = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          names: nameList(),
          model: 'orcarouter/fusion-flash',
          meetingDate,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? '失敗しました');
      setRes(j);
      await saveMeeting({ transcript, items: j.items, summary: j.summary });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function makeDocs() {
    if (!res) return;
    setDocsLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: res.items,
          summary: res.summary,
          names: nameList(),
          lang: lang === 'なし' ? null : lang,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? '失敗しました');
      setDocs(j);
      setShowTranslated(false);
      await saveMeeting({
        transcript,
        items: res.items,
        summary: res.summary,
        documents: {
          owner: j.owner,
          worker: j.worker,
          internal: j.internal,
          workerTranslated: j.workerTranslated ?? undefined,
          lang: j.lang ?? undefined,
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDocsLoading(false);
    }
  }

  const grouped = (c: Item['category']) => res?.items.filter((i) => i.category === c) ?? [];
  const allCalls = [...(res?.calls ?? []), ...(docs?.calls ?? [])];
  const totalCost = allCalls.length
    ? allCalls.reduce((acc, c) => acc + (c.costUsd ?? c.estCostUsd ?? 0), 0)
    : null;

  const costCount = grouped('cost_impact').length;
  const riskCount = grouped('risk').length;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      {/* 縦持ちのiPadを基準にした横幅。横向きでも中央に収まる */}
      <div className="mx-auto w-full max-w-[820px] px-5 py-8 sm:py-10">
        <header className="mb-7">
          <Link href="/" className="text-[13px] font-bold text-slate-500 hover:text-slate-900">
            ← 現場の一覧
          </Link>
          <h1 className="mt-2 text-[28px] font-bold tracking-tight">{project.name}</h1>
          <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">
            打ち合わせの記録から、<strong className="text-slate-900">追加見積が必要な変更</strong>
            と<strong className="text-slate-900">期限</strong>を見つけます。
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
            <div>
              <label className="mb-2 block text-[13px] font-bold text-slate-700">打ち合わせ日</label>
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-[15px]"
              />
              <p className="mt-1 text-[11px] text-slate-500">「次回まで」を実際の日付に換算します</p>
            </div>
            <div>
              <label className="mb-2 block text-[13px] font-bold text-slate-700">
                この案件の固有名詞（伏せる対象）
              </label>
              <input
                value={names}
                onChange={(e) => setNames(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-[15px]"
                placeholder="田中, 株式会社◯◯"
              />
            </div>
          </div>

          <label className="mt-5 mb-2 block text-[13px] font-bold text-slate-700">
            打ち合わせの記録
          </label>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={10}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-[14px] leading-[1.9]"
            placeholder="文字起こしを貼り付けてください"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={run}
              disabled={loading || !transcript.trim()}
              className="min-h-[52px] flex-1 rounded-xl bg-slate-900 px-6 text-[16px] font-bold text-white disabled:opacity-40"
            >
              {loading ? '仕分けています…' : '仕分ける'}
            </button>
            <button
              onClick={() => {
                setTranscript(SAMPLE_TRANSCRIPT);
                setNames(SAMPLE_NAMES);
              }}
              disabled={loading}
              className="min-h-[52px] rounded-xl border border-slate-300 bg-white px-5 text-[14px] font-bold text-slate-700 disabled:opacity-40"
            >
              サンプル
            </button>
          </div>

          {loading && (
            <ol className="mt-5 space-y-2">
              {STEPS.map((s, i) => (
                <li
                  key={s}
                  className={`flex items-center gap-2.5 text-[14px] ${
                    i <= step ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  <span
                    className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                      i < step ? 'bg-emerald-500' : i === step ? 'animate-pulse bg-slate-900' : 'bg-slate-300'
                    }`}
                  />
                  {s}
                </li>
              ))}
            </ol>
          )}
        </section>

        {error && (
          <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-[14px] text-rose-900">
            {error}
          </p>
        )}

        {res && (
          <>
            {/* 開いた瞬間に伝わる一行 */}
            <section className="mt-8 rounded-2xl bg-slate-900 p-6 text-white">
              <p className="text-[13px] font-bold text-slate-300">この打ち合わせで見つかったもの</p>
              <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-3">
                <div>
                  <span className="text-[52px] font-bold leading-none text-rose-400">{costCount}</span>
                  <span className="ml-2 text-[16px] font-bold">件</span>
                  <p className="mt-1 text-[13px] text-slate-300">追加見積が必要</p>
                </div>
                <div>
                  <span className="text-[32px] font-bold leading-none text-amber-300">{riskCount}</span>
                  <span className="ml-2 text-[14px] font-bold">件</span>
                  <p className="mt-1 text-[13px] text-slate-300">認識のズレ</p>
                </div>
              </div>
              {demoMode && (
                <p className="mt-4 border-t border-white/15 pt-3 text-[13px] text-slate-300">
                  原価 {formatCost(totalCost)}　/　個人情報 {res.privacy.maskedCount}件を伏せて送信
                  {res.privacy.verified ? '（漏れなし）' : '（要確認）'}　/
                  {res.calls.map((c) => c.servedModel).join(', ')}
                </p>
              )}
              <button
                onClick={() => setDemoMode((v) => !v)}
                className="mt-3 text-[11px] text-slate-400 underline"
              >
                {demoMode ? '技術情報を隠す（実際の利用画面）' : '技術情報を表示（原価・モデル）'}
              </button>
            </section>

            {res.summary && <p className="mt-6 text-[15px] leading-[1.9] text-slate-700">{res.summary}</p>}

            <section className="mt-6 space-y-7">
              {ORDER.map((c) => {
                const list = grouped(c);
                if (!list.length) return null;
                const meta = CATEGORY[c];
                return (
                  <div key={c}>
                    <h2 className="mb-3 flex flex-wrap items-baseline gap-2">
                      <span className="text-[17px] font-bold">{meta.label}</span>
                      <span className="text-[13px] text-slate-500">
                        {list.length}件{meta.hint && ` ・ ${meta.hint}`}
                      </span>
                    </h2>
                    <div className="space-y-3">
                      {list.map((it, i) => (
                        <article key={i} className={`rounded-xl p-4 sm:p-5 ${meta.card}`}>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-[16px] font-bold">{it.title}</h3>
                            {it.needs_estimate && (
                              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${meta.chip}`}>
                                要見積
                              </span>
                            )}
                            <span className="text-[12px] opacity-60">次に動く: {it.owner}</span>
                            {(it.due_text || it.due_date) && (
                              <span className="rounded-full border border-current/30 px-2.5 py-0.5 text-[11px] font-bold">
                                期限 {it.due_date || it.due_text}
                                {it.due_date && it.due_text ? `（${it.due_text}）` : ''}
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-[14px] leading-[1.9]">{it.detail}</p>
                          <p className="mt-2 text-[14px] leading-[1.9] opacity-85">
                            <span className="font-bold">理由：</span>
                            {it.reason}
                          </p>
                          {it.quote && (
                            <p className="mt-3 border-l-2 border-current/25 pl-3 text-[13px] opacity-60">
                              「{it.quote}」
                            </p>
                          )}
                        </article>
                      ))}
                    </div>
                  </div>
                );
              })}
            </section>

            <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-[17px] font-bold">宛先ごとに、3つの文書を作ります</h2>
              <p className="mt-1.5 text-[14px] leading-relaxed text-slate-600">
                同じ会話でも、施主・職人・社内で必要な情報は違います。金額と個人情報の出し分けもここで行います。
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={makeDocs}
                  disabled={docsLoading}
                  className="min-h-[52px] rounded-xl bg-slate-900 px-6 text-[16px] font-bold text-white disabled:opacity-40"
                >
                  {docsLoading ? '作成しています…' : '3つの文書を作る'}
                </button>
                <label className="text-[14px] text-slate-600">
                  職人向けの翻訳
                  <select
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                    className="ml-2 min-h-[44px] rounded-xl border border-slate-300 px-3 text-[14px]"
                  >
                    {LANGS.map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                </label>
              </div>

              {docs && (
                <div className="mt-6">
                  <div className="flex flex-wrap gap-2">
                    {DOC_TABS.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`min-h-[44px] rounded-xl px-5 text-[14px] font-bold ${
                          tab === t.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[12px] text-slate-500">
                    {DOC_TABS.find((t) => t.key === tab)?.hint}
                  </p>

                  {shareToken && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-[12px] font-bold text-slate-600">
                        施主へ渡すリンク（打ち合わせのたびに、ここへ積み上がります）
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <code className="break-all text-[12px] text-slate-700">
                          {typeof window !== 'undefined' ? window.location.origin : ''}/s/{shareToken}
                        </code>
                        <button
                          onClick={async () => {
                            await navigator.clipboard.writeText(`${window.location.origin}/s/${shareToken}`);
                            setCopied('share');
                            setTimeout(() => setCopied(null), 1800);
                          }}
                          className="rounded-lg bg-slate-200 px-3 py-1 text-[12px] font-bold"
                        >
                          {copied === 'share' ? 'コピーしました' : 'リンクをコピー'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={async () => {
                        const text =
                          tab === 'worker' && showTranslated && docs.workerTranslated
                            ? docs.workerTranslated
                            : docs[tab];
                        await navigator.clipboard.writeText(text);
                        setCopied(tab);
                        setTimeout(() => setCopied(null), 1800);
                      }}
                      className="min-h-[40px] rounded-lg bg-slate-100 px-4 text-[13px] font-bold text-slate-700"
                    >
                      {copied === tab ? 'コピーしました' : '本文をコピー'}
                    </button>
                    {tab === 'worker' && docs.workerTranslated && (
                      <button
                        onClick={() => setShowTranslated((v) => !v)}
                        className="min-h-[40px] rounded-lg border border-slate-300 px-4 text-[13px] font-bold"
                      >
                        {showTranslated ? '日本語に戻す' : `${docs.lang}で表示`}
                      </button>
                    )}
                  </div>

                  {/* 施主に見せる書類なので、A4の紙に近い見え方にする */}
                  <pre className="mt-3 max-h-[30rem] overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-5 text-[14px] leading-[1.95] shadow-inner">
                    {tab === 'worker' && showTranslated && docs.workerTranslated
                      ? docs.workerTranslated
                      : docs[tab]}
                  </pre>
                </div>
              )}
            </section>

            <section className="mt-8 pb-16">
              <button
                onClick={() => setShowSent((v) => !v)}
                className="text-[13px] font-bold text-slate-600 underline"
              >
                {showSent ? '閉じる' : 'ルーターへ実際に送った本文を見る（個人情報の確認）'}
              </button>
              {showSent && (
                <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 text-[12px] leading-relaxed">
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
