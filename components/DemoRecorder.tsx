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
  onOpenSaved,
}: {
  /** この録音を仕分けた結果（保存済み）をそのまま開く */
  onOpenSaved?: () => void;
}) {
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

      {/*
        以前ここに「その場でAIを動かす」を置いていたが、外した。
        押すと下の本文欄にテキストが入るだけで、画面の上では何も起きたように見えず、
        壊れていると受け取られる。動いたかどうかが分からないボタンは置かない。
        自分の打ち合わせで試したい人は、下の本文欄に貼って「仕分ける」を押せる。
      */}
    </section>
  );
}
