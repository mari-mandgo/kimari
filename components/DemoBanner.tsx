/**
 * 公開デモであることを、全ページの一番上に出す。
 *
 * 触った人が「本物の現場のシステムを操作している」と誤解しないようにする。
 * この画面に出ている施主名・住所・打ち合わせはすべて架空のもので、
 * 何を押しても保存されない。**それが分からないまま触られるのが一番まずい。**
 *
 * 隠せるようにはしない。読んで消せる注意書きは、消えたあとに効かなくなる。
 */
export default function DemoBanner() {
  return (
    <div className="w-full bg-amber-400 text-slate-900">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5">
        <span className="rounded bg-slate-900 px-2 py-0.5 text-[12px] font-bold tracking-wide text-amber-300">
          デモ実行中
        </span>
        <span className="text-[13px] font-bold">
          これは公開デモです。操作しても保存されません。
        </span>
        <span className="text-[12px] leading-relaxed">
          施主名・住所・打ち合わせの内容はすべて架空のものです。録音と文字起こしは、
          自社サーバーで動かす部分のためデモでは行いません。
        </span>
        <a
          href="https://github.com/mari-mandgo/kimari"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto shrink-0 text-[12px] font-bold underline"
        >
          ソースコード
        </a>
      </div>
    </div>
  );
}
