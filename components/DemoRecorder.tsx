'use client';

import { useState } from 'react';
import { SAMPLE_TRANSCRIPT, SAMPLE_NAMES } from '@/lib/sample';

/**
 * 公開デモでの、録音の代わり。
 *
 * 文字起こしは faster-whisper（Python）を自社のサーバーで動かす作りなので、
 * 公開デモの環境では動かない。**動かないボタンを置いて押させない。**
 *
 * 代わりに、実際に録った打ち合わせの音声をそのまま聴けるようにしてある。
 * この音声は施主役をChatGPTに演じてもらった架空の打ち合わせで、
 * デモ動画でも同じものを使っている。実案件の録音は載せていない。
 */
export default function DemoRecorder({
  onTranscript,
  onNames,
}: {
  onTranscript: (text: string) => void;
  onNames: (names: string) => void;
}) {
  const [filled, setFilled] = useState(false);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-[15px] font-bold">打ち合わせの音声</h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
        この公開デモでは録音できません。文字起こしは<b>自社のサーバーの中だけ</b>で行う作りで、
        そのサーバーがここには無いためです。
        <br />
        下は、実際にこのアプリで録った打ち合わせです（8分16秒）。施主役はChatGPTに演じてもらいました。
      </p>

      <audio controls preload="none" src="/demo/uchiawase.mp3" className="mt-3 w-full">
        お使いのブラウザは音声の再生に対応していません。
      </audio>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() => {
            onTranscript(SAMPLE_TRANSCRIPT);
            onNames(SAMPLE_NAMES);
            setFilled(true);
          }}
          className="min-h-[48px] rounded-xl bg-slate-900 px-5 text-[15px] font-bold text-white"
        >
          {filled ? '入れ直す' : 'この録音の文字起こしを入れる'}
        </button>
        {filled && (
          <span className="text-[13px] font-bold text-emerald-700">
            入りました。下の「仕分ける」を押してください
          </span>
        )}
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-slate-500">
        入るのは、この音声をサーバー上の faster-whisper にかけて出てきた文字起こしそのものです。
        誤認識も直していません（「建具」が「縦側」、「食洗機」が「特選期」になっています）。
        <b>そこから先も動きます。</b>
      </p>
    </section>
  );
}
