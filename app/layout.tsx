import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import DemoBanner from "@/components/DemoBanner";
import { IS_DEMO } from "@/lib/demo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KIMARI｜打ち合わせから、追加見積が必要な変更を見つける",
  description:
    "建築・リフォームの打ち合わせ記録から、追加見積が必要な変更と期限を見つけ、施主・職人・社内それぞれ向けの文書を作ります。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/*
        デモの帯（32px）を固定で出すぶん、画面側のヘッダーを下げる。
        AppShell はこの --app-top を見て自分の sticky の位置を決める
      */}
      <body
        className="min-h-full flex flex-col"
        style={IS_DEMO ? ({ '--app-top': '32px' } as React.CSSProperties) : undefined}
      >
        {/* 公開デモのときだけ。施主ページ・LPを含む全ページの一番上に出す */}
        {IS_DEMO && <DemoBanner />}
        {children}
      </body>
    </html>
  );
}
