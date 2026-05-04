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
  const router = useRouter();

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
        </nav>
      </div>
    </header>
  );
}