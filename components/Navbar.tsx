"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [user, setUser] = useState<any>(null); // Стан для користувача
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Перевірка авторизації
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Логіка пошуку
  useEffect(() => {
    const fetchSongs = async () => {
      const trimmedQuery = searchQuery.trim();
      if (trimmedQuery.length < 2) {
        setResults([]);
        setIsDropdownOpen(false);
        return;
      }

      const { data } = await supabase
        .from("songs")
        .select("id, title")
        .ilike("title", `${trimmedQuery}%`) 
        .limit(5);

      if (data) {
        setResults(data);
        setIsDropdownOpen(true);
      }
    };

    const timer = setTimeout(fetchSongs, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Закриття пошуку при кліку зовні
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  if (pathname.startsWith('/setlists/')) return null;

  return (
    <header className="w-full bg-white border-b border-gray-200 h-[65px] flex items-center shadow-sm sticky top-0 z-50">
      <div className="w-full px-6 flex items-center justify-between">
        
        
        {/* LEFT: Логотип з метрономом */}
        <div className="flex-shrink-0 flex items-center">
          <Link href="/" className="flex items-center gap-2 group">
            {/* Іконка метронома (стилізована) */}
            <div className="relative w-8 h-8 flex items-center justify-center bg-[#0090ff] rounded-lg shadow-lg group-hover:bg-[#007cdb] transition-colors">
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="white" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="w-5 h-5"
              >
                {/* Корпус метронома */}
                <path d="M12 2L7 22h10L12 2z" />
                {/* Маятник */}
                <path d="M12 18l-2-9" className="animate-[ping_1.5s_infinite]" />
                {/* Грузик на маятнику */}
                <circle cx="10" cy="9" r="1" fill="white" />
              </svg>
            </div>

            {/* Текст логотипа */}
            <span className="text-black font-black italic text-xl tracking-tighter ml-1">
              CHORDS<span className="text-[#0090ff] not-italic">CHART</span>
            </span>
          </Link>
        </div>

        {/* CENTER: Search */}
        <div className="flex-1 flex justify-center px-10 relative" ref={dropdownRef}>
          <div className="relative w-full max-w-lg group">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setIsDropdownOpen(true)}
              placeholder="Шукати пісню за назвою..." 
              className="w-full bg-[#f2f2f2] border-none rounded-full py-2 px-10 text-[13px] text-black placeholder-[#999] focus:ring-2 focus:ring-[#0090ff33] outline-none transition-all"
            />
            <svg className="w-4 h-4 absolute left-3.5 top-2.5 text-[#999] group-focus-within:text-[#0090ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>

            {isDropdownOpen && results.length > 0 && (
              <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-2xl mt-2 shadow-2xl py-2 z-[100] overflow-hidden">
                {results.map((song) => (
                  <button
                    key={song.id}
                    onClick={() => {
                      router.push(`/song/${song.id}`);
                      setSearchQuery("");
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-5 py-3 hover:bg-blue-50 text-black text-[13px] font-medium transition-colors border-b border-gray-50 last:border-none flex items-center justify-between group"
                  >
                    <span>{song.title}</span>
                    <span className="text-[#0090ff] opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold">ВІДКРИТИ →</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Menu & Auth */}
        <div className="flex items-center gap-6">
          <nav className="hidden lg:flex items-center gap-6">
            <Link href="/songs" className={`text-[13px] font-bold uppercase tracking-wider transition-colors ${pathname === '/songs' ? 'text-[#0090ff]' : 'text-[#666] hover:text-black'}`}>
              Пісні
            </Link>
            <Link href="/setlists" className={`text-[13px] font-bold uppercase tracking-wider transition-colors ${pathname === '/setlists' ? 'text-[#0090ff]' : 'text-[#666] hover:text-black'}`}>
              Сетлісти
            </Link>
          </nav>

          <div className="h-6 w-[1px] bg-gray-200 hidden md:block"></div>

          <div className="flex items-center gap-4">
            {user ? (
              // Вигляд, коли користувач залогінений
              <div className="flex items-center gap-4">
                <span className="text-[11px] text-gray-400 font-medium lowercase hidden xl:inline">
                  {user.email}
                </span>
                <button 
                  onClick={handleLogout}
                  className="text-[#cc0000] text-[12px] font-bold uppercase tracking-widest hover:opacity-70 transition-all"
                >
                  Вийти
                </button>
              </div>
            ) : (
              // Вигляд, коли НЕ залогінений
              <Link href="/login" className="text-[#888] text-[12px] font-bold uppercase tracking-widest hover:text-black transition-colors flex items-center gap-2">
                <div className="w-8 h-8 border border-gray-200 rounded-full flex items-center justify-center">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                   </svg>
                </div>
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}