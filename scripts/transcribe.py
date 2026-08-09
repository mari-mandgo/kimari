"""
音声をこのPCの中だけで文字起こしする。

音声には氏名・住所・電話番号がそのまま入っているため、外部サービスへ送らない。
外へ出るのは、このあとマスクを通したテキストだけ。

使い方:
  .venv/Scripts/python.exe scripts/transcribe.py <音声ファイル> [--model small] [--start 0] [--duration 0]

出力:
  <音声ファイル>.txt  … 話者ラベルなしの本文
"""

import argparse
import os
import sys
import time

from faster_whisper import WhisperModel


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("audio")
    p.add_argument("--model", default="small", help="tiny / base / small / medium / large-v3")
    p.add_argument("--start", type=float, default=0.0, help="開始秒（0なら先頭から）")
    p.add_argument("--duration", type=float, default=0.0, help="長さ秒（0なら最後まで）")
    p.add_argument("--out", default="", help="出力先。省略すると音声と同じ場所")
    args = p.parse_args()

    if not os.path.exists(args.audio):
        print(f"見つかりません: {args.audio}")
        return 1

    print(f"モデル: {args.model}（初回はダウンロードします）")
    # int8 はCPUでの実行を現実的な速さにするための量子化
    model = WhisperModel(args.model, device="cpu", compute_type="int8")

    clip = {}
    if args.start:
        clip["clip_timestamps"] = f"{args.start}"
    started = time.time()

    segments, info = model.transcribe(
        args.audio,
        language="ja",
        beam_size=5,
        vad_filter=True,  # 無音を飛ばして速くする
        vad_parameters={"min_silence_duration_ms": 500},
        **clip,
    )

    print(f"言語: {info.language}（確度 {info.language_probability:.2f}） / 音声長 {info.duration:.0f}秒")
    print("文字起こし中…")

    lines = []
    limit = args.start + args.duration if args.duration else None
    for seg in segments:
        if limit and seg.start > limit:
            break
        text = seg.text.strip()
        if not text:
            continue
        lines.append(text)
        mm, ss = divmod(int(seg.start), 60)
        print(f"  [{mm:02d}:{ss:02d}] {text}")

    body = "\n".join(lines)
    out = args.out or (os.path.splitext(args.audio)[0] + ".txt")
    with open(out, "w", encoding="utf-8") as f:
        f.write(body)

    print()
    print(f"完了: {len(body)}文字 / {time.time() - started:.0f}秒")
    print(f"保存: {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
