import type { NextConfig } from "next";

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontendNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  // Добавляем fallback для страниц, чтобы при оффлайн-доступе к динамическим роутам отдавался кэш или главная оболочка
  fallbacks: {
    document: "/setlists", // Если страница не найдена в кэше оффлайн, перенаправляем на список сетлистов
  },
});

const nextConfig: NextConfig = {
  turbopack: {},
};

export default withPWA(nextConfig);