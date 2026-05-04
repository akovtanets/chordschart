"use client";

import { useEffect, useState, Suspense } from "react"; // Добавили Suspense
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import styles from "./Songs.module.css";

// 1. Выносим логику списка в отдельный внутренний компонент
function SongsList() {
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
      if (data) setSongs(data);
      setLoading(false);
    };
    fetchSongs();
  }, [query]);

  if (loading) return <div className={styles.loading}>Завантаження...</div>;

  return (
    <div className={styles.grid}>
      {songs.map((song) => (
        <Link href={`/song/${song.id}`} key={song.id} className={styles.card}>
          <h3>{song.title}</h3>
          <p>{song.author}</p>
        </Link>
      ))}
    </div>
  );
}

// 2. Основной компонент страницы просто оборачивает список в Suspense
export default function SongsPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Всі пісні</h1>
      
      {/* 
        Это критически важная обертка для Vercel. 
        Она говорит: "Если данные еще не готовы, покажи этот fallback" 
      */}
      <Suspense fallback={<div>Завантаження пошуку...</div>}>
        <SongsList />
      </Suspense>
    </div>
  );
}