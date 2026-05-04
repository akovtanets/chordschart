"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import SongView from "@/components/SongView";

export default function SetlistPerformancePage() {
  const params = useParams();
  const router = useRouter();
  
  const [setlist, setSetlist] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Вычисляем общее количество песен заранее для чистоты логики
  const totalSongs = setlist?.song_ids?.length || 0;

  // --- Навигация (Исправленная логика без рассинхрона) ---
  
  const nextSong = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev < totalSongs - 1) {
        return prev + 1;
      }
      return prev;
    });
  }, [totalSongs]);

  const prevSong = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev > 0) {
        return prev - 1;
      }
      return prev;
    });
  }, []);

  // --- Загрузка данных сет-листа ---

  useEffect(() => {
    async function fetchSetlist() {
      const { data, error } = await supabase
        .from("setlists")
        .select("*")
        .eq("id", params.id)
        .single();

      if (data) {
        setSetlist(data);
      }
      setLoading(false);
    }
    if (params.id) fetchSetlist();
  }, [params.id]);

  // --- MIDI и Клавиатура ---

  useEffect(() => {
    // 1. Клавиатура
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        nextSong();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevSong();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    // 2. MIDI
    let midiAccessInstance: any = null;

    const onMIDIMessage = (message: any) => {
      const [status, data1] = message.data;
      // 144 = Note On, 176 = Control Change
      if (status === 144 || status === 176) {
        if (data1 === 60 || data1 === 22) nextSong();
        if (data1 === 62 || data1 === 23) prevSong();
      }
    };

    if (typeof window !== "undefined" && navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess().then((access) => {
        midiAccessInstance = access;
        for (const input of access.inputs.values()) {
          input.onmidimessage = onMIDIMessage;
        }
      }).catch(() => console.warn("MIDI access denied"));
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (midiAccessInstance) {
        for (const input of midiAccessInstance.inputs.values()) {
          input.onmidimessage = null;
        }
      }
    };
  }, [nextSong, prevSong]);

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-gray-500 font-medium">
      Завантаження сет-листа...
    </div>
  );

  if (!setlist) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-red-500">
      Сет-лист не знайдено
    </div>
  );

  const currentSongId = setlist.song_ids[currentIndex];

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      {/* Шапка (Header) */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-b border-gray-800 px-6 py-4 flex justify-between items-center">
        <button 
          onClick={() => router.push('/setlists')} 
          className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
        >
          ✕ Закрити
        </button>
        
        <div className="text-center">
          <h2 className="text-xs font-black text-blue-500 uppercase tracking-[0.2em] mb-0.5">
            {setlist.title}
          </h2>
          <p className="text-[10px] font-mono text-gray-500">
            {currentIndex + 1} / {totalSongs}
          </p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={prevSong} 
            disabled={currentIndex === 0} 
            className="p-2 disabled:opacity-5 text-blue-400 hover:bg-blue-500/10 rounded-full transition-all"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <button 
            onClick={nextSong} 
            disabled={currentIndex >= totalSongs - 1} 
            className="p-2 disabled:opacity-5 text-blue-400 hover:bg-blue-500/10 rounded-full transition-all"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      </div>

      {/* Основной контент */}
      <div className="pt-24 pb-32">
        {/* Ключ key={currentSongId} критически важен — он сбрасывает состояние SongView (скролл, транспозицию) при смене песни */}
        <SongView songId={currentSongId} key={currentSongId} />
      </div>

      {/* Индикаторы прогресса в стиле Stories */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black to-transparent pointer-events-none">
        <div className="max-w-xl mx-auto flex gap-1.5 pointer-events-auto">
          {setlist.song_ids.map((_: any, idx: number) => (
            <div 
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1 flex-1 rounded-full cursor-pointer transition-all duration-300 ${
                idx === currentIndex ? "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)]" : "bg-gray-800 hover:bg-gray-700"
              }`}
            />
          ))}
        </div>
      </div>
    </main>
  );
}