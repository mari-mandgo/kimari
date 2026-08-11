'use client';

import { useEffect, useRef, useState } from 'react';

const SEEN_KEY = 'kimari_intro_seen';

/**
 * 初回ログインのときだけ流す短い映像。
 *
 * 毎回出すと、使う人にとっては仕事の前に置かれた6秒の壁になる。
 * 初めての1回だけにして、いつでも飛ばせるようにしてある。
 * 見たかどうかはこの端末に覚える（サーバーに持つほどのことではない）。
 */
export default function Intro() {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(SEEN_KEY)) return;
      localStorage.setItem(SEEN_KEY, new Date().toISOString());
      setShow(true);
    } catch {
      // localStorage が使えない環境では出さない
    }
  }, []);

  function close() {
    setLeaving(true);
    setTimeout(() => setShow(false), 400);
  }

  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [show]);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-white transition-opacity duration-400 ${
        leaving ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <video
        ref={video}
        src="/intro.mp4"
        autoPlay
        muted
        playsInline
        onEnded={close}
        className="max-h-[42vh] w-full max-w-[380px] object-contain"
      />
      <p className="mt-5 text-[15px] font-bold text-slate-900">話すだけで、現場が決まる。</p>
      <button
        onClick={close}
        className="mt-5 min-h-[40px] rounded-full border border-slate-300 px-5 text-[13px] font-bold text-slate-500 hover:bg-slate-50"
      >
        スキップ
      </button>
    </div>
  );
}
