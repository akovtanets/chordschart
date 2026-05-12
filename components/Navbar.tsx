"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  
  // Стани пошуку
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Стани користувача та профілю
  const [user, setUser] = useState<any>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        
        // Завантажуємо профіль, якщо користувач авторизований
        const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
        if (data) {
          setFirstName(data.first_name || "");
          setLastName(data.last_name || "");
          setPhone(data.phone || "");
          setSpecialty(data.specialty || "");
        }
      } else {
        setUser(null);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
      if (event === "SIGNED_OUT") router.push("/");
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Пошук пісень
  useEffect(() => {
    const fetchSongs = async () => {
      const trimmedQuery = searchQuery.trim();
      if (trimmedQuery.length < 2) {
        setResults([]);
        setIsDropdownOpen(false);
        return;
      }

      const { data } = await supabase.from("songs").select("id, title").ilike("title", `${trimmedQuery}%`).limit(5);

      if (data) {
        setResults(data);
        setIsDropdownOpen(true);
      }
    };

    const timer = setTimeout(fetchSongs, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Клік поза випадаючими вікнами (закриває і пошук, і меню профілю)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      first_name: firstName,
      last_name: lastName,
      phone: phone,
      specialty: specialty
    });

    setSavingProfile(false);
    if (!error) setIsProfileModalOpen(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (pathname.startsWith('/setlists/')) return null;

  return (
    <>
      <header className="w-full bg-white border-b border-gray-200 min-h-[60px] md:h-[65px] flex items-center shadow-sm sticky top-0 z-50 print:border-none print:shadow-none py-2 md:py-0">
        <div className="w-full px-4 md:px-6 flex items-center justify-between gap-2 md:gap-4">
          
          {/* LEFT: Логотип */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center gap-1.5 md:gap-2 group">
              <div className="relative w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-[#0090ff] rounded-md md:rounded-lg shadow-lg group-hover:bg-[#007cdb] transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 md:w-5 md:h-5">
                  <path d="M12 2L7 22h10L12 2z" />
                  <path d="M12 18l-2-9" className="animate-[ping_1.5s_infinite]" />
                  <circle cx="10" cy="9" r="1" fill="white" />
                </svg>
              </div>
              <span className="text-black font-black italic text-lg md:text-xl tracking-tighter">
                CHORDS<span className="text-[#0090ff] not-italic">CHART</span>
              </span>
            </Link>
          </div>

          {/* CENTER: Search */}
          <div className="flex-1 flex justify-center px-2 md:px-10 relative print:hidden" ref={dropdownRef}>
            <div className="relative w-full max-w-lg group">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setIsDropdownOpen(true)}
                placeholder="Шукати..." 
                className="w-full bg-[#f2f2f2] border-none rounded-full py-1.5 md:py-2 px-8 md:px-10 text-[11px] md:text-[13px] text-black placeholder-[#999] focus:ring-2 focus:ring-[#0090ff33] outline-none transition-all"
              />
              <svg className="w-3.5 h-3.5 md:w-4 md:h-4 absolute left-3 md:left-3.5 top-2 md:top-2.5 text-[#999] group-focus-within:text-[#0090ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>

              {isDropdownOpen && results.length > 0 && (
                <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-xl md:rounded-2xl mt-2 shadow-2xl py-2 z-[100] overflow-hidden">
                  {results.map((song) => (
                    <button key={song.id} onClick={() => { router.push(`/song/${song.id}`); setSearchQuery(""); setIsDropdownOpen(false); }} className="w-full text-left px-4 md:px-5 py-2.5 md:py-3 hover:bg-blue-50 text-black text-[12px] md:text-[13px] font-medium transition-colors border-b border-gray-50 last:border-none flex items-center justify-between group">
                      <span className="truncate pr-2">{song.title}</span>
                      <span className="text-[#0090ff] opacity-0 group-hover:opacity-100 transition-opacity text-[9px] md:text-[10px] font-bold flex-shrink-0">ВІДКРИТИ →</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Menu & Auth */}
          <div className="flex items-center gap-3 md:gap-6 print:hidden flex-shrink-0">
            <nav className="hidden lg:flex items-center gap-6">
              <Link href="/songs" className={`text-[13px] font-bold uppercase tracking-wider transition-colors ${pathname === '/songs' ? 'text-[#0090ff]' : 'text-[#666] hover:text-black'}`}>Пісні</Link>
              {user && (
                <>
                  <Link href="/setlists" className={`text-[13px] font-bold uppercase tracking-wider transition-colors ${pathname === '/setlists' ? 'text-[#0090ff]' : 'text-[#666] hover:text-black'}`}>Сетлісти</Link>
                  <Link href="/team" className={`text-[13px] font-bold uppercase tracking-wider transition-colors ${pathname === '/team' ? 'text-[#0090ff]' : 'text-[#666] hover:text-black'}`}>Команда</Link>
                </>
              )}
            </nav>

            <div className="h-6 w-[1px] bg-gray-200 hidden md:block"></div>

            <div className="flex items-center gap-4">
              {user ? (
                // БЛОК МЕНЮ ПРОФІЛЮ ЗАМІСТЬ ПРОСТО EMAIL
                <div className="relative" ref={profileDropdownRef}>
                  <button 
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="flex items-center gap-2 text-[#666] hover:text-black transition-colors group"
                  >
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[#f2f2f2] border border-gray-200 flex items-center justify-center text-[#0090ff] text-[12px] font-bold uppercase group-hover:border-[#0090ff] transition-colors">
                      {firstName ? firstName[0] : user.email?.[0]}
                    </div>
                    <span className="text-[11px] md:text-[12px] font-bold uppercase tracking-widest hidden xl:inline mt-0.5">Мій профіль</span>
                    <svg className={`w-3 h-3 transition-transform hidden xl:block ${isProfileMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </button>

                  {isProfileMenuOpen && (
                    <div className="absolute right-0 mt-3 w-56 bg-white border border-gray-200 rounded-2xl shadow-xl py-2 z-50">
                      <div className="px-4 py-3 border-b border-gray-100 mb-2">
                        <p className="text-[13px] font-bold text-black truncate">{firstName || lastName ? `${firstName} ${lastName}` : 'Користувач'}</p>
                        <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                      </div>
                      <button 
                        onClick={() => { setIsProfileModalOpen(true); setIsProfileMenuOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-[12px] font-bold uppercase tracking-widest text-[#666] hover:text-[#0090ff] hover:bg-blue-50 transition-colors flex items-center gap-2"
                      >
                        Редагувати профіль
                      </button>
                      <button 
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-[12px] font-bold uppercase tracking-widest text-[#cc0000] hover:bg-red-50 transition-colors flex items-center gap-2"
                      >
                        Вийти
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/login" className="text-[#888] text-[10px] md:text-[12px] font-bold uppercase tracking-widest hover:text-black transition-colors flex items-center gap-1.5 md:gap-2">
                  <div className="w-6 h-6 md:w-8 md:h-8 border border-gray-200 rounded-full flex items-center justify-center">
                     <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <span className="hidden sm:inline">Login</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* МОДАЛЬНЕ ВІКНО РЕДАГУВАННЯ ПРОФІЛЮ */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-[14px] font-black uppercase tracking-widest text-black">Мій профіль</h2>
              <button onClick={() => setIsProfileModalOpen(false)} className="text-gray-400 hover:text-black text-2xl leading-none transition-colors">×</button>
            </div>
            
            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Email (не змінюється)</label>
                <input type="email" value={user?.email || ""} disabled className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-[13px] text-gray-500 cursor-not-allowed" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Ім'я</label>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Іван" className="w-full bg-white border border-gray-200 rounded-xl p-3 text-[13px] text-black focus:border-[#0090ff] outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Прізвище</label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Франко" className="w-full bg-white border border-gray-200 rounded-xl p-3 text-[13px] text-black focus:border-[#0090ff] outline-none transition-colors" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Телефон (необов'язково)</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+380..." className="w-full bg-white border border-gray-200 rounded-xl p-3 text-[13px] text-black focus:border-[#0090ff] outline-none transition-colors" />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Роль у команді</label>
                <select value={specialty} onChange={e => setSpecialty(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl p-3 text-[13px] text-black focus:border-[#0090ff] outline-none transition-colors appearance-none">
                  <option value="" disabled>Оберіть...</option>
                  <option value="Вокаліст">Вокаліст</option>
                  <option value="Музикант">Музикант</option>
                  <option value="Лідер">Лідер</option>
                  <option value="Звукорежисер">Звукорежисер</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsProfileModalOpen(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold text-[11px] uppercase tracking-widest hover:bg-gray-50 transition-all">Скасувати</button>
                <button type="submit" disabled={savingProfile} className="flex-1 py-3 rounded-xl bg-[#0090ff] text-white font-bold text-[11px] uppercase tracking-widest hover:bg-[#007cdb] transition-all disabled:opacity-50">
                  {savingProfile ? 'Збереження...' : 'Зберегти'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}