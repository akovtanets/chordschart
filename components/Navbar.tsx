"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Состояние для пользователя
  const [user, setUser] = useState<any>(null);
  
  const router = useRouter();

  useEffect(() => {
    // 1. Проверка текущей сессии
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    getUser();

    // 2. Подписка на изменения авторизации
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      if (searchQuery.length > 1) {
        const { data } = await supabase
          .from("songs")
          .select("id, title, author")
          .or(`title.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%`)
          .limit(5);
        setResults(data || []);
        setIsDropdownOpen(true);
      } else {
        setResults([]);
        setIsDropdownOpen(false);
      }
    };
    const timer = setTimeout(fetchResults, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsDropdownOpen(false);
    if (!searchQuery.trim()) return;
    router.push(`/songs?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>CHORDS<span>CHART</span></Link>
        
        <div className={styles.searchContainer}>
          <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
            <input 
              className={styles.searchInput} 
              placeholder="Знайти пісню..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
            />
            <button type="submit" className={styles.searchButton}>Пошук</button>
          </form>
          {isDropdownOpen && results.length > 0 && (
            <div className={styles.dropdown}>
              {results.map(song => (
                <Link key={song.id} href={`/song/${song.id}`} className={styles.dropdownItem}>
                  <span className={styles.songTitle}>{song.title}</span>
                  <span className={styles.songAuthor}>{song.author}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <nav className={styles.nav}>
          <Link href="/songs" className={styles.navLink}>Пісні</Link>
          <Link href="/setlists" className={styles.navLink}>Списки</Link>
          
          {/* Блок авторизации */}
          <div className={styles.authBlock} style={{ marginLeft: '1rem', display: 'flex', alignItems: 'center', gap: '15px' }}>
            {user ? (
              <>
                <span className={styles.userEmail} style={{ fontSize: '12px', color: '#888' }}>
                  {user.email}
                </span>
                <button 
                  onClick={handleSignOut}
                  className={styles.navLink}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4d4d' }}
                >
                  Вийти
                </button>
              </>
            ) : (
              <Link href="/login" className={styles.navLink} style={{ color: '#3b82f6', fontWeight: 'bold' }}>
                Увійти
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}