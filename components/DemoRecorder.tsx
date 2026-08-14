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
  onOpenSaved,
}: {
  onTranscript: (text: string) => void;
  onNames: (names: string) => void;
  /** この録音を仕分けた結果（保存済み）をそのまま開く */
  onOpenSaved?: () => void;
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

      {/*
        既に仕分けた結果を出すのを主にする。
        その場でAIを動かすと50〜80秒かかり、見ている人は待たされる。
        鍵はこちらの持ち出しなので、誰でも押せる入口に無制限の実行を置かない意味もある。
      */}
      <div className="mt-4">
        <button
          onClick={onOpenSaved}
          className="min-h-[52px] w-full rounded-xl bg-slate-900 px-5 text-[16px] font-bold text-white sm:w-auto"
        >
          この打ち合わせを仕分けた結果を見る
        </button>
        <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
          この音声を実際に仕分けた結果です。<b>抽出9件・所要82秒・原価0.18円</b>で出たものを、
          そのまま保存してあります。追加見積が必要な項目には拾い出しが付いていて、
          3つの文書（施主向け・職人向け・社内保存用）とベトナム語訳も入っています。
        </p>
      </div>

      <details className="mt-4 rounded-xl border border-slate-200 p-4">
        <summary className="cursor-pointer text-[13px] font-bold">
          その場でAIを動かしてみる（50〜80秒かかります）
        </summary>
        <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
          文字起こしを本文欄に入れて、自分で「仕分ける」を押せます。
          入るのは、この音声をサーバー上の faster-whisper にかけて出てきた文字起こしそのもので、
          誤認識も直していません（「建具」が「縦側」、「食洗機」が「特選期」になっています）。
          <b>それでも仕分けが文脈から復元します。</b>
        </p>
        <button
          onClick={() => {
            onTranscript(SAMPLE_TRANSCRIPT);
            onNames(SAMPLE_NAMES);
            setFilled(true);
          }}
          className="mt-3 min-h-[44px] rounded-xl border-2 border-slate-900 px-4 text-[14px] font-bold text-slate-900"
        >
          {filled ? '入れ直す' : '文字起こしを本文欄に入れる'}
        </button>
        {filled && (
          <p className="mt-2 text-[13px] font-bold text-emerald-700">
            入りました。下の「仕分ける」を押してください
          </p>
        )}
      </details>
    </section>
  );
}
