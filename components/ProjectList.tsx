'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ProjectSummary } from '@/lib/store';
import type { PublicUser } from '@/lib/roles';
import Logo from '@/components/Logo';

export default function ProjectList({ me }: { me: PublicUser }) {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
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

  async function logout() {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    router.push('/login');
    router.refresh();
  }

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((j) => setProjects(j.projects ?? []))
      .finally(() => setLoading(false));
  }, []);

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
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto w-full max-w-[560px] px-5 py-8">
        <header className="mb-7 flex items-start justify-between gap-4">
          <div>
            <h1>
              <Logo size="lg" />
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
              打ち合わせの記録から、
              <strong className="text-slate-900">追加見積が必要な変更</strong>と
              <strong className="text-slate-900">期限</strong>を見つけます。
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="flex items-center justify-end gap-2">
              {me.avatar && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={me.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
              )}
              <span className="text-[13px] font-bold">{me.name}</span>
            </div>
            <p className="text-[11px] text-slate-500">{me.role}</p>
            <button onClick={logout} className="mt-1 text-[11px] text-slate-400 underline">
              ログアウト
            </button>
          </div>
        </header>

        {/* 職人は招待コードで現場に入る */}
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

        <section className="mt-8">
          <h2 className="mb-3 text-[15px] font-bold">現場の一覧</h2>

          {loading && <p className="text-[14px] text-slate-500">読み込んでいます…</p>}

          {!loading && projects.length === 0 && (
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
    </main>
  );
}
