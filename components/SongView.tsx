"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import YouTubePlayer from "@/components/YouTubePlayer";

const NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

interface SongViewProps {
  songId: number;
  initialContent: string;
  youtubeUrl?: string | null;
  theme: 'dark' | 'light';
  fontSizeLevel: number;
  capo: number;
  semitones: number;
}

interface SongSection {
  type: string;
  lines: string[];
}

export default function SongView({ 
  songId, 
  initialContent, 
  youtubeUrl = null,
  theme, 
  fontSizeLevel, 
  capo, 
  semitones 
}: SongViewProps) {
  const [song, setSong] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const fetchSong = async () => {
      const { data } = await supabase.from("songs").select("*").eq("id", songId).single();
      if (data) setSong(data);
      setLoading(false);
    };
    fetchSong();
  }, [songId]);

  const transposeChord = (chord: string, delta: number, capoOffset: number): string => {
    return chord.replace(/([A-G][b#]?)/g, (match) => {
      let note = match.replace("A#", "Bb").replace("C#", "Db").replace("D#", "Eb").replace("F#", "Gb").replace("G#", "Ab");
      const index = NOTES.indexOf(note);
      if (index === -1) return match;
      const finalDelta = delta - capoOffset;
      return NOTES[(index + finalDelta + 120) % 12];
    });
  };

  const handleUpdateSemitones = (delta: number) => {
    window.dispatchEvent(new CustomEvent('update-song-semitones', { detail: semitones + delta }));
  };

  useEffect(() => {
    const handleScroll = (e: KeyboardEvent) => {
      if (!scrollContainerRef.current) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const sections = sectionRefs.current.filter(Boolean);
      const containerTop = scrollContainerRef.current.getBoundingClientRect().top;
      
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = sections.find(s => s!.getBoundingClientRect().top > containerTop + 60);
        if (next) next.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = [...sections].reverse().find(s => s!.getBoundingClientRect().top < containerTop - 60);
        if (prev) prev.scrollIntoView({ behavior: "smooth", block: "start" });
        else scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    window.addEventListener("keydown", handleScroll);
    return () => window.removeEventListener("keydown", handleScroll);
  }, [song]);

  const renderLineContent = (line: string) => {
    const parts = line.split(/(\[.*?\])/g);
    const startsWithChord = line.trim().startsWith('[');
    
    const chordSizes = ["text-[12px] md:text-[14px]", "text-[16px] md:text-[18px]", "text-[20px] md:text-[22px]"];
    const textSizes = ["text-lg md:text-xl", "text-2xl md:text-3xl", "text-3xl md:text-4xl"];
    const margins = ["mb-6 md:mb-8", "mb-10 md:mb-12", "mb-12 md:mb-14"];
    const chordOffsets = ["-top-5 md:-top-6", "-top-7 md:-top-8", "-top-9 md:-top-10"];

    return (
      <div className={`flex flex-wrap leading-none ${margins[fontSizeLevel]} ${startsWithChord ? 'mt-6 md:mt-8' : 'mt-2'} min-h-[1.5rem]`}>
        {parts.map((part, i) => {
          if (part.startsWith('[') && part.endsWith(']')) {
            const chord = transposeChord(part.slice(1, -1), semitones, capo);
            const nextPart = parts[i + 1];
            const hasFollowingText = nextPart && nextPart.trim().length > 0;

            return (
              <div key={i} className={`relative inline-block h-0 overflow-visible ${!hasFollowingText ? 'min-w-[3.5ch] mr-2' : 'w-0'}`}>
                <span className={`absolute ${chordOffsets[fontSizeLevel]} left-0 font-bold font-mono tracking-tighter whitespace-nowrap transition-all ${chordSizes[fontSizeLevel]} ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                  {chord}
                </span>
              </div>
            );
          }
          return (
            <span key={i} className={`font-mono leading-tight whitespace-pre transition-all duration-300 ${textSizes[fontSizeLevel]} ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
              {part}
            </span>
          );
        })}
      </div>
    );
  };

  if (loading) return <div className="p-8 text-gray-500 bg-black h-full font-mono text-center italic text-xs uppercase tracking-widest">ЗАВАНТАЖЕННЯ...</div>;

  const rawContent = song?.content || initialContent || "";
  const sections: SongSection[] = rawContent.split("\n\n").map((s: string) => {
    const lines = s.split("\n");
    const rawHeader = lines[0].toUpperCase().replace(/[:]/g, "").trim();
    const translationMap: Record<string, string> = {
      "INTRO": "ВСТУП", "VERSE": "КУПЛЕТ", "CHORUS": "ПРИСПІВ", "BRIDGE": "БРІДЖ", "INTERLUDE": "ВСТАВКА", "OUTRO": "КІНЕЦЬ", "SOLO": "ПРОГРАШ", "INSTRUMENTAL": "ПРОГРАШ", "TAG": "ТЕГ"
    };
    const keywords = ["ВСТУП", "ІНТРО", "КУПЛЕТ", "ПРИСПІВ", "БРІДЖ", "ВСТАВКА", "ІНТЕРЛЮД", "КІНЕЦЬ", "INTRO", "VERSE", "CHORUS", "BRIDGE", "OUTRO", "ПРОГРАШ", "SOLO", "TAG"];
    const isHeader = keywords.some(k => rawHeader.includes(k));
    let finalHeader = rawHeader;
    Object.keys(translationMap).forEach(enKey => { if (rawHeader.includes(enKey)) finalHeader = rawHeader.replace(enKey, translationMap[enKey]); });
    return { type: isHeader ? finalHeader : "СЕКЦІЯ", lines: isHeader ? lines.slice(1) : lines };
  });

  return (
    <div className={`flex flex-col h-full transition-colors duration-500 ${theme === 'dark' ? 'bg-[#050505]' : 'bg-gray-100'}`}>
      {/* Шапка пісні */}
      <div className={`p-4 md:p-6 border-b flex-shrink-0 ${theme === 'dark' ? 'bg-[#0a0c10] border-gray-900 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className="max-w-[1200px] mx-auto">          
          {/* Контейнер заголовка пісні */}
          <div className="mb-6 md:mb-10">
            {/* Назва пісні */}
            <h1 className={`text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-1 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{song?.title}</h1>

            {/* Блок автора з фіксованою висотою */}
            <div className="min-h-[1.5rem] md:min-h-[2rem]"> 
              {song?.author ? (
                <p className="text-sm md:text-base text-gray-500 font-medium">
                  {song?.author}
                </p>
              ) : (
                /* Порожній блок, який тримає місце */
                <div className="h-full w-full"></div>
              )}
            </div>
          </div>

          {/* Блоки параметрів */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* Блок зміни тональності */}
            <div className={`border px-4 py-2.5 rounded-2xl flex flex-col justify-center ${theme === 'dark' ? 'bg-black border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
              <p className="text-[9px] text-gray-500 uppercase font-black mb-1.5 tracking-widest text-center">ТРАНСПОНУВАТИ</p>
              <div className="flex items-center justify-between px-2">
                <button onClick={() => handleUpdateSemitones(-1)} className="text-xl font-bold hover:text-blue-500 transition-colors">−</button>
                <span className="font-bold font-mono text-xl text-blue-400">{semitones > 0 ? `+${semitones}` : semitones}</span>
                <button onClick={() => handleUpdateSemitones(1)} className="text-xl font-bold hover:text-blue-500 transition-colors">+</button>
              </div>
            </div>

            {[
              { label: "ТОНАЛЬНІСТЬ", val: transposeChord(song?.default_key || "C", semitones, 0), color: "text-blue-400" },
              { label: "ТЕМП", val: song?.bpm || "—" },
              { label: "КАПО", val: capo > 0 ? capo : "Ø" },
              { label: "ДОВЖИНА", val: song?.length || "—" }
            ].map((attr, idx) => (
              <div key={idx} className={`border px-4 py-2.5 rounded-2xl flex flex-col justify-center text-center ${theme === 'dark' ? 'bg-black border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                <p className="text-[9px] text-gray-500 uppercase font-black mb-1 tracking-widest">{attr.label}</p>
                <p className={`font-bold font-mono text-xl ${attr.color || (theme === 'dark' ? 'text-white' : 'text-black')}`}>{attr.val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {youtubeUrl && (
        <div className={`p-2 md:p-3 border-b flex-shrink-0 ${theme === 'dark' ? 'bg-[#0a0c10]/50 border-gray-900' : 'bg-white border-gray-200'}`}>
          <div className="max-w-[1200px] mx-auto overflow-hidden rounded-xl">
            <YouTubePlayer url={youtubeUrl} isFullWidth={true} />
          </div>
        </div>
      )}

      {/* Основний контент */}
      <div ref={scrollContainerRef} className="p-4 md:p-10 overflow-y-auto flex-1 custom-scrollbar scroll-smooth">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-6 pb-60">
          {sections.map((section: SongSection, idx: number) => (
            <div 
              key={idx} 
              ref={(el) => { sectionRefs.current[idx] = el; }} 
              className={`border p-6 md:p-8 rounded-[32px] shadow-lg transition-all w-full ${theme === 'dark' ? 'bg-[#0a0c10] border-gray-900 shadow-black/40' : 'bg-white border-gray-200 shadow-gray-200/50'}`}
            >
              <div className="flex items-center gap-4 mb-8">
                <h3 className="text-blue-500 text-[13px] md:text-[15px] font-black uppercase tracking-[0.4em] italic">{section.type}</h3>
                <div className={`h-[1px] flex-1 ${theme === 'dark' ? 'bg-blue-900/30' : 'bg-gray-100'}`}></div>
              </div>
              <div className="flex flex-col">
                {section.lines.map((line: string, lIdx: number) => (
                  <div key={lIdx}>{renderLineContent(line)}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}