"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import YouTubePlayer from "@/components/YouTubePlayer";
import Metronome from "@/components/Metronome";

export default function SongPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  const router = useRouter();

  const [song, setSong] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

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
    
    // Словник: замінюємо англійські назви на українські
    const translationMap: Record<string, string> = {
      "INTRO": "ВСТУП",
      "VERSE": "КУПЛЕТ",
      "CHORUS": "ПРИСПІВ",
      "BRIDGE": "БРІДЖ",
      "INTERLUDE": "ВСТАВКА",
      "OUTRO": "КІНЕЦЬ",
      "SOLO": "ПРОГРАШ",
      "TAG": "ТЕГ"
    };

    return content.split("\n\n").map((s: string) => {
      const lines = s.split("\n");
      let rawHeader = lines[0].toUpperCase().replace(/[:]/g, "").trim();
      
      const keywords = ["ВСТУП", "ІНТРО", "КУПЛЕТ", "ПРИСПІВ", "БРІДЖ", "ВСТАВКА", "ІНТЕРЛЮД", "КІНЕЦЬ", "INTRO", "VERSE", "CHORUS", "BRIDGE", "OUTRO", "SOLO", "TAG"];
      const isHeader = keywords.some(k => rawHeader.includes(k));

      let finalHeader = rawHeader;
      // Шукаємо англійське слово і замінюємо на українське
      Object.keys(translationMap).forEach(enKey => {
        if (rawHeader.includes(enKey)) {
          finalHeader = rawHeader.replace(enKey, translationMap[enKey]);
        }
      });

      return { 
        type: isHeader ? finalHeader : "КУПЛЕТ", 
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
              <div 
                key={i} 
                className={`relative inline-block h-0 overflow-visible ${!hasFollowingText ? 'min-w-[3.5ch] mr-2' : 'w-0'}`}
              >
                <span className="absolute -top-5 left-0 font-bold font-mono tracking-tighter whitespace-nowrap text-blue-400 text-sm">
                  {chord}
                </span>
              </div>
            );
          }
          return (
            <span key={i} className="font-mono leading-tight whitespace-pre text-gray-200 text-lg">
              {part}
            </span>
          );
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
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 border-b border-gray-900 pb-8 gap-8">
          <div>
            <button onClick={() => router.back()} className="text-gray-600 hover:text-white mb-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em]">← Назад</button>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.8] mb-2 italic">{song.title}</h1>
            <p className="text-xl text-gray-500 font-medium tracking-tight mb-4">{song.author}</p>
          </div>

          <div className="flex flex-col items-end gap-6 w-full lg:w-auto">
            <div className="flex flex-wrap justify-end gap-3 items-center">
              {[
                { label: "Тональність", val: transposeChord(song.default_key || "C", offset), color: "text-blue-400" },
                { label: "BPM", val: song.bpm },
                { label: "Тривалість", val: song.length }
              ].map((attr, idx) => (
                <div key={idx} className="bg-[#0a0c10] border border-gray-800 px-5 py-3 rounded-2xl min-w-[80px] text-center shadow-lg">
                  <p className="text-[8px] text-gray-600 uppercase font-black tracking-widest mb-1">{attr.label}</p>
                  <p className={`font-bold font-mono text-sm ${attr.color || "text-white"}`}>{attr.val || "—"}</p>
                </div>
              ))}
              {song.bpm && <Metronome bpm={parseInt(song.bpm)} />}
            </div>

            {isOwner && (
              <Link href={`/edit-song/${song.id}`} className="bg-white text-black px-10 py-3 rounded-full text-[10px] font-black hover:scale-105 transition-all uppercase tracking-widest">Редагувати</Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-16">
          <div className="bg-[#0a0c10] border border-gray-900 rounded-[32px] p-6 shadow-2xl h-fit">
            <p className="text-[10px] text-gray-600 uppercase font-black mb-4 tracking-widest">Транспонувати</p>
            <div className="flex items-center justify-between bg-black/40 rounded-2xl p-2 border border-gray-800/50">
              <button onClick={() => setOffset(prev => prev - 1)} className="w-10 h-10 rounded-xl text-xl hover:bg-gray-800 transition-colors">-</button>
              <span className="text-2xl font-mono font-bold text-blue-400">{offset > 0 ? `+${offset}` : offset}</span>
              <button onClick={() => setOffset(prev => prev + 1)} className="w-10 h-10 rounded-xl text-xl hover:bg-gray-800 transition-colors">+</button>
            </div>
            <button onClick={() => setOffset(0)} className="mt-4 w-full text-[9px] text-gray-700 hover:text-white uppercase font-black tracking-widest">Скинути</button>
          </div>
          <div className="lg:col-span-3 bg-[#0a0c10] border border-gray-900 rounded-[32px] p-6 shadow-2xl">
            <p className="text-[10px] text-gray-600 uppercase font-black mb-4 tracking-widest">Відео</p>
            {song.youtube_url ? <YouTubePlayer url={song.youtube_url} isFullWidth={true} /> : <div className="h-20 border border-dashed border-gray-900 rounded-2xl flex items-center justify-center text-gray-800 text-[9px] uppercase font-bold tracking-widest">Відео відсутнє</div>}
          </div>
        </div>

        <div className="flex flex-col gap-8 max-w-[900px] mx-auto pb-40">
          {sections.map((section, idx) => (
            <div key={idx} className="bg-[#0a0c10] border border-gray-900 p-8 md:p-10 rounded-[32px] shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <h3 className="text-blue-500 text-[10px] font-black uppercase tracking-[0.4em] italic">{section.type}</h3>
                <div className="h-[1px] flex-1 bg-blue-900/20"></div>
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