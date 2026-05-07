"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import YouTubePlayer from "@/components/YouTubePlayer";

const NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

interface SongViewProps {
  songId: number;
  initialContent: string;
  setlistId?: number | null;
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

  useEffect(() => {
    const handleScroll = (e: KeyboardEvent) => {
      if (!scrollContainerRef.current) return;
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

  const RenderLine = ({ line }: { line: string }) => {
    const parts = line.split(/(\[.*?\])/g);
    const startsWithChord = line.trim().startsWith('[');
    
    // Адаптивні розміри для мобільних пристроїв
    const chordSizes = ["text-[12px] md:text-[14px] print:text-[11px]", "text-[16px] md:text-[18px] print:text-[14px]", "text-[20px] md:text-[22px] print:text-[18px]"];
    const textSizes = ["text-lg md:text-xl print:text-[16px]", "text-2xl md:text-3xl print:text-[22px]", "text-3xl md:text-4xl print:text-[28px]"];
    const margins = ["mb-6 md:mb-8 print:mb-5", "mb-10 md:mb-12 print:mb-8", "mb-12 md:mb-14 print:mb-10"];
    const chordOffsets = ["-top-5 md:-top-6 print:-top-4", "-top-7 md:-top-8 print:-top-6", "-top-9 md:-top-10 print:-top-8"];

    return (
      <div className={`flex flex-wrap leading-none ${margins[fontSizeLevel]} ${startsWithChord ? (fontSizeLevel === 0 ? 'mt-6 md:mt-8 print:mt-5' : 'mt-10 md:mt-12 print:mt-8') : 'mt-2 print:mt-1'} min-h-[1.5rem]`}>
        {parts.map((part, i) => {
          if (part.startsWith('[') && part.endsWith(']')) {
            const chord = transposeChord(part.slice(1, -1), semitones, capo);
            const nextPart = parts[i + 1];
            const hasFollowingText = nextPart && nextPart.length > 0 && nextPart.trim() !== "";
            
            return (
              <div key={i} className={`relative inline-block ${!hasFollowingText ? 'min-w-[3.5ch] mr-1 md:mr-2' : ''}`}>
                <span className={`absolute ${chordOffsets[fontSizeLevel]} left-0 font-bold font-mono tracking-tighter whitespace-nowrap transition-all ${chordSizes[fontSizeLevel]} ${theme === 'dark' ? 'text-blue-400 print:text-black' : 'text-blue-600 print:text-black'}`}>
                  {chord}
                </span>
                {!hasFollowingText && <span className={`invisible text-transparent font-mono ${textSizes[fontSizeLevel]}`}>{" ".repeat(chord.length)}</span>}
              </div>
            );
          }
          return (
            <span key={i} className={`font-mono leading-tight whitespace-pre transition-all duration-300 ${textSizes[fontSizeLevel]} ${theme === 'dark' ? 'text-gray-200 print:text-black' : 'text-gray-800 print:text-black'}`}>
              {part}
            </span>
          );
        })}
      </div>
    );
  };

  if (loading) return <div className="p-8 text-gray-500 bg-black h-full font-mono text-center italic text-xs uppercase tracking-widest">LOADING...</div>;

  const rawContent = song?.content || initialContent || "";
  const sections: SongSection[] = rawContent.split("\n\n").map((s: string) => {
    const lines = s.split("\n");
    const firstLine = lines[0].toUpperCase();
    const keywords = ["ВСТУП", "ІНТРО", "КУПЛЕТ", "ПРИСПІВ", "БРІДЖ", "ВСТАВКА", "ІНТЕРЛЮД", "КІНЕЦЬ", "INTRO", "VERSE", "CHORUS", "BRIDGE", "OUTRO"];
    const isHeader = keywords.some(k => firstLine.includes(k));

    return { 
      type: isHeader ? lines[0].replace(/:/g, "") : "СЕКЦІЯ", 
      lines: isHeader ? lines.slice(1) : lines 
    };
  });

  return (
    <div id="song-pdf-area" className={`flex flex-col h-full transition-colors duration-500 ${theme === 'dark' ? 'bg-[#050505] print:bg-white' : 'bg-gray-100 print:bg-white'}`}>
      
      {/* ШАПКА ПЕСНИ */}
      <div className={`p-4 md:p-6 border-b flex-shrink-0 transition-colors duration-500 print:p-0 print:border-none print:mb-8 ${theme === 'dark' ? 'bg-[#0a0c10] border-gray-900 shadow-xl md:shadow-2xl print:bg-white print:shadow-none' : 'bg-white border-gray-200 shadow-sm print:shadow-none'}`}>
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left print:flex-col print:items-center">
          <div className="print:text-center w-full md:w-auto">
            {/* Додано break-words та text-2xl для мобільних */}
            <h1 className={`text-2xl sm:text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-1 break-words ${theme === 'dark' ? 'text-white print:text-black' : 'text-black'}`}>{song?.title}</h1>
            <p className="text-sm md:text-base text-gray-500 font-medium">{song?.author}</p>
          </div>

          {/* Додано flex-wrap щоб плашки переносились на маленьких екранах */}
          <div className="flex flex-wrap justify-center gap-2 print:mt-4">
            {[
              { label: "Key", val: transposeChord(song?.default_key || "C", semitones, 0) }, 
              { label: "BPM", val: song?.bpm || "—" }, 
              { label: "Length", val: song?.length || "—" }, 
              { label: "Capo", val: capo > 0 ? capo : "Ø" }
            ].map((attr, idx) => (
              <div key={idx} className={`border px-3 md:px-5 py-1.5 md:py-2 rounded-xl min-w-[60px] md:min-w-[70px] text-center transition-colors duration-500 ${theme === 'dark' ? 'bg-black border-gray-800 text-white print:bg-white print:border-gray-200 print:text-black' : 'bg-gray-50 border-gray-200 text-black'}`}>
                <p className="text-[6px] md:text-[7px] opacity-50 uppercase font-black mb-0.5 tracking-widest">{attr.label}</p>
                <p className={`font-bold font-mono text-xs md:text-sm ${attr.label === 'Key' ? (theme === 'dark' ? 'text-blue-400 print:text-blue-600' : 'text-blue-600') : ''}`}>{attr.val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {youtubeUrl && (
        <div className={`p-2 md:p-3 border-b flex-shrink-0 print:hidden ${theme === 'dark' ? 'bg-[#0a0c10]/50 border-gray-900' : 'bg-white border-gray-200'}`}>
          <div className="max-w-[1200px] mx-auto overflow-hidden rounded-xl">
            <YouTubePlayer url={youtubeUrl} isFullWidth={true} />
          </div>
        </div>
      )}

      {/* Зменшено відступи на мобільних */}
      <div ref={scrollContainerRef} className="p-2 sm:p-4 md:p-10 overflow-y-auto flex-1 custom-scrollbar scroll-smooth print:overflow-visible print:h-auto print:p-0">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-4 md:gap-8 pb-60 print:pb-0 print:gap-4">
          {sections.map((section: SongSection, idx: number) => (
            <div 
              key={idx} 
              ref={(el) => { sectionRefs.current[idx] = el; }} 
              className={`border p-4 sm:p-6 md:p-8 rounded-[20px] md:rounded-[32px] shadow-lg md:shadow-2xl transition-all duration-500 w-full print:border-none print:p-0 print:shadow-none print:bg-transparent ${theme === 'dark' ? 'bg-[#0a0c10] border-gray-900 shadow-black/40' : 'bg-white border-gray-200 shadow-gray-200/50'}`}
            >
              <div className="flex items-center gap-3 mb-6 md:mb-8 print:mb-4">
                <h3 className="text-blue-500 text-[9px] md:text-[11px] font-black uppercase tracking-[0.4em] italic print:text-gray-400">{section.type}</h3>
                <div className={`h-[1px] flex-1 print:bg-gray-100 ${theme === 'dark' ? 'bg-gradient-to-r from-blue-900/30 to-transparent' : 'bg-gray-100'}`}></div>
              </div>
              <div className="flex flex-col">
                {section.lines.map((line: string, lIdx: number) => (
                  <RenderLine key={lIdx} line={line} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}