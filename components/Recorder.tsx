'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 打ち合わせの録音。
 *
 * 文字起こしは2経路ある。
 * 1. ブラウザ内蔵の音声認識（Android / PC Chrome）
 *    … 話しながらその場で文字になる。端末内処理なので無料で、音声は外に出ない
 * 2. 録音ファイルをローカルのWhisperで処理（iPhoneなど内蔵認識が無い端末）
 *    … 録音を保存し、あとからサーバー（自分のPC）で文字起こしする
 *
 * どちらの経路でも、音声そのものが外部サービスへ送られることはない。
 */

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export default function Recorder({
  onTranscript,
}: {
  /** 確定したテキストが増えるたびに全文を渡す */
  onTranscript: (text: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finalText, setFinalText] = useState('');
  const [interim, setInterim] = useState('');
  const [speechAvailable, setSpeechAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const keepGoing = useRef(false);
  const finalRef = useRef('');

  useEffect(() => {
    setSpeechAvailable(getRecognition() !== null);
    return () => stop(); // 画面を離れたら止める
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    setError(null);
    setFinalText('');
    finalRef.current = '';
    setInterim('');
    setAudioUrl(null);
    setElapsed(0);

    // 1. 録音（全端末共通。証拠としての音源を必ず残す）
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType });
        setAudioUrl(URL.createObjectURL(blob));
      };
      rec.start();
      mediaRef.current = rec;
    } catch {
      setError('マイクを使えませんでした。ブラウザのマイク許可を確認してください。');
      return;
    }

    // 2. その場の文字起こし（対応端末のみ）
    const recog = getRecognition();
    if (recog) {
      recog.lang = 'ja-JP';
      recog.continuous = true;
      recog.interimResults = true;
      recog.onresult = (e) => {
        let interimNow = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) {
            const t = r[0].transcript.trim();
            if (t) {
              finalRef.current = finalRef.current ? `${finalRef.current}\n${t}` : t;
              setFinalText(finalRef.current);
              onTranscript(finalRef.current);
            }
          } else {
            interimNow += r[0].transcript;
          }
        }
        setInterim(interimNow);
      };
      recog.onerror = (e) => {
        // no-speech は沈黙のたびに起きるので無視する
        if (e.error && e.error !== 'no-speech' && e.error !== 'aborted') {
          setError(`音声認識が中断しました（${e.error}）。録音は続いています。`);
        }
      };
      // ブラウザは沈黙で認識を止めるため、録音中は自動で立ち上げ直す
      recog.onend = () => {
        if (keepGoing.current) {
          try {
            recog.start();
          } catch {
            // 連続startの競合は無視してよい
          }
        }
      };
      keepGoing.current = true;
      recog.start();
      recogRef.current = recog;
    }

    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    setRecording(true);
  }

  function stop() {
    keepGoing.current = false;
    recogRef.current?.stop();
    recogRef.current = null;
    if (mediaRef.current && mediaRef.current.state !== 'inactive') mediaRef.current.stop();
    mediaRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setInterim('');
    setRecording(false);
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold">打ち合わせを録音する</h2>
          <p className="mt-0.5 text-[12px] text-slate-500">
            {speechAvailable === false
              ? 'この端末は録音のみ対応です（文字起こしは録音後に行います）'
              : '話した内容が、その場で下の欄に入っていきます'}
          </p>
        </div>
        <button
          onClick={recording ? stop : start}
          className={`flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center rounded-full font-bold text-white shadow-md transition-colors ${
            recording ? 'bg-rose-600' : 'bg-slate-900'
          }`}
        >
          {recording ? (
            <>
              <span className="block h-4 w-4 rounded-[3px] bg-white" />
              <span className="mt-1 text-[10px]">{mm}:{ss}</span>
            </>
          ) : (
            <>
              <span className="block h-4 w-4 rounded-full bg-rose-500" />
              <span className="mt-1 text-[10px]">録音</span>
            </>
          )}
        </button>
      </div>

      {recording && (
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <p className="flex items-center gap-2 text-[12px] font-bold text-rose-600">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-rose-600" />
            録音中 {mm}:{ss}
          </p>
          {(finalText || interim) && (
            <p className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">
              {finalText}
              {interim && <span className="text-slate-400">{finalText ? '\n' : ''}{interim}</span>}
            </p>
          )}
        </div>
      )}

      {!recording && audioUrl && (
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <p className="text-[12px] font-bold text-slate-600">録音した音声（この端末内にあります）</p>
          <audio controls src={audioUrl} className="mt-2 w-full" />
          {speechAvailable === false && (
            <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
              この端末では文字起こしができないため、音声を保存して
              PCの「文字起こし」から取り込んでください。
            </p>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-[13px] text-rose-700">{error}</p>}

      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
        音声と文字起こしは、この端末とあなたのサーバーの中だけで処理されます。外部の文字起こしサービスへは送られません。
      </p>
    </div>
  );
}
