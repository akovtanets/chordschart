"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const ITEMS_PER_PAGE = 15; // Кількість пісень на одній сторінці

export default function SongsPage() {
  const [songs, setSongs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Додаємо стейт для користувача та пагінації
  const [user, setUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };

    const fetchSongs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("songs")
        .select("*")
        .order("title", { ascending: true });

      if (!error && data) {
        setSongs(data);
      }
      setLoading(false);
    };

    getUser();
    fetchSongs();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Скидаємо пагінацію на 1 сторінку при новому пошуку
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Логіка пошуку
  const filteredSongs = songs.filter((song) =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (song.author && song.author.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Логіка пагінації
  const totalPages = Math.ceil(filteredSongs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentSongs = filteredSongs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">
        {/* Заголовок і пошук */}
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

          {user && (
            <Link 
              href="/add-song" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-bold transition-all text-center"
            >
              + Додати
            </Link>
          )}
        </div>

        {loading ? (
          <div className="text-center text-gray-500 mt-10 font-mono text-sm uppercase tracking-widest">
            Завантаження каталогу...
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="grid gap-2">
              {/* Рендеримо ТІЛЬКИ currentSongs, а не всі filteredSongs */}
              {currentSongs.map((song) => (
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
                    {song.category && (
                      <span className="hidden sm:block text-[10px] uppercase tracking-widest text-gray-600 bg-gray-900 px-2 py-1 rounded">
                        {song.category}
                      </span>
                    )}

                    {/* ОБКЛАДИНКА АЛЬБОМУ */}
                    <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-900 border border-gray-800 flex items-center justify-center">
                      {song.cover_url ? (
                        <img 
                          src={song.cover_url} 
                          alt={`Обкладинка ${song.title}`} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                      )}
                    </div>

                    {user && (
                      <Link 
                        href={`/edit-song/${song.id}`}
                        className="p-2 text-gray-600 hover:text-white transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
              
              {filteredSongs.length === 0 && (
                <div className="text-center text-gray-600 py-20 border-2 border-dashed border-gray-900 rounded-2xl">
                  Пісень не знайдено
                </div>
              )}
            </div>

            {/* Блок пагінації */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8 mb-4">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-[#111] border border-gray-800 text-gray-400 rounded-lg hover:border-gray-600 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold uppercase tracking-widest"
                >
                  ← Назад
                </button>
                
                <span className="text-xs text-gray-500 font-mono tracking-widest uppercase">
                  {currentPage} / {totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-[#111] border border-gray-800 text-gray-400 rounded-lg hover:border-gray-600 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold uppercase tracking-widest"
                >
                  Вперед →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}