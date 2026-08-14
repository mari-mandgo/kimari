'use client';

import { useEffect, useRef, useState } from 'react';
import type { AnalyzeResponse, Item } from '@/app/api/analyze/route';
import type { DocumentsResponse } from '@/app/api/documents/route';
import { SAMPLE_TRANSCRIPT, SAMPLE_NAMES } from '@/lib/sample';
import { formatCost } from '@/lib/pricing';
import type { Meeting, Project } from '@/lib/store';
import Link from 'next/link';
import ProjectSettings from '@/components/ProjectSettings';
import AppShell from '@/components/AppShell';
import FeedbackInbox from '@/components/FeedbackInbox';
import FileBoard from '@/components/FileBoard';
import Recorder from '@/components/Recorder';
import DemoRecorder from '@/components/DemoRecorder';
import Takeoff from '@/components/Takeoff';
import MeetingList from '@/components/MeetingList';
import ContractScope from '@/components/ContractScope';
import { PHASES, estimateWords, isBeforeContract } from '@/lib/phases';
import { ESTIMATE_TEMPLATES } from '@/lib/estimate-kinds';
import type { PublicUser } from '@/lib/roles';

const LANGS = ['なし', 'ベトナム語', '英語', 'ミャンマー語', 'インドネシア語'];

const DOC_TABS = [
  { key: 'owner', label: '施主へ', hint: '確認書。金額は書きません' },
  { key: 'worker', label: '職人へ', hint: '作業指示。個人情報と金額は載せません' },
  { key: 'internal', label: '社内保存', hint: '根拠と経緯を残します' },
] as const;

