'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 打ち合わせの録音。
 *
 * 文字起こしは、録音したファイルを自社のサーバーへ渡し、
 * そこで faster-whisper にかける経路だけにしている。
 *
 * 以前はブラウザ内蔵の音声認識（SpeechRecognition）も併用していたが、外した。
 * Chromeの実装は音声をGoogleのサーバーへ送るため、
 * 「音声を外部サービスへ出さない」という前提と両立しない。
 * 打ち合わせの音声には施主の氏名・住所・電話がそのまま入っている。
 *
 * つまり音声が渡るのは、この端末と、自社で動かしているサーバーだけ。
 * 第三者のサービスには届かない。
 */

export default function Recorder({
  onTranscript,
}: {
  /** 確定したテキストが増えるたびに全文を渡す */
  onTranscript: (text: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcribing, setTranscribing] = useState(false);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => stop(); // 画面を離れたら止める
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 録音（またはファイル）をローカルのWhisperで文字起こしする。本命の経路 */
  async function transcribe(blob: Blob, name = 'recording.webm') {
    setTranscribing(true);
    setError(null);
    try {
      const form = new FormData();
      form.set('file', new File([blob], name, { type: blob.type || 'audio/webm' }));
      const r = await fetch('/api/transcribe', { method: 'POST', body: form });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? '文字起こしに失敗しました');
      const text = String(j.text ?? '').trim();
      if (!text) throw new Error('音声から文字を取り出せませんでした');
      onTranscript(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setTranscribing(false);
    }
  }

  async function start() {
    setError(null);
    setAudioUrl(null);
    setAudioBlob(null);
    setElapsed(0);

    // 録音（全端末共通。証拠としての音源を必ず残す）
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
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };
      rec.start();
      mediaRef.current = rec;
    } catch {
      setError('マイクを使えませんでした。ブラウザのマイク許可を確認してください。');
      return;
    }

    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    setRecording(true);
  }

  function stop() {
    if (mediaRef.current && mediaRef.current.state !== 'inactive') mediaRef.current.stop();
    mediaRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
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
            録音を止めると、文字起こしができます
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
          <p className="mt-1.5 text-[12px] leading-relaxed text-slate-500">
            音声はこの端末に残ります。止めてから文字起こしをしてください。
          </p>
        </div>
      )}

      {!recording && audioUrl && (
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <p className="text-[12px] font-bold text-slate-600">録音した音声（この端末内にあります）</p>
          <audio controls src={audioUrl} className="mt-2 w-full" />
          <button
            onClick={() => audioBlob && transcribe(audioBlob)}
            disabled={transcribing || !audioBlob}
            className="mt-3 min-h-[48px] w-full rounded-xl bg-slate-900 text-[14px] font-bold text-white disabled:opacity-40"
          >
            {transcribing ? '文字起こししています…（数分かかることがあります）' : 'この録音を文字起こしして記録欄へ'}
          </button>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
            机に置いた録音は、その場の認識より、こちらの文字起こしのほうが正確です。
            処理はこのサーバーの中だけで行われます。
          </p>
        </div>
      )}

      {/* 別で録った音声（iPhoneのボイスメモ等）の取り込み口 */}
      {!recording && (
        <label className="mt-3 block cursor-pointer text-center text-[12px] font-bold text-slate-500 underline">
          {transcribing ? '処理中…' : '録音ファイルを取り込んで文字起こし（m4a / mp3 / wav）'}
          <input
            type="file"
            accept="audio/*,.m4a,.mp3,.wav,.webm"
            className="hidden"
            disabled={transcribing}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) transcribe(f, f.name);
              e.target.value = '';
            }}
          />
        </label>
      )}

      {error && <p className="mt-3 text-[13px] text-rose-700">{error}</p>}

      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
        音声と文字起こしは、この端末とあなたのサーバーの中だけで処理されます。外部の文字起こしサービスへは送られません。
      </p>
    </div>
  );
}
