import type { NextConfig } from "next";

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontendNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Добавляем пустую конфигурацию Turbopack, чтобы подружить его с PWA-плагином
  turbopack: {},
};

export default withPWA(nextConfig);