const CATEGORY = {
  // cost_impact の label と hint は、契約の前後で言い方が変わる（lib/phases.ts の estimateWords）
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

/**
 * 左のメニュー。
 * 縦に長い1枚ページだと、どこに何があるか分からなくなるので section で切り替える。
 * 画面が狭いときは上部の横並びメニューになる（隠さない。1タップで移れるように）。
 */
const TABS = [
  { key: 'top', label: 'トップ' },
  { key: 'meeting', label: '打ち合わせ' },
  { key: 'estimates', label: '見積' },
  { key: 'files', label: '資料・図面・写真' },
  { key: 'info', label: '現場の情報' },
] as const;
type Section = (typeof TABS)[number]['key'];

const ORDER: Item['category'][] = ['cost_impact', 'risk', 'decision_no_cost', 'pending'];

const STEPS = ['個人情報を伏せています', 'ルーターがモデルを選んでいます', '会話を仕分けています'];

export default function Workspace({
  project,
  me,
  isDemo = false,
}: {
  project: Project;
  me: PublicUser;
  /** 公開デモか。録音の代わりに音声プレイヤーを出す */
  isDemo?: boolean;
}) {
  const [section, setSection] = useState<Section>('top');
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
  /** 工事の段階。空なら打ち合わせの内容からAIが判断する */
  const [phaseLabel, setPhaseLabel] = useState('');
  /** 原価は本番では利用者に見せない。ハッカソンの審査用に切り替えられるようにしておく */
  const [demoMode, setDemoMode] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  /** 共有は現場単位。打ち合わせが増えるたびに同じURLへ積み上がる */
  const [shareToken, setShareToken] = useState<string | null>(project.shareToken ?? null);
  /** 保存済みの打ち合わせを開いたとき、結果の位置まで送る */
  const resultRef = useRef<HTMLDivElement | null>(null);
  /**
   * 拾い出しがAIに判定させた段階。
   * 段階を選ばずに「打ち合わせの内容から判断する」のまま使う人が多いので、
   * 判定結果を受け取って、画面の言葉（追加見積／見積）をそちらに合わせる。
   */
  const [detectedWeek, setDetectedWeek] = useState<number | null>(null);

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
  const phaseWeek = PHASES.find((p) => p.label === phaseLabel)?.week;

  /** 現場に打ち合わせを保存する。共有リンクはここで発行される */
  async function saveMeeting(patch: Record<string, unknown>) {
    try {
      const r = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          names: nameList(),
          // 選ばれた工程を現場にも残す。施主ページの進行状況がこれで動く
          ...(phaseWeek !== undefined ? { phaseWeek } : {}),
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
      await saveMeeting({
        transcript,
        items: j.items,
        summary: j.summary,
        // 開き直したときに、この場と同じものを見せるために一緒に残す
        sentToRouter: j.sentToRouter,
        privacy: j.privacy,
        calls: j.calls,
        phaseLabel: phaseLabel || undefined,
      });
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
          beforeContract,
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

  /**
   * 保存済みの打ち合わせを、仕分けた直後と同じ状態に戻す。
   *
   * 以前は仕分けた流れの中でしか結果を見られず、開き直すと
   * 3つの文書を作ることも、ルーターへ送った本文を確かめることも、
   * 拾い出し（現地で確認すること・注意点）を開くこともできなくなっていた。
   * 保存はされているので、画面に戻すだけで足りる。
   */
  function openMeeting(m: Meeting) {
    setMeetingId(m.id);
    setMeetingDate(m.date);
    setTranscript(m.transcript ?? '');
    setPhaseLabel(m.phaseLabel ?? '');
    setError(null);
    setShowSent(false);
    setShowTranslated(false);
    setDetectedWeek(null);
    setRes({
      items: m.items ?? [],
      summary: m.summary ?? '',
      // 途中で足したフィールドなので、それ以前の打ち合わせには入っていない
      privacy: m.privacy ?? { maskedCount: 0, tokens: [], verified: true },
      calls: m.calls ?? [],
      sentToRouter: m.sentToRouter ?? '',
    });
    setDocs(
      m.documents?.owner
        ? {
            owner: m.documents.owner ?? '',
            worker: m.documents.worker ?? '',
            internal: m.documents.internal ?? '',
            workerTranslated: m.documents.workerTranslated ?? null,
            lang: m.documents.lang ?? null,
            calls: [],
          }
        : null,
    );
    if (m.documents?.lang) setLang(m.documents.lang);
    setSection('meeting');
    // 結果は入力欄の下に出る。先頭へ戻すと「何も起きていない」ように見える
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  }

  /**
   * 契約前かどうか。画面で選ばれた段階を優先し、無ければ拾い出しの判定を使う。
   * 契約前は比べる契約が無いので、出るのは「追加」ではなく見積そのもの。
   */
  const beforeContract = isBeforeContract(phaseLabel || detectedWeek);
  const words = estimateWords(beforeContract);

  /**
   * デモで開く打ち合わせ。
   * 置いてある録音を仕分けた結果そのもので、3つの文書まで入っている分を選ぶ。
   * その場でAIを動かすと50〜80秒待たせるので、こちらを主にする。
   */
  const demoMeeting =
    [...project.meetings].sort((a, b) => b.date.localeCompare(a.date)).find((m) => m.documents?.owner) ??
    project.meetings[0];

  const grouped = (c: Item['category']) => res?.items.filter((i) => i.category === c) ?? [];
  const allCalls = [...(res?.calls ?? []), ...(docs?.calls ?? [])];
  const totalCost = allCalls.length
    ? allCalls.reduce((acc, c) => acc + (c.costUsd ?? c.estCostUsd ?? 0), 0)
    : null;

  const costCount = grouped('cost_impact').length;
  const riskCount = grouped('risk').length;
  const estimates = project.estimates ?? [];

  return (
    <AppShell
      me={me}
      title={project.name}
      sections={TABS.map((t) => ({
        key: t.key,
        label: t.label,
        badge:
          t.key === 'meeting'
            ? project.meetings.length
            : t.key === 'estimates'
              ? estimates.length
              : undefined,
      }))}
      current={section}
      onSelect={(k) => setSection(k as Section)}
    >
      <>
        {/* 施主へ渡すURL。常に見える場所に置く */}
        {section === 'top' && shareToken && (
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[15px] font-bold">施主に送るページ</h2>
                <p className="mt-0.5 truncate font-mono text-[12px] text-slate-500">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/s/{shareToken}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(`${window.location.origin}/s/${shareToken}`);
                    setCopied('share-top');
                    setTimeout(() => setCopied(null), 1800);
                  }}
                  className="min-h-[44px] rounded-xl bg-slate-900 px-5 text-[14px] font-bold text-white"
                >
                  {copied === 'share-top' ? 'コピーしました' : 'URLをコピー'}
                </button>
                <a
                  href={`/s/${shareToken}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[44px] items-center rounded-xl border border-slate-300 px-4 text-[14px] font-bold text-slate-700 hover:border-slate-500"
                >
                  開く
                </a>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              打ち合わせを記録するたびに、このページへ自動で積み上がります。送り直しは不要です。
            </p>

            {project.inviteCode && (
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                <span className="text-[13px] font-bold">職人の招待コード</span>
                <code className="font-mono text-[18px] font-bold tracking-widest">
                  {project.inviteCode}
                </code>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(project.inviteCode as string);
                    setCopied('invite');
                    setTimeout(() => setCopied(null), 1800);
                  }}
                  className="min-h-[36px] rounded-lg border border-slate-300 px-3 text-[12px] font-bold text-slate-700"
                >
                  {copied === 'invite' ? 'コピーしました' : 'コピー'}
                </button>
                <span className="text-[11px] text-slate-400">
                  職人さんはこのコードでこの現場に入れます
                </span>
              </div>
            )}
          </section>
        )}

        {/* トップ：初めて開いた人が、何をどの順でやるのか分かるようにする */}
        {section === 'top' && (
          <>
            <FeedbackInbox project={project} />

            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-[15px] font-bold">使い方</h2>
              <ol className="mt-3 space-y-4">
                {[
                  {
                    n: '1',
                    t: '打ち合わせを録音する',
                    d: isDemo
                      ? 'スマホやPCをテーブルに置いて録音し、そのままこのサーバーで文字起こしします。音声を外部へは送りません。この公開デモには文字起こしのサーバーが無いため、実際に録った打ち合わせの音声と、その文字起こしを置いてあります。'
                      : 'スマホやPCをテーブルに置いて録音します。あとから音声ファイルを取り込むこともできます。文字起こしはこの端末とサーバーの中だけで行い、音声を外部へ送りません。',
                  },
                  {
                    n: '2',
                    t: '「仕分ける」を押す',
                    d: '会話が4つに分かれます。追加見積が必要な変更／金額の変わらない決定／保留と期限／言った言わないになりそうな箇所。個人情報は伏せてから処理します。',
                  },
                  {
                    n: '3',
                    t: '拾い出して、見積書にする',
                    d: '「キッチンを600mm動かす」から、実際に発生する工事項目を出します。当初見積書を読み込んでおくと、契約に含まれる工事を避けて、追加になる分だけを出します。',
                  },
                  {
                    n: '4',
                    t: '施主ページに公開する',
                    d: '中身を確かめてから公開します。仕分けただけでは施主に見えません。公開すると、上のURLのページへ積み上がります。',
                  },
                ].map((s) => (
                  <li key={s.n} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[13px] font-bold text-white">
                      {s.n}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[15px] font-bold">{s.t}</p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-slate-600">{s.d}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <p className="text-[13px] font-bold">試してみる</p>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
                  録音がなくても動きを確かめられます。「打ち合わせ」を開いて
                  <b>「サンプル」→「仕分ける」</b>を押してください。
                  実際の打ち合わせの記録が入り、1分ほどで仕分けの結果が出ます。
                </p>
                <button
                  onClick={() => {
                    setTranscript(SAMPLE_TRANSCRIPT);
                    // SAMPLE_NAMES は文字列。展開すると「田, 中」と1文字ずつに割れる
                    setNames(SAMPLE_NAMES);
                    setSection('meeting');
                  }}
                  className="mt-3 min-h-[44px] rounded-xl bg-slate-900 px-5 text-[14px] font-bold text-white"
                >
                  サンプルを入れて開く
                </button>
              </div>
            </section>

            <div className="mb-6">
              {isDemo ? (
                <DemoRecorder onOpenSaved={() => demoMeeting && openMeeting(demoMeeting)} />
              ) : (
                <Recorder onTranscript={(text) => setTranscript(text)} />
              )}
            </div>
          </>
        )}

        {section === 'info' && <ProjectSettings project={project} />}

        {section === 'files' && (
          <>
            <FileBoard project={project} />
            {/* 見積書はここでアップロードするので、読み取りも同じ場所に置く。
                二重に管理させない */}
            <ContractScope project={project} />
          </>
        )}

        {section === 'estimates' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {/* 契約前の見積と追加見積が混ざるので、ここの見出しは中立にする */}
            <h2 className="text-[15px] font-bold">見積 {estimates.length}件</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
              拾い出しの結果から作られます。数量と単価を入れて、印刷やPDFで出せます。
            </p>
            {estimates.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-6 text-center text-[13px] text-slate-500">
                まだありません。「打ち合わせ」で拾い出しを出したあと、
                「見積書をつくる」から作成できます。
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {[...estimates]
                  .sort((a, b) => b.no - a.no)
                  .map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/p/${project.id}/estimates/${e.id}`}
                        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-slate-200 p-4 hover:border-slate-400"
                      >
                        <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-bold text-white">
                          No.{e.no}
                        </span>
                        <span className="text-[15px] font-bold">{e.title}</span>
                        <span className="text-[12px] text-slate-500">
                                        {ESTIMATE_TEMPLATES.find((t) => t.key === e.template)?.label} ・{' '}
                          {e.rows.length}項目 ・ {e.issuedOn}
                        </span>
                      </Link>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        )}

        {section === 'meeting' && (
        <>
        {/* 保存済みの打ち合わせ。ここで施主ページへの公開を決める */}
        <MeetingList
          projectId={project.id}
          meetings={project.meetings}
          shareToken={shareToken ?? undefined}
          openId={meetingId}
          onOpen={openMeeting}
        />

        {/* 公開デモには文字起こし用のサーバーが無い。動かないボタンを置かず、音声を聴ける形にする */}
        <div className="mb-6">
          {isDemo ? (
            <DemoRecorder onOpenSaved={() => demoMeeting && openMeeting(demoMeeting)} />
          ) : (
            <Recorder onTranscript={(text) => setTranscript(text)} />
          )}
        </div>

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
            {/* 契約の前後で追加見積の意味が変わるので、段階は推測させず選べるようにする */}
            <div>
              <label className="mb-2 block text-[13px] font-bold text-slate-700">工事の段階</label>
              <select
                value={phaseLabel}
                onChange={(e) => setPhaseLabel(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-[15px]"
              >
                <option value="">打ち合わせの内容から判断する</option>
                {PHASES.map((p) => (
                  <option key={p.week} value={p.label}>
                    {p.label}
                    {p.label === 'ご契約' ? '（ここから契約後）' : ''}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                契約後は、もともとの契約に含まれる工事を追加見積から外します
              </p>
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
          <div ref={resultRef}>
            {/* 開いた瞬間に伝わる一行 */}
            <section className="mt-8 rounded-2xl bg-slate-900 p-6 text-white">
              <p className="text-[13px] font-bold text-slate-300">この打ち合わせで見つかったもの</p>
              <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-3">
                <div>
                  <span className="text-[52px] font-bold leading-none text-rose-400">{costCount}</span>
                  <span className="ml-2 text-[16px] font-bold">件</span>
                  <p className="mt-1 text-[13px] text-slate-300">{words.need}</p>
                </div>
                <div>
                  <span className="text-[32px] font-bold leading-none text-amber-300">{riskCount}</span>
                  <span className="ml-2 text-[14px] font-bold">件</span>
                  <p className="mt-1 text-[13px] text-slate-300">認識のズレ</p>
                </div>
              </div>
              {/* この機能を足す前に保存した打ち合わせには、原価もマスクの記録も入っていない */}
              {demoMode && allCalls.length > 0 && (
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
                // 契約前は「追加」ではないので、この分類だけ言い方を差し替える
                const label = c === 'cost_impact' ? words.need : meta.label;
                const hint = c === 'cost_impact' ? words.needHint : meta.hint;
                return (
                  <div key={c}>
                    <h2 className="mb-3 flex flex-wrap items-baseline gap-2">
                      <span className="text-[17px] font-bold">{label}</span>
                      <span className="text-[13px] text-slate-500">
                        {list.length}件{hint && ` ・ ${hint}`}
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
                          {/* 見積を作るのは追加見積の対象だけ。他の分類には出さない */}
                          {c === 'cost_impact' && (
                            <Takeoff
                              item={it}
                              names={project.names}
                              projectId={project.id}
                              canEditRules={me.role === '設計' || me.role === '現場管理'}
                              context={res?.summary}
                              phaseLabel={phaseLabel}
                              onPhase={setDetectedWeek}
                              autoRun={!isDemo}
                            />
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

            {/* この機能を足す前に保存した分は本文が残っていないので、出せるときだけ出す */}
            {res.sentToRouter && (
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
            )}
          </div>
        )}
        </>
        )}
      </>
    </AppShell>
  );
}
