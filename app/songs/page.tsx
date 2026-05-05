"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import YouTubePlayer from "@/components/YouTubePlayer";

export default function SongsPage() {
  const [songs, setSongs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Загрузка всех песен из базы
  useEffect(() => {
    const fetchSongs = async () => {
      setLoading(true);
      // Обязательно выбираем youtube_url, чтобы плеер его увидел
      const { data, error } = await supabase
        .from("songs")
        .select("*")
        .order("title", { ascending: true });

      if (!error && data) {
        setSongs(data);
      }
      setLoading(false);
    };

    fetchSongs();
  }, []);

  // Логика поиска
  const filteredSongs = songs.filter((song) =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (song.author && song.author.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">
        {/* Заголовок и поиск */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-black uppercase tracking-tighter">Всі пісні</h1>
          
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Знайти пісню..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111] border border-gray-800 rounded-full py-2 px-10 focus:outline-none focus:border-blue-500 transition-all"
            />
            <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <Link 
            href="/add-song" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-bold transition-all text-center"
          >
            + Додати
          </Link>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 mt-10">Завантаження каталогу...</div>
        ) : (
          <div className="grid gap-2">
            {filteredSongs.map((song) => (
              <div 
                key={song.id} 
                className="group flex items-center justify-between p-4 bg-[#0a0a0a] border border-gray-900 hover:border-gray-700 rounded-xl transition-all"
              >
                <Link href={`/song/${song.id}`} className="flex-1">
                  <div className="flex flex-col">
                    <span className="text-lg font-bold group-hover:text-blue-400 transition-colors">
                      {song.title}
                    </span>
                    <span className="text-sm text-gray-500">
                      {song.author || "Автор не вказаний"}
                    </span>
                  </div>
                </Link>

                <div className="flex items-center gap-4">
                  {/* КАТЕГОРИЯ (если есть) */}
                  {song.category && (
                    <span className="hidden sm:block text-[10px] uppercase tracking-widest text-gray-600 bg-gray-900 px-2 py-1 rounded">
                      {song.category}
                    </span>
                  )}

                  {/* YOUTUBE ПЛЕЕР СПРАВА */}
                  {song.youtube_url && (
                    <div className="w-12 h-12 flex-shrink-0">
                      <YouTubePlayer url={song.youtube_url} />
                    </div>
                  )}

                  {/* КНОПКА РЕДАКТИРОВАНИЯ */}
                  <Link 
                    href={`/edit-song/${song.id}`}
                    className="p-2 text-gray-600 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
            
            {filteredSongs.length === 0 && (
              <div className="text-center text-gray-600 py-20 border-2 border-dashed border-gray-900 rounded-2xl">
                Пісень не знайдено
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}