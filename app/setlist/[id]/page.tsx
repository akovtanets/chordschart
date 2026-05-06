"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import SongView from "@/components/SongView";
import Metronome from "@/components/Metronome";

export default function SetlistPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const setlistId = unwrappedParams.id;

  const [songs, setSongs] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // 1. Завантаження даних сетліста та пісень
  const fetchSetlistAndSongs = async () => {
    const { data: setlist } = await supabase
      .from("setlists")
      .select("song_ids")
      .eq("id", setlistId)
      .single();

    if (setlist?.song_ids) {
      const { data: songsData } = await supabase
        .from("songs")
        .select("*")
        .in("id", setlist.song_ids);

      if (songsData) {
        // Зберігаємо порядок пісень згідно з масивом song_ids
        const sortedSongs = setlist.song_ids
          .map((id: any) => songsData.find((s) => s.id === Number(id)))
          .filter(Boolean);
        setSongs(sortedSongs);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSetlistAndSongs();
  }, [setlistId]);

  // 2. Пошук пісень для додавання у сетліст
  useEffect(() => {
    const searchSongs = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      const { data } = await supabase
        .from("songs")
        .select("id, title, author")
        .ilike("title", `%${searchQuery}%`)
        .limit(5);
      setSearchResults(data || []);
    };
    const timer = setTimeout(searchSongs, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 3. Оновлення бази даних
  const updateDatabase = async (newSongs: any[]) => {
    const newIds = newSongs.map(s => s.id);
    await supabase.from("setlists").update({ song_ids: newIds }).eq("id", setlistId);
    setSongs(newSongs);
  };

  const addSong = async (songToAdd: any) => {
    if (songs.find(s => s.id === songToAdd.id)) return;
    const { data: fullSong } = await supabase.from("songs").select("*").eq("id", songToAdd.id).single();
    if (fullSong) {
      await updateDatabase([...songs, fullSong]);
      setSearchQuery("");
    }
  };

  const removeSong = async (id: number) => {
    const newSongs = songs.filter(s => s.id !== id);
    if (currentIndex >= newSongs.length) setCurrentIndex(Math.max(0, newSongs.length - 1));
    await updateDatabase(newSongs);
  };

  const moveSong = async (index: number, direction: 'up' | 'down') => {
    const newSongs = [...songs];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSongs.length) return;
    [newSongs[index], newSongs[targetIndex]] = [newSongs[targetIndex], newSongs[index]];
    await updateDatabase(newSongs);
    if (index === currentIndex) setCurrentIndex(targetIndex);
  };

  const goToNext = () => setCurrentIndex((prev) => (prev < songs.length - 1 ? prev + 1 : prev));
  const goToPrev = () => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditing) return; // Вимикаємо гарячі клавіші в режимі редагування
      if (event.key === "ArrowRight") goToNext();
      if (event.key === "ArrowLeft") goToPrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [songs, currentIndex, isEditing]);

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-black text-gray-500 font-mono">LOADING SETLIST...</div>;

  const currentSong = songs[currentIndex];

  return (
    <div className="flex h-screen bg-black overflow-hidden text-white">
      
      {/* ОСНОВНА ЧАСТИНА: ПЕРЕГЛЯД ТА НАВІГАЦІЯ */}
      <div className={`flex flex-col flex-1 transition-all duration-500 ease-in-out ${isEditing ? 'mr-[350px]' : ''}`}>
        
        {/* HEADER ПАНЕЛЬ */}
        <div className="flex justify-between items-center p-4 bg-[#0d0d0d] border-b border-gray-800 shadow-2xl z-10">
          <div className="flex gap-4 items-center">
            <div className="flex items-center bg-black rounded-xl border border-gray-800 p-1">
                <button onClick={goToPrev} disabled={currentIndex === 0} className={`p-2 px-3 rounded-lg transition ${currentIndex === 0 ? 'opacity-10' : 'hover:bg-gray-800 text-blue-400'}`}>←</button>
                <div className="px-4 text-center border-x border-gray-800">
                    <p className="font-mono text-xs font-bold text-gray-400">{currentIndex + 1} / {songs.length}</p>
                </div>
                <button onClick={goToNext} disabled={currentIndex === songs.length - 1} className={`p-2 px-3 rounded-lg transition ${currentIndex === songs.length - 1 ? 'opacity-10' : 'hover:bg-gray-800 text-blue-400'}`}>→</button>
            </div>

            {/* МЕТРОНОМ: Автоматично бере BPM поточної пісні */}
            {currentSong?.bpm && (
              <div className="ml-2 hidden sm:block">
                <Metronome bpm={parseInt(currentSong.bpm)} />
              </div>
            )}
          </div>

          <div className="flex flex-col items-center">
            <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-500 mb-0.5">Current Song</h2>
            <p className="text-sm font-bold text-white truncate max-w-[150px] md:max-w-[300px]">
                {currentSong?.title || "No songs selected"}
            </p>
          </div>

          {/* Кнопка редагування */}
        <button 
          onClick={() => setIsEditing(!isEditing)} 
          className={`px-10 py-4 rounded-full text-xs font-black transition-all active:scale-95 ${
            isEditing 
            ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' 
            : 'bg-white text-black hover:bg-gray-200'
          }`}
        >
          {isEditing ? 'ГОТОВО' : 'РЕДАГУВАТИ СЕТЛІСТ'}
        </button>
        </div>

        {/* SONG VIEW */}
        <div className="flex-1 relative overflow-hidden">
          {currentSong ? (
            <SongView 
              key={`${setlistId}-${currentSong.id}`} 
              songId={currentSong.id} 
              initialContent={currentSong.content || ""} 
              setlistId={Number(setlistId)}
              youtubeUrl={currentSong.youtube_url}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-700 space-y-4">
               <span className="text-4xl">🗒️</span>
               <p className="italic font-mono text-sm">Setlist is empty. Add songs in editor.</p>
            </div>
          )}
        </div>
      </div>

      {/* ПРАВА ПАНЕЛЬ РЕДАГУВАННЯ */}
      <div className={`fixed right-0 top-0 h-full w-[350px] bg-[#080808] border-l border-gray-800 transition-transform duration-500 ease-in-out z-20 p-6 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.5)] ${isEditing ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="mb-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 mb-4">Add to Setlist</h3>
            <div className="relative">
                <input 
                    type="text" 
                    placeholder="Search song title..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#111] border border-gray-800 rounded-2xl p-4 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-700"
                />
                {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 w-full bg-[#151515] border border-gray-800 rounded-2xl mt-2 shadow-2xl overflow-hidden z-30">
                    {searchResults.map(s => (
                        <button key={s.id} onClick={() => addSong(s)} className="w-full text-left p-4 hover:bg-blue-600 transition-colors border-b border-gray-900 last:border-none">
                            <p className="text-[13px] font-bold">{s.title}</p>
                            <p className="text-[10px] text-gray-500">{s.author}</p>
                        </button>
                    ))}
                    </div>
                )}
            </div>
        </div>

        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 mb-4">Reorder Songs</h3>
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
          {songs.map((s, index) => (
            <div key={s.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${index === currentIndex ? 'bg-blue-900/10 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-[#111] border-gray-900 hover:border-gray-700'}`}>
              <div className="flex flex-col items-center justify-center gap-2 border-r border-gray-800 pr-3">
                <button onClick={() => moveSong(index, 'up')} className="text-gray-600 hover:text-blue-400 transition-colors">▲</button>
                <button onClick={() => moveSong(index, 'down')} className="text-gray-600 hover:text-blue-400 transition-colors">▼</button>
              </div>
              
              <div className="flex-1 min-w-0" onClick={() => setCurrentIndex(index)}>
                <p className={`text-xs font-bold truncate cursor-pointer ${index === currentIndex ? 'text-blue-400' : 'text-gray-300'}`}>
                    {s.title}
                </p>
                <p className="text-[9px] text-gray-600 truncate uppercase tracking-wider">{s.author || 'Unknown'}</p>
              </div>

              <button onClick={() => removeSong(s.id)} className="w-8 h-8 flex items-center justify-center rounded-full bg-red-900/10 text-red-500/50 hover:bg-red-500 hover:text-white transition-all">
                <span className="text-lg leading-none">×</span>
              </button>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-900">
            <p className="text-[9px] text-center text-gray-700 uppercase tracking-widest font-bold">
                Changes are saved automatically
            </p>
        </div>
      </div>
    </div>
  );
}