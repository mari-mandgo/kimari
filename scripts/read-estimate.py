# 見積書（Excel）から、工事項目の文字だけを抜き出す。
#
# 数値セル（単価・金額・数量）は読み飛ばす。
# 契約に何が含まれているかを知りたいだけで、金額は要らないため。
# 金額を外部へ出さないという方針にもそのまま合う。
#
#   python read-estimate.py <xlsxのパス> --out <出力txt>

import argparse
import sys

import openpyxl


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("--out", required=True)
    ap.add_argument("--max-rows", type=int, default=2000)
    args = ap.parse_args()

    try:
        wb = openpyxl.load_workbook(args.path, data_only=True, read_only=True)
    except Exception as e:  # 壊れたファイル・xls形式など
        print(f"読み込めませんでした: {e}", file=sys.stderr)
        return 1

    lines: list[str] = []
    rows = 0

    for ws in wb.worksheets:
        sheet_lines: list[str] = []
        for row in ws.iter_rows():
            texts = []
            for c in row:
                v = c.value
                if isinstance(v, str):
                    v = v.strip()
                    # 数字だけの文字列も落とす（金額が文字列で入っていることがある）
                    if v and not v.replace(",", "").replace(".", "").replace("-", "").isdigit():
                        texts.append(v)
            if texts:
                sheet_lines.append(" | ".join(texts))
                rows += 1
                if rows >= args.max_rows:
                    break
        if sheet_lines:
            lines.append(f"### {ws.title}")
            lines.extend(sheet_lines)
        if rows >= args.max_rows:
            break

    with open(args.out, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
