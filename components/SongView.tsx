"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import YouTubePlayer from "@/components/YouTubePlayer";

const NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

interface SongViewProps {
  songId: number;
  initialContent: string;
  youtubeUrl?: string | null;
  audioUrl?: string | null; // ДОДАНО: пропс для локального аудіофайлу
  theme: 'dark' | 'light';
  fontSizeLevel: number;
  capo: number;
  semitones: number;
  layoutMode?: 'single' | 'two-column';
}

interface SongSection {
  type: string;
  lines: string[];
}

export default function SongView({ 
  songId, 
  initialContent, 
  youtubeUrl = null,
  audioUrl = null, // ДОДАНО
  theme, 
  fontSizeLevel, 
  capo, 
  semitones,
  layoutMode = 'single'
}: SongViewProps) {
  const [song, setSong] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const sectionsContainerRef = useRef<HTMLDivElement>(null);

  // Стейти для кастомного аудіоплеєра та гучності
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchSong = async () => {
      const { data } = await supabase.from("songs").select("*").eq("id", songId).single();
      if (data) setSong(data);
      setLoading(false);
    };
    fetchSong();
  }, [songId]);

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

  // ФИКС ДЕРГАНИЯ: Используем гистерезис (два разных порога)
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled((prev) => {
        if (!prev && window.scrollY > 150) return true;
        if (prev && window.scrollY < 20) return false;
        return prev;
      });
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (layoutMode === 'two-column' && window.innerWidth >= 768) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          const scrollContainer = document.getElementById("two-column-scroll-container");
          if (!scrollContainer) return;
          
          const step = (scrollContainer.clientWidth + 24) / 2;
          const currentStep = Math.round(scrollContainer.scrollLeft / step);

          if (e.key === "ArrowDown") {
            scrollContainer.scrollTo({ left: (currentStep + 1) * step, behavior: "smooth" });
          } else if (e.key === "ArrowUp") {
            scrollContainer.scrollTo({ left: (currentStep - 1) * step, behavior: "smooth" });
          }
        }
        return;
      }

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!sectionsContainerRef.current) return;
        const sectionElements = Array.from(sectionsContainerRef.current.querySelectorAll('[data-section="true"]'));
        const offsets = sectionElements.map(el => el.getBoundingClientRect().top + window.scrollY);

        if (e.key === "ArrowDown") {
          const next = offsets.find(top => top > window.scrollY + 310);
          if (next !== undefined) window.scrollTo({ top: next - 300, behavior: "smooth" });
        } else if (e.key === "ArrowUp") {
          const prev = [...offsets].reverse().find(top => top < window.scrollY + 290);
          window.scrollTo({ top: prev !== undefined ? prev - 300 : 0, behavior: "smooth" });
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [song, loading, layoutMode]);

  const transposeChord = (chord: string, delta: number, capoOffset: number): string => {
    return chord.replace(/([A-G][b#]?)/g, (match) => {
      let note = match.replace("A#", "Bb").replace("C#", "Db").replace("D#", "Eb").replace("F#", "Gb").replace("G#", "Ab");
      const index = NOTES.indexOf(note);
      if (index === -1) return match;
      const finalDelta = delta - capoOffset;
      return NOTES[(index + finalDelta + 120) % 12];
    });
  };

  const renderLineContent = (line: string) => {
    const parts = line.split(/(\[.*?\])/g);
    const isOnlyChords = line.trim().length > 0 && line.replace(/\[.*?\]/g, '').trim().length === 0;
    const startsWithChord = line.trim().startsWith('[');
    const chordSizes = ["text-[12px] md:text-[14px]", "text-[16px] md:text-[18px]", "text-[20px] md:text-[22px]"];
    const textSizes = ["text-lg md:text-xl", "text-2xl md:text-3xl", "text-3xl md:text-4xl"];
    const margins = ["mb-6 md:mb-8", "mb-10 md:mb-12", "mb-12 md:mb-14"];
    const chordOffsets = ["-top-5 md:-top-6", "-top-7 md:-top-8", "-top-9 md:-top-10"];

    return (
      <div className={`flex flex-wrap leading-none ${margins[fontSizeLevel]} ${startsWithChord ? 'mt-6 md:mt-8' : 'mt-2'} ${isOnlyChords ? 'pb-4' : ''} min-h-[1.5rem]`}>
        {parts.map((part: string, i: number) => {
          if (part.startsWith('[') && part.endsWith(']')) {
            const chord = transposeChord(part.slice(1, -1), semitones, capo);
            return (
              <div key={i} className={`relative inline-block h-0 overflow-visible ${isOnlyChords ? 'min-w-[4ch] mr-2' : 'w-0'}`}>
                <span className={`absolute ${chordOffsets[fontSizeLevel]} left-0 font-bold font-mono whitespace-nowrap transition-all ${chordSizes[fontSizeLevel]} ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                  {chord}
                </span>
              </div>
            );
          }
          return (
            <span key={i} className={`font-mono leading-tight whitespace-pre ${textSizes[fontSizeLevel]} ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
              {part}
            </span>
          );
        })}
      </div>
    );
  };

  if (loading) return <div className="p-8 text-gray-500 bg-black h-full w-full font-mono text-center italic text-xs uppercase tracking-widest">ЗАВАНТАЖЕННЯ...</div>;

  const rawContent: string = song?.content || initialContent || "";
  const translationMap: Record<string, string> = {
    "INTRO": "ВСТУП", "VERSE": "КУПЛЕТ", "CHORUS": "ПРИСПІВ", 
    "BRIDGE": "БРІДЖ", "OUTRO": "КІНЕЦЬ", "SOLO": "СОЛО", 
    "INSTRUMENTAL": "ПРОГРАШ", "INTERLUDE": "ВСТАВКА", 
    "TAG": "ТЕГ", "PRE-CHORUS": "ПЕРЕД-ПРИСПІВ"
  };

  const sections: SongSection[] = rawContent.split(/\r?\n\s*\r?\n/).map((s: string) => {
    const lines = s.split(/\r?\n/);
    let rawHeader = lines[0].toUpperCase().replace(/[\[\]:]/g, "").trim();
    const allKeywords = [...Object.keys(translationMap), ...Object.values(translationMap)];
    const isHeader = allKeywords.some(k => rawHeader.includes(k));
    let finalHeader = rawHeader;
    if (isHeader) {
      Object.keys(translationMap).forEach(enKey => {
        if (finalHeader.includes(enKey)) finalHeader = finalHeader.replace(enKey, translationMap[enKey]);
      });
    }
    return { type: isHeader ? finalHeader : "СЕКЦІЯ", lines: isHeader ? lines.slice(1) : lines };
  });

  const activeAudioUrl = song?.audio_url || audioUrl;
  const activeYoutubeUrl = song?.youtube_url || youtubeUrl;

  return (
    <div className={`w-full transition-colors duration-500 ${theme === 'dark' ? 'bg-[#050505]' : 'bg-gray-100'} ${layoutMode === 'two-column' ? 'md:h-full md:flex md:flex-col md:min-h-0' : 'min-h-screen'}`}>
      
      <div className={`w-full sticky top-[73px] z-[90] transition-all duration-500 flex-shrink-0 ${theme === 'dark' ? 'bg-[#050505]/95 backdrop-blur-sm border-b border-gray-900' : 'bg-gray-100/95 backdrop-blur-sm border-b border-gray-200'} ${layoutMode === 'two-column' ? 'md:relative md:top-0' : ''}`}>
        <div className={`w-full max-w-[1200px] mx-auto px-4 md:px-6 transition-all duration-500 ${isScrolled ? 'py-3' : 'py-5'}`}>
          
          <div className="flex flex-col justify-center">
            <h1 className={`font-black uppercase italic tracking-tighter leading-none transition-all duration-500 origin-left ${isScrolled ? 'text-2xl scale-95' : 'text-3xl md:text-5xl scale-100'} ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
              {song?.title}
            </h1>
            
            <div className={`transition-all duration-500 overflow-hidden ${isScrolled ? 'max-h-0 opacity-0' : 'max-h-[30px] opacity-100 mt-1'}`}>
              <p className="text-sm md:text-base text-gray-500 font-medium">{song?.author || '\u00A0'}</p>
            </div>
          </div>
          
          <div className={`transition-all duration-500 overflow-hidden ${isScrolled ? 'max-h-0 opacity-0 mt-0' : 'max-h-[200px] opacity-100 mt-4'}`}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "ТОНАЛЬНІСТЬ", val: transposeChord(song?.default_key || "C", semitones, 0), color: "text-blue-400" },
                { label: "ТЕМП", val: song?.bpm || "—" },
                { label: "КАПО", val: capo > 0 ? capo : "Ø" },
                { label: "ДОВЖИНА", val: song?.length || "—" }
              ].map((attr, idx: number) => (
                <div key={idx} className={`border px-4 py-2.5 rounded-2xl flex flex-col justify-center text-center ${theme === 'dark' ? 'bg-[#0a0c10] border-gray-800' : 'bg-white border-gray-200'}`}>
                  <p className="text-[9px] text-gray-500 uppercase font-black mb-1 tracking-widest">{attr.label}</p>
                  <p className={`font-bold font-mono text-xl ${attr.color || (theme === 'dark' ? 'text-white' : 'text-black')}`}>{attr.val}</p>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>

      {/* Аудіо або Відео плеєр */}
      {(activeAudioUrl || activeYoutubeUrl) && (
        <div className="w-full max-w-[1200px] mx-auto px-4 md:px-6 flex-shrink-0">
          <div className={`w-full overflow-hidden rounded-2xl shadow-2xl transition-all duration-500 ${isScrolled ? 'max-h-0 opacity-0 mt-0' : 'max-h-[500px] opacity-100 mt-6'}`}>
            
            {activeAudioUrl ? (
              <div className={`flex flex-col md:flex-row items-center gap-4 p-4 rounded-2xl border ${theme === 'dark' ? 'bg-[#0a0c10] border-gray-900' : 'bg-white border-gray-200'}`}>
                <audio 
                  ref={audioRef} 
                  src={activeAudioUrl} 
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
                    <span className={`text-sm font-bold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>{song?.title}</span>
                    <span className="text-xs text-gray-500">{song?.author || "Локальний аудіофайл"}</span>
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
                  <span className={`text-[10px] font-mono w-8 text-right ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{Math.round(volume * 100)}%</span>
                </div>
              </div>
            ) : activeYoutubeUrl ? (
              <YouTubePlayer url={activeYoutubeUrl} isFullWidth={true} />
            ) : null}

          </div>
        </div>
      )}

      <div className={`relative flex-grow w-full ${layoutMode === 'two-column' ? 'md:min-h-0' : 'p-4 md:p-10'}`}>
        
        {layoutMode === 'two-column' && (
          <div className="hidden md:block absolute inset-0 pt-4 pb-8 overflow-hidden">
            <div
              id="two-column-scroll-container"
              className="h-full w-full max-w-[1200px] mx-auto overflow-x-auto overflow-y-hidden custom-scrollbar px-2"
              style={{
                columnCount: 2,
                columnGap: '24px',
                columnFill: 'auto'
              }}
            >
              {sections.map((section, idx) => (
                <div
                  key={idx}
                  data-section="true"
                  className={`border p-6 md:p-8 rounded-[32px] shadow-lg mb-6 ${theme === 'dark' ? 'bg-[#0a0c10] border-gray-900 shadow-black/40' : 'bg-white border-gray-200 shadow-gray-200/50'}`}
                  style={{
                    breakInside: 'avoid',
                    pageBreakInside: 'avoid',
                    display: 'inline-block',
                    width: '100%',
                    verticalAlign: 'top'
                  }}
                >
                  <div className="flex items-center gap-4 mb-8">
                    <h3 className="text-blue-500 text-[13px] md:text-[15px] font-black uppercase tracking-[0.4em] italic">{section.type}</h3>
                    <div className={`h-[1px] flex-1 ${theme === 'dark' ? 'bg-blue-900/30' : 'bg-gray-100'}`}></div>
                  </div>
                  <div className="flex flex-col">
                    {section.lines.map((line, lIdx) => <div key={lIdx}>{renderLineContent(line)}</div>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div 
          className={`w-full max-w-[1200px] mx-auto flex flex-col gap-6 pb-20 ${layoutMode === 'two-column' ? 'md:hidden' : ''}`}
          ref={layoutMode === 'single' ? sectionsContainerRef : null}
        >
          {sections.map((section, idx) => (
            <div 
              key={idx} 
              data-section="true"
              className={`border p-6 md:p-8 rounded-[32px] shadow-lg ${theme === 'dark' ? 'bg-[#0a0c10] border-gray-900 shadow-black/40' : 'bg-white border-gray-200 shadow-gray-200/50'}`}
            >
              <div className="flex items-center gap-4 mb-8">
                <h3 className="text-blue-500 text-[13px] md:text-[15px] font-black uppercase tracking-[0.4em] italic">{section.type}</h3>
                <div className={`h-[1px] flex-1 ${theme === 'dark' ? 'bg-blue-900/30' : 'bg-gray-100'}`}></div>
              </div>
              <div className="flex flex-col">
                {section.lines.map((line, lIdx) => <div key={lIdx}>{renderLineContent(line)}</div>)}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}