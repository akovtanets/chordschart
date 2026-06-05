"use client";

import { useEffect, useState, use, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import SongView from "@/components/SongView";
import Metronome from "@/components/Metronome";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface Song {
  id: number;
  title: string;
  author?: string;
  content?: string;
  bpm?: number;
  youtube_url?: string;
  default_key?: string;
  length?: string;
}

export default function SetlistPage({ params }: PageProps) {
  const unwrappedParams = use(params);
  const setlistId = unwrappedParams.id;

  const [songs, setSongs] = useState<Song[]>([]);
  const [setlistTitle, setSetlistTitle] = useState<string>(""); 
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  const [userId, setUserId] = useState<string | null>(null);
  const [semitones, setSemitones] = useState(0);
  const [capo, setCapo] = useState(0);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [fontSizeLevel] = useState(0);
  
  const [layoutMode, setLayoutMode] = useState<'single' | 'two-column'>('single');
  
  const [isTeamShared, setIsTeamShared] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);

  const fetchSetlistAndSongs = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || null;
      setUserId(currentUserId);

      const { data: teamMembership } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", currentUserId)
        .or('role.ilike.admin,role.ilike.leader')
        .maybeSingle();
      
      if (teamMembership) setUserTeamId(teamMembership.team_id);

      const { data: setlist } = await supabase.from("setlists").select("*").eq("id", setlistId).single();

      if (setlist) {
        setSetlistTitle(setlist.title || "Без назви");
        setIsTeamShared(setlist.is_team_shared || false);
        setIsOwner(setlist.user_id === currentUserId);
        if (setlist.song_ids?.length > 0) {
          const { data: songsData } = await supabase.from("songs").select("*").in("id", setlist.song_ids);
          if (songsData) {
            const sorted = setlist.song_ids.map((id: number) => songsData.find((s: Song) => s.id === Number(id))).filter(Boolean);
            setSongs(sorted);
          }
        }
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [setlistId]);

  useEffect(() => { fetchSetlistAndSongs(); }, [fetchSetlistAndSongs]);

  useEffect(() => {
    const fetchSearchResults = async () => {
      const trimmedQuery = searchQuery.trim();
      if (trimmedQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      const { data } = await supabase.from("songs").select("id, title, author").ilike("title", `${trimmedQuery}%`).limit(5);
      if (data) setSearchResults(data);
    };
    const timer = setTimeout(fetchSearchResults, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const saveSemitones = useCallback(async (offset: number) => {
    setSemitones(offset);
    if (!userId || !songs[currentIndex]) return;
    await supabase.from("user_song_settings").upsert({ 
      user_id: userId, setlist_id: Number(setlistId), song_id: songs[currentIndex].id, transposition_offset: offset 
    }, { onConflict: "user_id,setlist_id,song_id" });
  }, [userId, setlistId, songs, currentIndex]);

  // ВОТ ОН - ТВОЙ ВЕРНУВШИЙСЯ БЛОК!
  useEffect(() => {
    const handleUpdateFromView = (e: any) => saveSemitones(e.detail);
    window.addEventListener('update-song-semitones', handleUpdateFromView);
    return () => window.removeEventListener('update-song-semitones', handleUpdateFromView);
  }, [saveSemitones]);

  const goToNext = useCallback(() => setCurrentIndex((p) => (p < songs.length - 1 ? p + 1 : p)), [songs.length]);
  const goToPrev = useCallback(() => setCurrentIndex((p) => (p > 0 ? p - 1 : p)), []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      // ВЛЕВО/ВПРАВО ВСЕГДА переключают песни
      if (event.key === "ArrowRight") { event.preventDefault(); goToNext(); }
      if (event.key === "ArrowLeft") { event.preventDefault(); goToPrev(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrev]); 

  useEffect(() => {
    const loadSongSettings = async () => {
      if (!userId || !songs[currentIndex]) return;
      const { data } = await supabase.from("user_song_settings").select("transposition_offset").eq("user_id", userId).eq("setlist_id", setlistId).eq("song_id", songs[currentIndex].id).maybeSingle();
      setSemitones(data?.transposition_offset || 0);
    };
    loadSongSettings();
  }, [currentIndex, userId, setlistId, songs]);

  const updateDatabase = async (newSongs: Song[]) => {
    if (!isOwner) return;
    const newIds = newSongs.map(s => s.id);
    await supabase.from("setlists").update({ song_ids: newIds }).eq("id", setlistId);
    setSongs(newSongs);
  };

  const addSong = async (songToAdd: any) => {
    if (!isOwner || songs.find(s => s.id === songToAdd.id)) return;
    const { data: fullSong } = await supabase.from("songs").select("*").eq("id", songToAdd.id).single();
    if (fullSong) {
      await updateDatabase([...songs, fullSong]);
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  const removeSong = async (id: number) => {
    if (!isOwner) return;
    const newSongs = songs.filter(s => s.id !== id);
    if (currentIndex >= newSongs.length) setCurrentIndex(Math.max(0, newSongs.length - 1));
    await updateDatabase(newSongs);
  };

  const moveSong = async (index: number, direction: 'up' | 'down') => {
    if (!isOwner) return;
    const newSongs = [...songs];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSongs.length) return;
    [newSongs[index], newSongs[targetIndex]] = [newSongs[targetIndex], newSongs[index]];
    await updateDatabase(newSongs);
    if (currentIndex === index) setCurrentIndex(targetIndex);
    else if (currentIndex === targetIndex) setCurrentIndex(index);
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-black text-gray-400 font-mono text-[10px] uppercase">Завантаження...</div>;

  return (
    <div className={`transition-colors duration-500 ${theme === 'dark' ? 'bg-black text-white' : 'bg-gray-100 text-black'} ${layoutMode === 'two-column' ? 'md:h-screen md:overflow-hidden md:flex md:flex-col' : 'min-h-screen'}`}>
      <div className={`transition-all duration-500 ${isEditing ? 'md:mr-[350px]' : ''} ${layoutMode === 'two-column' ? 'md:flex md:flex-col md:flex-grow md:min-h-0' : ''}`}>
        
        {/* Идеальный sticky без конфликтующего relative */}
        <div className={`sticky top-0 w-full flex justify-between items-center p-4 z-[100] print:hidden border-b ${theme === 'dark' ? 'bg-[#0d0d0d] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} ${layoutMode === 'two-column' ? 'md:flex-shrink-0' : ''}`}>
          <div className="flex gap-4 items-center">
            <Link href="/setlists" className={`p-2 rounded-lg border transition-colors ${theme === 'dark' ? 'bg-black border-gray-800 text-gray-400 hover:text-blue-500' : 'bg-white border-gray-200 text-gray-600'}`}>←</Link>
            <div className={`flex items-center rounded-lg border p-1 ${theme === 'dark' ? 'bg-black border-gray-800' : 'bg-white border-gray-200'}`}>
              <button onClick={goToPrev} disabled={currentIndex === 0} className="px-3 py-1 text-blue-500 disabled:opacity-20">←</button>
              <div className={`px-4 border-x font-mono text-[10px] ${theme === 'dark' ? 'border-gray-800 text-gray-500' : 'border-gray-200 text-gray-500'}`}>{currentIndex + 1} / {songs.length}</div>
              <button onClick={goToNext} disabled={currentIndex === songs.length - 1} className="px-3 py-1 text-blue-500 disabled:opacity-20">→</button>
            </div>
          </div>
          
          <div className="absolute left-1/2 -translate-x-1/2 hidden md:block max-w-[40%] pointer-events-none">
            <h2 className={`text-[10px] font-black uppercase tracking-[0.4em] truncate text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              {setlistTitle}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {songs[currentIndex] && <Metronome bpm={songs[currentIndex].bpm || 120} />}
            
            <div className="relative">
              <button 
                onClick={() => setShowSettings(!showSettings)} 
                className={`w-10 h-10 flex items-center justify-center rounded-full border transition-all ${showSettings ? 'bg-blue-600 rotate-90 border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.4)] text-white' : (theme === 'dark' ? 'border-gray-800 bg-[#111] text-white' : 'border-gray-200 bg-white shadow-sm text-black')}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {showSettings && (
                <div className={`absolute right-0 top-12 w-72 border rounded-[32px] p-6 shadow-2xl z-[150] ${theme === 'dark' ? 'bg-[#0d0d0d] border-gray-800 shadow-black' : 'bg-white border-gray-200'}`}>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-6 text-center italic">Налаштування</h4>
                  <div className="space-y-6">
                    <div>
                      <p className="text-[9px] text-gray-500 uppercase font-black mb-3 tracking-widest text-center">ТЕМА</p>
                      <div className={`flex p-1 rounded-xl border ${theme === 'dark' ? 'bg-black border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                        <button onClick={() => setTheme('dark')} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${theme === 'dark' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>ТЕМНА</button>
                        <button onClick={() => setTheme('light')} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${theme === 'light' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>СВІТЛА</button>
                      </div>
                    </div>
                    
                    <div className="hidden md:block">
                      <p className="text-[9px] text-gray-500 uppercase font-black mb-3 tracking-widest text-center">ВИГЛЯД (DESKTOP)</p>
                      <div className={`flex p-1 rounded-xl border ${theme === 'dark' ? 'bg-black border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                        <button onClick={() => setLayoutMode('single')} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${layoutMode === 'single' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>1 СТОВПЕЦЬ</button>
                        <button onClick={() => setLayoutMode('two-column')} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${layoutMode === 'two-column' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>2 СТОВПЦІ</button>
                      </div>
                    </div>

                    <div>
                      <p className="text-[9px] text-gray-500 uppercase font-black mb-3 tracking-widest text-center">ТРАНСПОНУВАТИ</p>
                      <div className={`flex items-center justify-between px-4 py-2 rounded-xl border ${theme === 'dark' ? 'bg-black border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                        <button onClick={() => saveSemitones(semitones - 1)} className="text-2xl font-bold text-blue-500 hover:scale-110 transition-transform">−</button>
                        <span className="font-bold font-mono text-xl text-blue-400">{semitones > 0 ? `+${semitones}` : semitones}</span>
                        <button onClick={() => saveSemitones(semitones + 1)} className="text-2xl font-bold text-blue-500 hover:scale-110 transition-transform">+</button>
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] text-gray-500 uppercase font-black mb-3 tracking-widest text-center">КАПОДАСТР</p>
                      <div className="grid grid-cols-5 gap-2">
                        {[0, 1, 4, 6, 9].map((val) => (
                          <button key={val} onClick={() => setCapo(val)} className={`h-10 rounded-xl border transition-all ${capo === val ? 'bg-blue-600 border-blue-400 text-white' : (theme === 'dark' ? 'bg-[#151515] border-gray-800 text-gray-400' : 'bg-white border-gray-200 text-gray-600')}`}>
                            <span className="text-[11px] font-black">{val === 0 ? 'Ø' : val}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    {isOwner && userTeamId && (
                      <button onClick={() => setIsTeamShared(!isTeamShared)} className={`w-full py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${isTeamShared ? 'border-blue-600 bg-blue-600/10 text-blue-400' : (theme === 'dark' ? 'border-gray-800 bg-black text-gray-500' : 'border-gray-200 bg-white text-gray-400')}`}>
                        <div className={`w-3 h-3 rounded-full ${isTeamShared ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-gray-700'}`}></div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Для команди</span>
                      </button>
                    )}
                    <button onClick={() => { setShowSettings(false); setTimeout(() => window.print(), 100); }} className="w-full py-3 rounded-xl bg-blue-600 text-white font-black text-[9px] uppercase tracking-widest">Експорт PDF</button>
                  </div>
                </div>
              )}
            </div>

            {isOwner && (
              <button onClick={() => setIsEditing(!isEditing)} className={`px-6 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white'}`}>
                {isEditing ? 'ГОТОВО' : 'РЕДАГУВАТИ'}
              </button>
            )}
          </div>
        </div>

        <div className={`w-full ${layoutMode === 'two-column' ? 'md:flex-grow md:min-h-0 md:flex md:flex-col' : ''}`}>
          {songs[currentIndex] && (
            <SongView 
              key={songs[currentIndex].id} 
              songId={songs[currentIndex].id} 
              initialContent={songs[currentIndex].content || ""} 
              youtubeUrl={songs[currentIndex].youtube_url}
              theme={theme} fontSizeLevel={fontSizeLevel} capo={capo} semitones={semitones} 
              layoutMode={layoutMode} 
            />
          )}
        </div>
      </div>

      <div className={`fixed right-0 top-0 h-full w-[350px] border-l transition-transform duration-500 z-[100] p-6 flex flex-col print:hidden ${theme === 'dark' ? 'bg-[#080808] border-gray-800' : 'bg-white border-gray-200'} ${isEditing && isOwner ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 font-mono">Редагування</h3>
            <button onClick={() => setIsEditing(false)} className="md:hidden text-gray-500 p-2 text-xl">×</button>
        </div>
        <div className="mb-6 relative">
            <input type="text" placeholder="Пошук пісні..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`w-full border rounded-xl p-4 text-xs outline-none focus:border-blue-500 ${theme === 'dark' ? 'bg-[#111] border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-black'}`} />
            {searchResults.length > 0 && (
                <div className={`absolute top-full left-0 w-full border rounded-xl mt-2 shadow-2xl overflow-hidden z-[110] ${theme === 'dark' ? 'bg-[#151515] border-gray-800' : 'bg-white border-gray-200'}`}>
                {searchResults.map(s => (
                    <button key={s.id} onClick={() => addSong(s)} className={`w-full text-left p-4 hover:bg-blue-600 hover:text-white transition-colors border-b last:border-none ${theme === 'dark' ? 'border-gray-900' : 'border-gray-100'}`}>
                        <p className={`text-[13px] font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{s.title}</p>
                        <p className="text-[10px] text-gray-500">{s.author}</p>
                    </button>
                ))}
                </div>
            )}
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {songs.map((s, index) => (
            <div key={s.id} className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${index === currentIndex ? (theme === 'dark' ? 'bg-blue-900/20 border-blue-500/50' : 'bg-blue-50 border-blue-300') : (theme === 'dark' ? 'bg-[#111] border-gray-900' : 'bg-gray-50 border-gray-200')}`}>
              <div className="flex flex-col items-center">
                <button onClick={() => moveSong(index, 'up')} disabled={index === 0} className="p-1 text-gray-500 hover:text-blue-500 disabled:opacity-20">▲</button>
                <button onClick={() => moveSong(index, 'down')} disabled={index === songs.length - 1} className="p-1 text-gray-500 hover:text-blue-500 disabled:opacity-20">▼</button>
              </div>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setCurrentIndex(index)}>
                <p className={`text-[13px] font-bold truncate ${index === currentIndex ? 'text-blue-500' : (theme === 'dark' ? 'text-gray-300' : 'text-gray-700')}`}>{s.title}</p>
              </div>
              <button onClick={() => removeSong(s.id)} className="w-8 h-8 flex items-center justify-center rounded-full bg-red-900/10 text-red-500 hover:bg-red-500 hover:text-white transition-all">×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}