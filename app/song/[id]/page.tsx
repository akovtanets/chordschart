"use client";

import { useEffect, useState, use, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import YouTubePlayer from "@/components/YouTubePlayer";

export default function SongPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  const router = useRouter();

  const [song, setSong] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Стейти для аудіоплеєра та гучності
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1); // від 0 до 1
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const NOTES = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id || null);

      const { data: songData } = await supabase
        .from("songs")
        .select("*")
        .eq("id", id)
        .single();
        
      if (songData) setSong(songData);
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const toggleAudioPlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const isOwner = currentUserId && song && currentUserId === song.user_id;

  const transposeChord = (chord: string, delta: number) => {
    return chord.replace(/([A-G][b#]?)/g, (match) => {
      let note = match.replace("A#", "Bb").replace("C#", "Db").replace("D#", "Eb").replace("F#", "Gb").replace("G#", "Ab");
      const index = NOTES.indexOf(note);
      if (index === -1) return match;
      return NOTES[(index + delta + 120) % 12]; 
    });
  };

  const getStructuredSections = (content: string) => {
    if (!content) return [];
    
    const translationMap: Record<string, string> = {
      "INTRO": "ВСТУП", "VERSE": "КУПЛЕТ", "CHORUS": "ПРИСПІВ", "BRIDGE": "БРІДЖ",
      "INTERLUDE": "ВСТАВКА", "INSTRUMENTAL": "ПРОГРАШ", "OUTRO": "КІНЕЦЬ", "SOLO": "СОЛО", "TAG": "ТЕГ"
    };

    return content.split(/\r?\n\s*\r?\n/).map((s: string) => {
      const lines = s.split(/\r?\n/);
      let rawHeader = lines[0].toUpperCase().replace(/[\[\]:]/g, "").trim();
      
      const allKeywords = [...Object.keys(translationMap), ...Object.values(translationMap)];
      const isHeader = allKeywords.some(k => rawHeader.includes(k));
      
      let finalHeader = rawHeader;
      if (isHeader) {
        Object.keys(translationMap).forEach(enKey => {
          if (finalHeader.includes(enKey)) {
            finalHeader = finalHeader.replace(enKey, translationMap[enKey]);
          }
        });
      }
      
      return { 
        type: isHeader ? finalHeader : "СЕКЦІЯ", 
        lines: isHeader ? lines.slice(1) : lines 
      };
    });
  };

  const RenderLine = ({ line }: { line: string }) => {
    const parts = line.split(/(\[.*?\])/g);
    const startsWithChord = line.trim().startsWith('[');

    return (
      <div className={`flex flex-wrap leading-none mb-6 ${startsWithChord ? 'mt-6' : 'mt-2'} min-h-[1.5rem]`}>
        {parts.map((part, i) => {
          if (part.startsWith('[') && part.endsWith(']')) {
            const chord = transposeChord(part.slice(1, -1), offset);
            const nextPart = parts[i + 1];
            const hasFollowingText = nextPart && nextPart.trim().length > 0;
            return (
              <div key={i} className={`relative inline-block h-0 overflow-visible ${!hasFollowingText ? 'min-w-[3.5ch] mr-2' : 'w-0'}`}>
                <span className="absolute -top-5 left-0 font-bold font-mono tracking-tighter whitespace-nowrap text-blue-400 text-sm">{chord}</span>
              </div>
            );
          }
          return <span key={i} className="font-mono leading-tight whitespace-pre text-gray-200 text-lg">{part}</span>;
        })}
      </div>
    );
  };

  if (loading) return <div className="min-h-screen bg-black text-gray-600 p-10 text-center font-mono italic uppercase tracking-widest text-xs">ЗАВАНТАЖЕННЯ...</div>;
  if (!song) return <div className="min-h-screen bg-black text-white p-10 text-center font-mono uppercase tracking-widest">ПІСНЮ НЕ ЗНАЙДЕНО</div>;

  const sections = getStructuredSections(song.content);

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans">
      <div className="max-w-[1200px] mx-auto">
        
        {/* Шапка */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <button onClick={() => router.back()} className="text-gray-600 hover:text-white mb-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em]">← Назад</button>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none mb-2 italic">{song.title}</h1>
            <p className="text-xl text-gray-500 font-medium tracking-tight">{song.author}</p>
          </div>
          {isOwner && (
            <Link href={`/edit-song/${song.id}`} className="bg-white text-black px-8 py-3 rounded-full text-[10px] font-black hover:scale-105 transition-all uppercase tracking-widest">Редагувати</Link>
          )}
        </div>

        {/* Панель параметров */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#0a0c10] border border-gray-900 rounded-2xl p-4 shadow-xl flex flex-col justify-center">
            <p className="text-[9px] text-gray-600 uppercase font-black mb-2 tracking-widest text-center">Транспонувати</p>
            <div className="flex items-center justify-between px-2">
              <button onClick={() => setOffset(prev => prev - 1)} className="text-xl text-gray-400 hover:text-white transition-colors">−</button>
              <span className="text-xl font-mono font-bold text-blue-400">{offset > 0 ? `+${offset}` : offset}</span>
              <button onClick={() => setOffset(prev => prev + 1)} className="text-xl text-gray-400 hover:text-white transition-colors">+</button>
            </div>
            <button onClick={() => setOffset(0)} className="mt-1 text-[8px] text-gray-700 hover:text-gray-400 uppercase font-bold tracking-widest text-center">скинути</button>
          </div>

          {[
            { label: "Тональность", val: transposeChord(song.default_key || "C", offset), color: "text-blue-400" },
            { label: "Темп (BPM)", val: song.bpm },
            { label: "Длительность", val: song.length }
          ].map((attr, idx) => (
            <div key={idx} className="bg-[#0a0c10] border border-gray-900 rounded-2xl p-4 shadow-xl flex flex-col justify-center text-center">
              <p className="text-[9px] text-gray-600 uppercase font-black mb-2 tracking-widest">{attr.label}</p>
              <p className={`font-bold font-mono text-xl ${attr.color || "text-white"}`}>{attr.val || "—"}</p>
            </div>
          ))}
        </div>

        {/* Аудіо або Відео плеєр з регулюванням гучності */}
        <div className="bg-[#0a0c10] border border-gray-900 rounded-[32px] p-6 shadow-2xl mb-8">
          <div className="flex items-center justify-between mb-4">
             <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest">
               {song.audio_url ? "Аудіозапис (MP3)" : "Відео"}
             </p>
          </div>

          {song.audio_url ? (
            <div className="flex flex-col md:flex-row items-center gap-4 bg-black/40 p-4 rounded-2xl border border-gray-800">
              <audio 
                ref={audioRef} 
                src={song.audio_url} 
                onEnded={() => setIsPlaying(false)} 
              />
              <div className="flex items-center gap-4 w-full md:w-auto">
                <button 
                  onClick={toggleAudioPlay}
                  className="w-12 h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg transition-all shadow-lg shrink-0"
                >
                  {isPlaying ? "❚❚" : "▶"}
                </button>
                <div className="flex flex-col flex-1">
                  <span className="text-sm font-bold text-gray-200">{song.title}</span>
                  <span className="text-xs text-gray-500">{song.author || "Локальний аудіофайл"}</span>
                </div>
              </div>

              {/* Слайдер гучності */}
              <div className="flex items-center gap-2 w-full md:w-48 justify-end px-2">
                <span className="text-xs text-gray-500">🔊</span>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value={volume} 
                  onChange={handleVolumeChange}
                  className="w-full accent-blue-500 cursor-pointer h-1 bg-gray-700 rounded-lg"
                />
                <span className="text-[10px] font-mono text-gray-400 w-8 text-right">{Math.round(volume * 100)}%</span>
              </div>
            </div>
          ) : song.youtube_url ? (
            <YouTubePlayer url={song.youtube_url} isFullWidth={true} />
          ) : (
            <div className="h-20 border border-dashed border-gray-900 rounded-2xl flex items-center justify-center text-gray-800 text-[9px] uppercase font-bold tracking-widest">
              Аудіо або відео відсутнє
            </div>
          )}
        </div>

        {/* Текст песни */}
        <div className="flex flex-col gap-6 pb-40">
          {sections.map((section, idx) => (
            <div key={idx} className="bg-[#0a0c10] border border-gray-900 p-8 md:p-10 rounded-[32px] shadow-2xl w-full">
              <div className="flex items-center gap-4 mb-8">
                <h3 className="text-blue-500 text-[11px] font-black uppercase tracking-[0.4em] italic">{section.type}</h3>
                <div className="h-[1px] flex-1 bg-blue-900/10"></div>
              </div>
              <div className="flex flex-col">
                {section.lines.map((line, lIdx) => <RenderLine key={lIdx} line={line} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}