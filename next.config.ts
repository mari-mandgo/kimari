import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
    公開デモは demo-data/ を実行時に読む（lib/demo.ts）。
    読む先を path.join で組み立てているため、
    Vercel の自動追跡ではこのフォルダが同梱されない。
    入れ忘れると、デプロイ後に現場が1件も見つからない状態になる。
  */
  outputFileTracingIncludes: {
    '/**': ['demo-data/**'],
  },
};

export default nextConfig;
