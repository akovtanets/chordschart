import type { Metadata } from "next";
import "./globals.css";

// Метаданные для SEO и названия вкладки в браузере
export const metadata: Metadata = {
  title: "ChordsChart - Акорди для прославлення",
  description: "Українська база акордів та сетлістів для команд прославлення",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body className="flex flex-col min-h-screen bg-[#111111] text-white font-sans selection:bg-blue-500/30">
        
        {/* Header / Шапка */}
        <header className="bg-[#1a1a1a] border-b border-gray-800 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              
              {/* Логотип */}
              <div className="flex-shrink-0">
                <a href="/" className="text-xl font-bold tracking-wider text-white flex items-center gap-2">
                  <span className="text-blue-500 text-2xl">♪</span> ChordsChart
                </a>
              </div>
              
              {/* Меню навигации (для компьютеров) */}
              <nav className="hidden md:block">
                <ul className="flex items-center space-x-8">
                  <li><a href="/" className="text-gray-300 hover:text-white transition-colors">Головна</a></li>
                  <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Сетлісти</a></li>
                  <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Команди</a></li>
                  <li><a href="#" className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-xl font-medium transition-all shadow-[0_0_10px_rgba(37,99,235,0.2)]">Увійти</a></li>
                </ul>
              </nav>

              {/* Мобильная кнопка меню */}
              <div className="md:hidden">
                <button className="text-gray-300 hover:text-white p-2 focus:outline-none">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                  </svg>
                </button>
              </div>

            </div>
          </div>
        </header>

        {/* Main Content / Основной контент */}
        {/* Сюда Next.js автоматически подставляет код из page.tsx */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer / Подвал */}
        <footer className="bg-[#1a1a1a] border-t border-gray-800 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              
              <div className="flex flex-col items-center md:items-start">
                <span className="text-lg font-bold text-white mb-1">ChordsChart</span>
                <p className="text-gray-500 text-sm">
                  © {new Date().getFullYear()} Всі права захищені.
                </p>
              </div>

              <div className="flex space-x-6 text-sm mt-4 md:mt-0">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">Контакти</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">Умови використання (Disclaimer)</a>
              </div>

            </div>
          </div>
        </footer>

      </body>
    </html>
  );
}