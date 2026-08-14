'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ProjectSummary } from '@/lib/store';
import type { PublicUser } from '@/lib/roles';
import AppShell from '@/components/AppShell';
import Intro from '@/components/Intro';

export default function ProjectList({
  me,
  initialProjects,
  companyCode,
  isDemo = false,
}: {
  me: PublicUser;
  initialProjects: ProjectSummary[];
  /** 同僚を会社に招くためのコード。会社に属している人にだけ出す */
  companyCode?: string;
  /**
   * 公開デモか。
   * デモは保存しないので、現場を作らせると「作れたのに次で消える」ことになる。
   * 押せるのに結果が残らないボタンは、壊れているのと同じなので出さない。
   */
  isDemo?: boolean;
}) {
  const router = useRouter();
  // 一覧はサーバーから受け取る。JSが動かない端末でも表示されるように
  const [projects] = useState<ProjectSummary[]>(initialProjects);
  const [name, setName] = useState('');
  const [names, setNames] = useState('');
  const [creating, setCreating] = useState(false);
  const [invite, setInvite] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  async function join() {
    setJoining(true);
    setJoinError(null);
    try {
      const r = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: invite }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? '参加できませんでした');
      router.push(`/p/${j.project.id}`);
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : String(e));
    } finally {
      setJoining(false);
    }
  }


  async function create() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const r = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, names: names.split(/[,、\s]+/).filter(Boolean) }),
      });
      const j = await r.json();
      router.push(`/p/${j.project.id}`);
    } finally {
      setCreating(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <AppShell me={me}>
      {/* 初回だけ流す。毎回出すと仕事の前の壁になる */}
      <Intro />
      <div className="max-w-[640px]">
        <header className="mb-6">
          <p className="text-[17px] font-bold leading-snug">話すだけで、現場が決まる。</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">
            会話を、次の仕事に変えるリノベAIエージェント。
          </p>
        </header>

        {/* 同僚を会社へ招くコード。拾い出しのルールはこの単位で共有される */}
        {companyCode && (
          <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-[15px] font-bold">会社コード</h2>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="font-mono text-[22px] font-bold tracking-widest">{companyCode}</span>
              <button
                onClick={() => navigator.clipboard.writeText(companyCode)}
                className="min-h-[36px] rounded-lg bg-slate-900 px-3 text-[12px] font-bold text-white"
              >
                コピー
              </button>
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-slate-500">
              同じ会社の方は、新規登録のときにこのコードを入れてください。拾い出しのルールが共有されます。
            </p>
          </section>
        )}

        {/* デモは保存しないので、作る・参加するは出さない。押せて結果が残らないボタンは壊れているのと同じ */}
        {isDemo && (
          <section className="mb-4 rounded-2xl border-2 border-slate-900 bg-white p-5 shadow-sm">
            <h2 className="text-[15px] font-bold">下の現場を開いてください</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
              実際の打ち合わせを4回分入れてあります。
              <b>「打ち合わせ」タブ</b>を開き、
              <b>「この録音の文字起こしを入れる」→「仕分ける」</b>の順に押すと、
              録音から追加見積の項目が出るまでを試せます。
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
              保存済みの打ち合わせは「開く」を押すと、仕分けの結果・3つの文書・拾い出しがそのまま出ます
              （こちらはAIを動かさないので待ち時間がありません）。
            </p>
          </section>
        )}

        {/* 職人は招待コードで現場に入る */}
        {!isDemo && (
        <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-[15px] font-bold">招待コードで参加する</h2>
          <div className="mt-3 flex gap-2">
            <input
              value={invite}
              onChange={(e) => setInvite(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-[16px] tracking-widest"
            />
            <button
              onClick={join}
              disabled={joining || invite.length < 6}
              className="min-h-[52px] shrink-0 rounded-xl bg-slate-900 px-5 text-[15px] font-bold text-white disabled:opacity-40"
            >
              {joining ? '…' : '参加'}
            </button>
          </div>
          {joinError && <p className="mt-2 text-[13px] text-rose-700">{joinError}</p>}
        </section>
        )}

        {!isDemo && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-[15px] font-bold">現場を追加する</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="田中様邸リノベーション"
            className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-[15px]"
          />
          <input
            value={names}
            onChange={(e) => setNames(e.target.value)}
            placeholder="伏せる固有名詞（例：田中）"
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-[15px]"
          />
          <button
            onClick={create}
            disabled={creating || !name.trim()}
            className="mt-3 min-h-[52px] w-full rounded-xl bg-slate-900 text-[16px] font-bold text-white disabled:opacity-40"
          >
            {creating ? '作成中…' : 'この現場を作る'}
          </button>
        </section>
        )}

        <section className="mt-8">
          <h2 className="mb-3 text-[15px] font-bold">現場の一覧</h2>

          {projects.length === 0 && (
            <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-[14px] text-slate-500">
              まだ現場がありません。上から追加してください。
            </p>
          )}

          <div className="space-y-3">
            {projects.map((p) => {
              const overdue = p.nextDue && p.nextDue.date < today;
              return (
                <Link
                  key={p.id}
                  href={`/p/${p.id}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm active:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-[17px] font-bold leading-snug">{p.name}</h3>
                    <div className="flex shrink-0 gap-1.5">
                      {p.unreadFeedback > 0 && (
                        <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white">
                          施主から {p.unreadFeedback}
                        </span>
                      )}
                      {p.openEstimates > 0 && (
                        <span className="rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white">
                          要見積 {p.openEstimates}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-[13px] text-slate-500">
                    打ち合わせ {p.meetingCount}回
                    {p.lastMeetingDate && ` ・ 最終 ${p.lastMeetingDate}`}
                  </p>
                  {p.nextDue && (
                    <p
                      className={`mt-2 text-[13px] font-bold ${
                        overdue ? 'text-rose-600' : 'text-slate-700'
                      }`}
                    >
                      {overdue ? '期限超過' : '次の期限'} {p.nextDue.date}　{p.nextDue.title}（
                      {p.nextDue.owner}）
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
