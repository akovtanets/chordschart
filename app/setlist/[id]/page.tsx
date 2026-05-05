"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import SongView from "@/components/SongView";

export default function SetlistPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const setlistId = unwrappedParams.id;

  const [songs, setSongs] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSetlistAndSongs = async () => {
      setLoading(true);
      
      const { data: setlist } = await supabase
        .from("setlists")
        .select("song_ids")
        .eq("id", setlistId)
        .single();

      if (setlist?.song_ids && setlist.song_ids.length > 0) {
        // Выбираем все колонки (*), чтобы точно захватить youtube_url
        const { data: songsData } = await supabase
          .from("songs")
          .select("*")
          .in("id", setlist.song_ids);

        if (songsData) {
          const sortedSongs = setlist.song_ids.map((id: any) => 
            songsData.find((s) => s.id === Number(id))
          ).filter(Boolean);

          setSongs(sortedSongs);
        }
      }
      setLoading(false);
    };

    fetchSetlistAndSongs();
  }, [setlistId]);

  const goToNext = () => setCurrentIndex((prev) => (prev < songs.length - 1 ? prev + 1 : prev));
  const goToPrev = () => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") goToNext();
      if (event.key === "ArrowLeft") goToPrev();
      
      const num = parseInt(event.key);
      if (!isNaN(num) && num >= 1 && num <= 9) {
        const targetIndex = num - 1;
        if (targetIndex < songs.length) setCurrentIndex(targetIndex);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [songs, currentIndex]);

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-black text-gray-500">Завантаження...</div>;
  if (songs.length === 0) return <div className="flex items-center justify-center min-h-screen bg-black text-white">Сетліст порожній</div>;

  const currentSong = songs[currentIndex];

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden">
      {/* Навигация */}
      <div className="flex justify-between items-center p-4 bg-[#111] border-b border-gray-800 text-white shadow-lg">
        <button onClick={goToPrev} disabled={currentIndex === 0} className={`px-4 py-2 rounded-xl transition ${currentIndex === 0 ? 'opacity-20' : 'hover:bg-gray-800 text-blue-400'}`}>
          ← Назад
        </button>
        
        <div className="text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Пісня</p>
          <p className="font-mono text-lg font-bold">{currentIndex + 1} / {songs.length}</p>
        </div>

        <button onClick={goToNext} disabled={currentIndex === songs.length - 1} className={`px-4 py-2 rounded-xl transition ${currentIndex === songs.length - 1 ? 'opacity-20' : 'hover:bg-gray-800 text-blue-400'}`}>
          Далі →
        </button>
      </div>

      {/* Отображение песни */}
      <div className="flex-1 overflow-hidden relative">
        <SongView 
          key={`${setlistId}-${currentSong.id}`} 
          songId={currentSong.id} 
          initialContent={currentSong.content || ""} 
          setlistId={Number(setlistId)}
          youtubeUrl={currentSong.youtube_url} // ПЕРЕДАЕМ ССЫЛКУ
        />
      </div>
    </div>
  );
}