"use client";

import { useEffect, useState, use, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import SongView from "@/components/SongView";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function LiveModePage({ params }: PageProps) {
  const unwrappedParams = use(params);
  const setlistId = unwrappedParams.id;

  const [songs, setSongs] = useState<any[]>([]);
  const [setlistTitle, setSetlistTitle] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Отримання даних (Пріоритет на Кеш для швидкості)
  const fetchLiveSetlist = useCallback(async () => {
    try {
      // 1. Спочатку пробуємо миттєво дістати з кешу (щоб не чекати на мережу)
      const cached = localStorage.getItem(`offline_setlist_${setlistId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setSetlistTitle(parsed.title);
        setSongs(parsed.songs || []);
        setLoading(false);
      }

      // 2. Паралельно фоном оновлюємо з Supabase, якщо є інтернет
      const { data: setlist } = await supabase.from("setlists").select("*").eq("id", setlistId).single();
      if (setlist && setlist.song_ids?.length > 0) {
        const { data: songsData } = await supabase.from("songs").select("*").in("id", setlist.song_ids);
        if (songsData) {
          const sorted = setlist.song_ids.map((id: number) => songsData.find((s: any) => s.id === Number(id))).filter(Boolean);
          setSongs(sorted);
          setSetlistTitle(setlist.title);
          // Оновлюємо кеш
          localStorage.setItem(`offline_setlist_${setlistId}`, JSON.stringify({
            title: setlist.title,
            songs: sorted
          }));
        }
      }
    } catch (err) {
      console.warn("Працюємо в автономному режимі (Offline).");
    } finally {
      setLoading(false);
    }
  }, [setlistId]);

  useEffect(() => { fetchLiveSetlist(); }, [fetchLiveSetlist]);

  // Заборона вимикання екрану (Wake Lock API) - критично для виступів
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        console.warn("Wake Lock помилка:", err);
      }
    };
    
    requestWakeLock();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") requestWakeLock();
    });

    return () => { if (wakeLock) wakeLock.release(); };
  }, []);

  const goToNext = useCallback(() => setCurrentIndex((p) => (p < songs.length - 1 ? p + 1 : p)), [songs.length]);
  const goToPrev = useCallback(() => setCurrentIndex((p) => (p > 0 ? p - 1 : p)), []);

  // Клавіатура (для педалей перемикання сторінок)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); goToNext(); }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); goToPrev(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrev]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-black text-gray-500 uppercase tracking-widest text-xs">Готуємо сетлист...</div>;

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden select-none">
      
      {/* МІНІМАЛІСТИЧНИЙ ХЕДЕР */}
      <div className="flex justify-between items-center p-4 bg-[#0a0a0a] border-b border-gray-900 z-50">
        <Link 
          href={`/setlist/${setlistId}`} 
          className="flex items-center justify-center w-10 h-10 bg-gray-900 rounded-full text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </Link>
        
        <div className="text-center">
          <h1 className="text-xs font-black uppercase tracking-widest text-gray-400">{setlistTitle}</h1>
          <p className="text-[10px] text-blue-500 font-mono mt-1">Пісня {currentIndex + 1} з {songs.length}</p>
        </div>

        <div className="w-10"></div> {/* Пустий блок для балансу флексбоксу */}
      </div>

      {/* ЗОНА АКОРДІВ (Зі скролом, якщо пісня довга) */}
      <div className="flex-1 overflow-y-auto bg-black relative pb-24">
        {songs[currentIndex] && (
          <SongView
            songId={songs[currentIndex].id}
            initialContent={songs[currentIndex].content || ""}
            theme="dark"
            fontSizeLevel={1}
            capo={0}
            semitones={0}
            displayMode="chords"
            songData={songs[currentIndex]} // <--- КРИТИЧНО ДЛЯ ОФЛАЙНА (не делает запрос к БД)
            onNextSong={goToNext}          // <--- ДЛЯ ГОРИЗОНТАЛЬНЫХ СВАЙПОВ
            onPrevSong={goToPrev}          // <--- ДЛЯ ГОРИЗОНТАЛЬНЫХ СВАЙПОВ
            isLiveMode={true}
            />
        )}
      </div>

      {/* ВЕЛИЧЕЗНІ КНОПКИ НАВІГАЦІЇ ДЛЯ ПЛАНШЕТА */}
      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black via-black to-transparent flex items-end justify-between p-4 z-50">
        <button 
          onClick={goToPrev} 
          disabled={currentIndex === 0}
          className="w-[45%] h-16 bg-[#111] border border-gray-800 rounded-2xl flex items-center justify-center gap-2 active:bg-gray-800 disabled:opacity-20 transition-all"
        >
          <span className="text-2xl text-blue-500">←</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Попередня</span>
        </button>

        <button 
          onClick={goToNext} 
          disabled={currentIndex === songs.length - 1}
          className="w-[45%] h-16 bg-blue-600 rounded-2xl flex items-center justify-center gap-2 active:bg-blue-700 disabled:opacity-20 transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)]"
        >
          <span className="text-[10px] font-black uppercase tracking-widest text-white">Наступна</span>
          <span className="text-2xl text-white">→</span>
        </button>
      </div>

    </div>
  );
}