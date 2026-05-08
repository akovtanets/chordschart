"use client";

import { useEffect, useState, use, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import SongView from "@/components/SongView";
import Metronome from "@/components/Metronome";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SetlistPage({ params }: PageProps) {
  const unwrappedParams = use(params);
  const setlistId = unwrappedParams.id;

  const [songs, setSongs] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  const [setlistDate, setSetlistDate] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [fontSizeLevel, setFontSizeLevel] = useState(0); 
  const [capo, setCapo] = useState(0);
  const [semitones, setSemitones] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  // СТАНИ ДЛЯ КОМАНДИ
  const [isTeamShared, setIsTeamShared] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);

  const cacheKey = useMemo(() => `setlist_cache_${setlistId}`, [setlistId]);

  const fetchSetlistAndSongs = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || null;
      setUserId(currentUserId);

      const { data: teamMembership } = await supabase
        .from("team_members")
        .select("team_id, role")
        .eq("user_id", currentUserId)
        .or('role.ilike.admin,role.ilike.leader')
        .maybeSingle();
      
      if (teamMembership) {
        setUserTeamId(teamMembership.team_id);
      }

      const { data: setlist, error: setlistError } = await supabase
        .from("setlists")
        .select("*")
        .eq("id", setlistId)
        .single();

      if (setlistError) throw setlistError;

      if (setlist) {
        setSetlistDate(setlist.created_at);
        setIsTeamShared(setlist.is_team_shared || false);
        const ownerCheck = setlist.user_id === currentUserId;
        setIsOwner(ownerCheck);

        if (setlist.song_ids && setlist.song_ids.length > 0) {
          const { data: songsData } = await supabase
            .from("songs")
            .select("*")
            .in("id", setlist.song_ids);

          if (songsData) {
            const sortedSongs = setlist.song_ids
              .map((id: any) => songsData.find((s: any) => s.id === Number(id)))
              .filter(Boolean);
            
            setSongs(sortedSongs);
            sessionStorage.setItem(cacheKey, JSON.stringify({ songs: sortedSongs, date: setlist.created_at }));
          }
        } else {
          setSongs([]);
        }
      }
    } catch (err) {
      console.error("❌ Помилка завантаження:", err);
    } finally {
      setLoading(false);
    }
  }, [setlistId, cacheKey]);

  useEffect(() => {
    fetchSetlistAndSongs();
  }, [setlistId, fetchSetlistAndSongs]);

  // КЕРУВАННЯ КЛАВІАТУРОЮ (СТРІЛКИ ПРАВО/ЛІВО)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goToNext();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToPrev();
      }
      if (event.code === "Space") {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("toggle-youtube-play"));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [songs.length, currentIndex]);

  const handleToggleShare = async () => {
    if (!isOwner || !userTeamId) return;
    const nextValue = !isTeamShared;
    const { error } = await supabase
      .from("setlists")
      .update({ is_team_shared: nextValue, team_id: nextValue ? userTeamId : null })
      .eq("id", setlistId);

    if (!error) setIsTeamShared(nextValue);
  };

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

  useEffect(() => {
    const loadSongSettings = async () => {
      if (!userId || !songs[currentIndex]) return;
      const { data } = await supabase.from("user_song_settings").select("transposition_offset").eq("user_id", userId).eq("setlist_id", setlistId).eq("song_id", songs[currentIndex].id).maybeSingle();
      setSemitones(data?.transposition_offset || 0);
    };
    loadSongSettings();
  }, [currentIndex, userId, setlistId, songs]);

  const saveSemitones = async (offset: number) => {
    setSemitones(offset);
    if (!userId || !songs[currentIndex]) return;
    await supabase.from("user_song_settings").upsert({ user_id: userId, setlist_id: Number(setlistId), song_id: songs[currentIndex].id, transposition_offset: offset }, { onConflict: "user_id,setlist_id,song_id" });
  };

  const getCapoKeyLabel = (capoValue: number) => {
    if (!songs[currentIndex]) return "";
    const NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
    const currentSongKey = songs[currentIndex].default_key || "C";
    const noteMatch = currentSongKey.replace("A#", "Bb").replace("C#", "Db").replace("D#", "Eb").replace("F#", "Gb").replace("G#", "Ab").match(/[A-G][b#]?/);
    const noteIndex = noteMatch ? NOTES.indexOf(noteMatch[0]) : 0;
    return NOTES[(noteIndex + semitones - capoValue + 120) % 12];
  };

  const updateDatabase = async (newSongs: any[]) => {
    if (!isOwner) return;
    const newIds = newSongs.map(s => s.id);
    await supabase.from("setlists").update({ song_ids: newIds }).eq("id", setlistId);
    setSongs(newSongs);
    sessionStorage.setItem(cacheKey, JSON.stringify({ songs: newSongs, date: setlistDate }));
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

  const goToNext = () => setCurrentIndex((p) => (p < songs.length - 1 ? p + 1 : p));
  const goToPrev = () => setCurrentIndex((p) => (p > 0 ? p - 1 : p));

  const downloadPDF = () => { if (!userId) return; setShowSettings(false); setTimeout(() => { window.print(); }, 100); };

  if (loading) return <div className="flex h-screen items-center justify-center bg-black text-gray-400 font-mono text-[10px] uppercase tracking-widest">Завантаження...</div>;

  return (
    <div className="flex h-screen overflow-hidden bg-black text-white print:h-auto print:overflow-visible print:bg-white">
      <style dangerouslySetInnerHTML={{__html: `@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } @page { margin: 10mm; } }`}} />

      <div className={`flex flex-col flex-1 h-full transition-all duration-500 ${isEditing && isOwner ? 'md:mr-[350px]' : ''} print:m-0`}>
        
        <div className="sticky top-0 w-full flex justify-between items-center p-2 md:p-4 bg-[#0d0d0d] border-b border-gray-800 z-[50] shadow-2xl print:hidden gap-1 md:gap-4">
          <div className="flex gap-1 md:gap-4 items-center overflow-x-auto custom-scrollbar">
            <Link href="/setlists" className="flex items-center justify-center min-w-[32px] h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-black border border-gray-800 text-gray-400 hover:text-blue-500 transition-all active:scale-90 flex-shrink-0">
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </Link>

            <div className="flex items-center bg-black rounded-lg md:rounded-xl border border-gray-800 p-0.5 md:p-1 flex-shrink-0">
                <button onClick={goToPrev} disabled={currentIndex === 0} className="p-1.5 md:p-2 px-2 md:px-3 text-blue-500 hover:bg-gray-800 rounded-md md:rounded-lg disabled:opacity-10 transition">←</button>
                <div className="px-2 md:px-4 text-center border-x border-gray-800 font-mono text-[9px] md:text-[10px] text-gray-500 whitespace-nowrap">{currentIndex + 1} / {songs.length}</div>
                <button onClick={goToNext} disabled={currentIndex === songs.length - 1} className="p-1.5 md:p-2 px-2 md:px-3 text-blue-500 hover:bg-gray-800 rounded-md md:rounded-lg disabled:opacity-10 transition">→</button>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">
            {/* МЕТРОНОМ */}
            {songs[currentIndex]?.bpm && (
              <div className="hidden sm:block">
                <Metronome bpm={parseInt(songs[currentIndex].bpm)} />
              </div>
            )}

            <div className="relative">
              <button onClick={() => setShowSettings(!showSettings)} className={`w-8 h-8 md:w-11 md:h-11 flex items-center justify-center rounded-full border border-gray-800 bg-[#111] transition-all ${showSettings ? 'bg-blue-600 rotate-90 border-blue-400' : ''}`}>
                <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
              
              {showSettings && (
                <div className="absolute right-0 mt-2 md:mt-3 w-[260px] md:w-72 bg-[#0d0d0d] border border-gray-800 rounded-[24px] md:rounded-[32px] p-4 md:p-6 shadow-2xl z-[100]">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4 md:mb-6 text-center italic">Налаштування</h4>
                  <div className="space-y-4 md:space-y-6">
                    {isOwner && userTeamId && (
                      <div className="pb-4 border-b border-gray-800/50">
                        <button onClick={handleToggleShare} className={`w-full py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${isTeamShared ? 'border-blue-600 bg-blue-600/10 text-blue-400' : 'border-gray-800 bg-black text-gray-500'}`}>
                          <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${isTeamShared ? 'border-blue-400 bg-blue-400' : 'border-gray-700'}`}>
                            {isTeamShared && <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>}
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest">Для команди</span>
                        </button>
                      </div>
                    )}
                    <div>
                      <p className="text-[9px] md:text-[10px] font-black text-gray-500 mb-2 md:mb-3 uppercase text-center tracking-widest">Транспонування</p>
                      <div className="flex items-center gap-1 md:gap-2 bg-black/40 p-1 rounded-lg md:rounded-xl border border-gray-800 text-white">
                        <button onClick={() => saveSemitones(semitones - 1)} className="flex-1 py-1 hover:bg-gray-800 rounded-md transition">-</button>
                        <div className="text-center min-w-[50px] md:min-w-[60px] font-bold font-mono text-xs md:text-sm text-blue-500">{semitones > 0 ? `+${semitones}` : semitones}</div>
                        <button onClick={() => saveSemitones(semitones + 1)} className="flex-1 py-1 hover:bg-gray-800 rounded-md transition">+</button>
                      </div>
                    </div>
                    <div>
                        <p className="text-[9px] md:text-[10px] font-black text-gray-500 mb-2 md:mb-3 uppercase text-center tracking-widest">Каподастр</p>
                        <div className="grid grid-cols-5 gap-1 md:gap-2">
                            {[0, 1, 4, 6, 9].map((val) => (
                            <button key={val} onClick={() => setCapo(val)} className={`flex flex-col items-center justify-center h-10 md:h-12 rounded-lg md:rounded-xl border transition-all ${capo === val ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-[#151515] border-gray-800 text-gray-400'}`}>
                                <span className="text-[11px] md:text-[12px] font-black">{val === 0 ? 'Ø' : val}</span>
                                <span className="text-[7px] md:text-[8px] font-bold mt-0.5 opacity-40">{getCapoKeyLabel(val)}</span>
                            </button>
                            ))}
                        </div>
                    </div>
                    <div className="pt-4 border-t border-gray-800">
                      <button onClick={downloadPDF} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-[9px] uppercase tracking-widest">Експорт PDF</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {isOwner && (
              <button onClick={() => setIsEditing(!isEditing)} className="px-4 py-2 md:px-8 md:py-3.5 rounded-full text-[9px] md:text-[11px] font-black bg-white text-black uppercase tracking-widest transition-all">
                {isEditing ? 'ГОТОВО' : 'РЕДАГУВАТИ'}
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative print:overflow-visible print:h-auto">
          {songs[currentIndex] && (
            <SongView 
              key={`${setlistId}-${songs[currentIndex].id}`} 
              songId={songs[currentIndex].id} 
              initialContent={songs[currentIndex].content || ""} 
              youtubeUrl={songs[currentIndex].youtube_url}
              theme={theme} 
              fontSizeLevel={fontSizeLevel} 
              capo={capo} 
              semitones={semitones} 
            />
          )}
        </div>
      </div>

      <div className={`fixed right-0 top-0 h-full w-full md:w-[350px] bg-[#080808] border-l border-gray-800 transition-transform duration-500 z-[100] p-4 md:p-6 flex flex-col print:hidden ${isEditing && isOwner ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-between items-center mb-6 md:mb-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 font-mono">Редагування</h3>
            <button onClick={() => setIsEditing(false)} className="md:hidden text-gray-500 p-2 text-xl">×</button>
        </div>
        <div className="mb-6 md:mb-8 relative">
            <input type="text" placeholder="Пошук пісні..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[#111] border border-gray-800 rounded-xl p-3 md:p-4 text-xs outline-none focus:border-blue-500 text-white" />
            {searchResults.length > 0 && (
                <div className="absolute top-full left-0 w-full bg-[#151515] border border-gray-800 rounded-xl mt-2 shadow-2xl overflow-hidden z-[110]">
                {searchResults.map(s => (
                    <button key={s.id} onClick={() => addSong(s)} className="w-full text-left p-3 md:p-4 hover:bg-blue-600 transition-colors border-b border-gray-900 last:border-none">
                        <p className="text-[11px] md:text-[13px] font-bold text-white">{s.title}</p>
                        <p className="text-[9px] md:text-[10px] text-gray-500">{s.author}</p>
                    </button>
                ))}
                </div>
            )}
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 md:space-y-3 pr-1 custom-scrollbar">
          {songs.map((s, index) => (
            <div key={s.id} className={`flex items-center gap-2 md:gap-3 p-3 md:p-4 rounded-xl border transition-all ${index === currentIndex ? 'bg-blue-900/20 border-blue-500/50' : 'bg-[#111] border-gray-900'}`}>
              <div className="flex flex-col items-center">
                <button onClick={() => moveSong(index, 'up')} disabled={index === 0} className="p-1 text-gray-600 hover:text-white disabled:opacity-20">▲</button>
                <button onClick={() => moveSong(index, 'down')} disabled={index === songs.length - 1} className="p-1 text-gray-600 hover:text-white disabled:opacity-20">▼</button>
              </div>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setCurrentIndex(index)}>
                <p className={`text-[11px] md:text-[13px] font-bold truncate ${index === currentIndex ? 'text-blue-500' : 'text-gray-300'}`}>{s.title}</p>
              </div>
              <button onClick={() => removeSong(s.id)} className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-full bg-red-900/10 text-red-500 hover:bg-red-500 hover:text-white transition-all">×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}