import Link from "next/link";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "ChordsChart",
  description: "Акорди для прославлення",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk">
      <body className={inter.className}>
        {/* Скрипт для принудительного удаления старых Service Worker-ов у всех пользователей */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for (let registration of registrations) {
                    registration.unregister();
                  }
                });
              }
            `,
          }}
        />
        <Navbar />
        {/* Основний контент розтягується на весь доступний простір */}
        <main className="flex-grow">
          {children}
        </main>

        {/* Футер з посиланням на правила */}
        <footer className="border-t border-gray-900 py-6 text-center text-xs text-gray-500">
          <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>© {new Date().getFullYear()} ChordsChart. Всі права захищені.</p>
            <div className="flex gap-6">
              <Link 
                href="/terms" 
                className="hover:text-white transition-colors uppercase tracking-widest text-[10px] font-bold"
              >
                Умови використання
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}