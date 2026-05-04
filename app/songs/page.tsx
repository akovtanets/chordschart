"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import styles from "./Songs.module.css";

export const dynamic = "force-dynamic";

export default function SongsPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("search");
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSongs = async () => {
      setLoading(true);
      let request = supabase.from("songs").select("*");
      if (query) {
        request = request.or(`title.ilike.%${query}%,author.ilike.%${query}%`);
      }
      const { data } = await request;
      setSongs(data || []);
      setLoading(false);
    };
    fetchSongs();
  }, [query]);

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>
        {query ? `Результати пошуку` : "Усі пісні"}
      </h1>
      <p className={styles.subtitle}>
        {query ? `За запитом "${query}" знайдено ${songs.length}` : `У бібліотеці ${songs.length} пісень`}
      </p>

      <div className={styles.list}>
        {loading ? (
          <p style={{color: '#6b7280'}}>Завантаження...</p>
        ) : songs.length > 0 ? (
          songs.map((song) => (
            <Link key={song.id} href={`/song/${song.id}`} className={styles.card}>
              <div className={styles.songInfo}>
                <span className={styles.songTitle}>{song.title}</span>
                <span className={styles.songAuthor}>{song.author}</span>
              </div>
              <div className={styles.arrow}>→</div>
            </Link>
          ))
        ) : (
          <div className={styles.empty}>
            <p>На жаль, ми нічого не знайшли</p>
            <Link href="/songs" style={{color: '#3b82f6', textDecoration: 'none'}}>Скинути пошук</Link>
          </div>
        )}
      </div>
    </main>
  );
}