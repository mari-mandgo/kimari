'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ESTIMATE_TEMPLATES,
  type Estimate,
  type EstimateRow,
  type EstimateTemplate,
} from '@/lib/estimate-kinds';
import Logo from '@/components/Logo';

/**
 * 追加見積書。拾い出しの結果を器にして、数量と単価を人が入れる。
 *
 * AIに金額を出させない理由は2つ。
 * 単価は会社ごと・時期ごとに違うので、AIが出した数字は実務で使えない。
 * そして変更工事の見積は、建設業法上、事業者が書面で提示する責任を負う。
 *
 * 画面の編集欄は印刷に出さない（.no-print）。印刷すると見積書だけが残る。
 */
export default function EstimateEditor({
  projectId,
  projectName,
  companyName,
  companyLogo,
  companyAddress,
  companyTel,
  estimateFiles,
  initial,
}: {
  projectId: string;
  projectName: string;
  /** 現場に登録された「見積」種別のファイル。当初見積の添付に使う */
  estimateFiles: { id: string; original: string }[];
  /** 施主へお出しする書面に載るのは自社の名前。KIMARIのものではない */
  companyName?: string;
  companyLogo?: string;
  companyAddress?: string;
  companyTel?: string;
  initial: Estimate;
}) {
  const [est, setEst] = useState<Estimate>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const patch = (p: Partial<Estimate>) => setEst((e) => ({ ...e, ...p }));

  function setRow(i: number, p: Partial<EstimateRow>) {
    const rows = [...est.rows];
    rows[i] = { ...rows[i], ...p };
    patch({ rows });
  }

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/projects/${projectId}/estimates`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(est),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const amount = (r: EstimateRow) =>
    r.qty !== null && r.unitPrice !== null ? r.qty * r.unitPrice : null;

  const add = est.rows.filter((r) => !r.isDeduction).reduce((s, r) => s + (amount(r) ?? 0), 0);
  const sub = est.rows.filter((r) => r.isDeduction).reduce((s, r) => s + (amount(r) ?? 0), 0);
  const net = add - sub;
  const isDelta = est.template === 'delta';

  // 増減表は「当初金額＋増減」が請負金額になる。他のひな型は増減分だけを見る
  const base = est.baseAmount ?? null;
  const taxable = isDelta && base !== null ? base + net : net;
  const tax = Math.floor((taxable * est.taxRate) / 100);
  const grandTotal = taxable + tax;
  const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`;
  const baseFileName = estimateFiles.find((f) => f.id === est.baseFileId)?.original;

  const hasCover = est.template === 'cover' || isDelta;

  const cell = 'border border-slate-300 px-2 py-1.5 text-[13px]';
  const input =
    'w-full bg-transparent text-right outline-none focus:bg-amber-50 print:focus:bg-transparent';

  return (
    <main className="min-h-screen bg-slate-100 py-6 text-slate-900 print:bg-white print:py-0">
      {/* 操作。印刷には出さない */}
      <div className="no-print mx-auto mb-5 w-full max-w-[860px] px-5">
        <Link href={`/p/${projectId}`} className="text-[13px] text-slate-500 underline">
          ← 現場へ戻る
        </Link>

        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-[17px] font-bold">追加見積書をつくる</h1>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
            項目は拾い出しから入っています。<b>数量と単価は入力してください。</b>
            単価は会社ごと・時期ごとに違うため、AIには出させていません。
          </p>

          <div className="mt-4">
            <span className="text-[13px] font-bold text-slate-600">ひな型</span>
            <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
              {ESTIMATE_TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => patch({ template: t.key as EstimateTemplate })}
                  className={`rounded-xl border p-3 text-left ${
                    est.template === t.key
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  <span className="block text-[14px] font-bold">{t.label}</span>
                  <span
                    className={`mt-0.5 block text-[11px] leading-snug ${
                      est.template === t.key ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {t.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[13px] font-bold text-slate-600">件名</span>
              <input
                value={est.title}
                onChange={(e) => patch({ title: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-[14px]"
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-bold text-slate-600">宛名</span>
              <input
                value={est.clientName}
                onChange={(e) => patch({ clientName: e.target.value })}
                placeholder="◯◯ 様"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-[14px]"
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-bold text-slate-600">発行日</span>
              <input
                type="date"
                value={est.issuedOn}
                onChange={(e) => patch({ issuedOn: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-[14px]"
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-bold text-slate-600">消費税率（%）</span>
              <input
                type="number"
                value={est.taxRate}
                onChange={(e) => patch({ taxRate: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-[14px]"
              />
            </label>
          </div>

          {/* 増減表は当初金額が無いと成立しない。「変更後いくらか」を出せないため */}
          {isDelta && (
            <div className="mt-3 rounded-xl bg-slate-50 p-4">
              <h2 className="text-[13px] font-bold text-slate-700">当初の請負契約</h2>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[12px] text-slate-600">当初請負金額（税抜）</span>
                  <input
                    type="number"
                    value={est.baseAmount ?? ''}
                    onChange={(e) =>
                      patch({ baseAmount: e.target.value === '' ? null : Number(e.target.value) })
                    }
                    placeholder="8500000"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-right text-[14px]"
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] text-slate-600">当初見積書（添付）</span>
                  <select
                    value={est.baseFileId ?? ''}
                    onChange={(e) => patch({ baseFileId: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-[14px]"
                  >
                    <option value="">選択しない</option>
                    {estimateFiles.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.original}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
                当初の見積書（Excel・PDF）は、<b>資料・図面・写真から種別「見積」でアップロード</b>
                すると、ここで選べるようになります。
                {estimateFiles.length === 0 && ' まだ登録がありません。'}
              </p>
            </div>
          )}

          <label className="mt-3 block">
            <span className="text-[13px] font-bold text-slate-600">備考</span>
            <textarea
              value={est.note}
              onChange={(e) => patch({ note: e.target.value })}
              rows={2}
              placeholder="解体後に判明した事項による変更です。／ 有効期限は発行後1か月です。"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-[14px]"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="min-h-[48px] rounded-xl bg-slate-900 px-6 text-[15px] font-bold text-white disabled:opacity-40"
            >
              {saved ? '保存しました' : saving ? '保存中…' : '保存する'}
            </button>
            <button
              onClick={() => window.print()}
              className="min-h-[48px] rounded-xl border-2 border-slate-900 px-6 text-[15px] font-bold"
            >
              印刷 / PDFで保存
            </button>
            <button
              onClick={() =>
                patch({
                  rows: [
                    ...est.rows,
                    { category: '', name: '', unit: '式', qty: null, unitPrice: null, note: '' },
                  ],
                })
              }
              className="min-h-[48px] rounded-xl border border-slate-300 px-4 text-[14px] font-bold text-slate-700"
            >
              行を追加
            </button>
          </div>
        </div>
      </div>

      {/* ここから見積書本体。印刷されるのはこの部分だけ */}
      <div className="mx-auto w-full max-w-[860px] bg-white px-5 py-8 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        {hasCover && (
          <header className="mb-8">
            <h2 className="text-center text-[24px] font-bold tracking-[0.3em]">
              {isDelta ? '工事金額増減表' : '追加御見積書'}
            </h2>
            <p className="mt-1 text-center text-[12px] text-slate-500">
              追加見積 No.{est.no}
            </p>

            <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
              <div className="min-w-[240px]">
                <p className="border-b border-slate-400 pb-1 text-[18px] font-bold">
                  {est.clientName || '　'}
                </p>
                <p className="mt-4 text-[13px] leading-relaxed">
                  下記のとおり御見積申し上げます。
                </p>
                <dl className="mt-3 space-y-1 text-[13px]">
                  <div className="flex gap-3">
                    <dt className="w-16 shrink-0 text-slate-500">件名</dt>
                    <dd className="font-bold">{est.title}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-16 shrink-0 text-slate-500">工事場所</dt>
                    <dd>{projectName}</dd>
                  </div>
                </dl>
              </div>

              <div className="text-right text-[12px] leading-relaxed">
                <p>{est.issuedOn}</p>
                {companyLogo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={companyLogo}
                    alt=""
                    className="mt-2 ml-auto max-h-[44px] max-w-[180px] object-contain"
                  />
                )}
                <p className="mt-2 text-[15px] font-bold">{companyName || '　'}</p>
                {companyAddress && <p className="text-slate-500">{companyAddress}</p>}
                {companyTel && <p className="text-slate-500">TEL {companyTel}</p>}
                <p className="mt-0.5 text-slate-500">担当：{est.createdBy}</p>
              </div>
            </div>

            <div className="mt-6 border-y-2 border-slate-900 py-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[14px] font-bold tracking-widest">
                  {isDelta ? '差引増減額（税込）' : '御見積金額（税込）'}
                </span>
                <span className="text-[26px] font-bold">{yen(grandTotal)}</span>
              </div>
            </div>
          </header>
        )}

        {!hasCover && (
          <h2 className="mb-4 text-[18px] font-bold">
            {est.title}　<span className="text-[13px] font-normal text-slate-500">明細</span>
          </h2>
        )}

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className={`${cell} w-[84px] text-left`}>工種</th>
              <th className={`${cell} text-left`}>名称</th>
              <th className={`${cell} w-[52px]`}>単位</th>
              <th className={`${cell} w-[68px]`}>数量</th>
              <th className={`${cell} w-[90px]`}>単価</th>
              <th className={`${cell} w-[100px]`}>金額</th>
              {isDelta && <th className={`${cell} w-[52px]`}>増減</th>}
            </tr>
          </thead>
          <tbody>
            {est.rows.map((r, i) => {
              const a = amount(r);
              return (
                <tr key={i} className={r.isDeduction ? 'bg-slate-50' : ''}>
                  <td className={`${cell} text-slate-500`}>
                    <input
                      value={r.category}
                      onChange={(e) => setRow(i, { category: e.target.value })}
                      className="w-full bg-transparent outline-none focus:bg-amber-50 print:focus:bg-transparent"
                    />
                  </td>
                  <td className={cell}>
                    <input
                      value={r.name}
                      onChange={(e) => setRow(i, { name: e.target.value })}
                      className="w-full bg-transparent font-bold outline-none focus:bg-amber-50 print:focus:bg-transparent"
                    />
                    {r.note && (
                      <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{r.note}</p>
                    )}
                  </td>
                  <td className={`${cell} text-center`}>
                    <input
                      value={r.unit}
                      onChange={(e) => setRow(i, { unit: e.target.value })}
                      className="w-full bg-transparent text-center outline-none focus:bg-amber-50 print:focus:bg-transparent"
                    />
                  </td>
                  <td className={cell}>
                    <input
                      type="number"
                      value={r.qty ?? ''}
                      onChange={(e) =>
                        setRow(i, { qty: e.target.value === '' ? null : Number(e.target.value) })
                      }
                      className={input}
                    />
                  </td>
                  <td className={cell}>
                    <input
                      type="number"
                      value={r.unitPrice ?? ''}
                      onChange={(e) =>
                        setRow(i, {
                          unitPrice: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                      className={input}
                    />
                  </td>
                  <td className={`${cell} text-right font-bold`}>{a === null ? '' : yen(a)}</td>
                  {isDelta && (
                    <td className={`${cell} text-center`}>
                      <button
                        onClick={() => setRow(i, { isDeduction: !r.isDeduction })}
                        className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${
                          r.isDeduction ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {r.isDeduction ? '減' : '増'}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* 合計 */}
        <div className="mt-4 flex justify-end">
          <table className="w-[300px] border-collapse">
            <tbody>
              {isDelta ? (
                <>
                  <tr>
                    <td className={`${cell} bg-slate-50`}>当初請負金額</td>
                    <td className={`${cell} text-right`}>
                      {base === null ? '—' : yen(base)}
                    </td>
                  </tr>
                  <tr>
                    <td className={`${cell} bg-slate-50`}>増額計</td>
                    <td className={`${cell} text-right font-bold`}>{yen(add)}</td>
                  </tr>
                  <tr>
                    <td className={`${cell} bg-slate-50`}>減額計</td>
                    <td className={`${cell} text-right font-bold`}>− {yen(sub)}</td>
                  </tr>
                  <tr>
                    <td className={`${cell} bg-slate-50`}>差引増減</td>
                    <td className={`${cell} text-right font-bold`}>
                      {net >= 0 ? '' : '− '}
                      {yen(Math.abs(net))}
                    </td>
                  </tr>
                  <tr>
                    <td className={`${cell} bg-slate-50`}>変更後請負金額</td>
                    <td className={`${cell} text-right font-bold`}>
                      {base === null ? '—' : yen(base + net)}
                    </td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td className={`${cell} bg-slate-50`}>小計</td>
                  <td className={`${cell} text-right font-bold`}>{yen(net)}</td>
                </tr>
              )}
              <tr>
                <td className={`${cell} bg-slate-50`}>消費税（{est.taxRate}%）</td>
                <td className={`${cell} text-right`}>{yen(tax)}</td>
              </tr>
              <tr>
                <td className={`${cell} bg-slate-900 font-bold text-white`}>
                  {isDelta ? '変更後請負金額（税込）' : '合計'}
                </td>
                <td className={`${cell} text-right text-[16px] font-bold`}>{yen(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {(est.note || est.sourceTitle || baseFileName) && (
          <section className="mt-6 border-t border-slate-200 pt-4 text-[12px] leading-relaxed text-slate-600">
            <p className="font-bold text-slate-700">備考</p>
            {est.note && <p className="mt-1 whitespace-pre-wrap">{est.note}</p>}
            {est.sourceTitle && (
              <p className="mt-1">
                本見積は「{est.sourceTitle}」に関する変更分です。もともとの契約に含まれる工事は含みません。
              </p>
            )}
            {baseFileName && <p className="mt-1">当初見積書：{baseFileName}</p>}
          </section>
        )}

        <footer className="mt-8 flex items-center justify-between border-t border-slate-200 pt-4">
          <Logo size="sm" />
          <p className="text-[10px] text-slate-400">
            項目の拾い出しにKIMARIを使用しています。金額は当社が確認したものです。
          </p>
        </footer>
      </div>
    </main>
  );
}
