import type { NextConfig } from "next";

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontendNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  // Можешь вернуть обратно, когда будешь деплоить на прод:
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    // Указываем страницу, на которую воркер перенаправит при обрыве связи
    document: "/setlists", 
  },
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    // Принудительно говорим Workbox кэшировать навигацию для страниц
    navigateFallback: "/setlists",
    navigateFallbackDenylist: [/^\/_next\//, /^\/api\//],
  },
});

const nextConfig: NextConfig = {
  turbopack: {},
};

export default withPWA(nextConfig);