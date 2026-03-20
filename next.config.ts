import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  compiler: {
    // 운영 환경(build)에서 모든 console.log 제거
    removeConsole: process.env.NODE_ENV === "production",
  },
  serverExternalPackages: ['argon2-browser'],
  /* config options here */
};

export default nextConfig;
