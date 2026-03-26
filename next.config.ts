import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // アップロードAPIへの大ファイル（CR3等）のリクエストボディ制限を2GBに引き上げ
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...(({ middlewareClientMaxBodySize: 2 * 1024 * 1024 * 1024 }) as any),
};

export default nextConfig;
