"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import YouTubePlayer from "@/components/YouTubePlayer";

const NOTES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

interface SongViewProps {
  songId: number;
  initialContent: string;
  youtubeUrl?: string | null;
  audioUrl?: string | null;
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
  audioUrl = null,
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
  const hasSnappedRef = useRef(false);

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

  // Плавный авто-скролл
  useEffect(() => {
    let isSnapping = false;

    const handleScroll = () => {
      if (isSnapping) return;

      const currentScroll = window.scrollY;
      
      if (currentScroll < 15) {
        if (hasSnappedRef.current || isScrolled) {
          hasSnappedRef.current = false;
          setIsScrolled(false);
        }
        return;
      }
      
      if (!hasSnappedRef.current && currentScroll >= 10) {
        hasSnappedRef.current = true;
        isSnapping = true;
        
        setIsScrolled(true);

        const firstSection = document.getElementById("section-0");
        if (firstSection) {
          const topPos = firstSection.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ 
            top: topPos - 380, 
            behavior: "smooth" 
          });
        }
        
        setTimeout(() => {
          isSnapping = false;
        }, 500);
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []); 

  // Навігація клавіатурою та свайпами по блоках
  useEffect(() => {
    let touchStartY = 0;
    let touchStartX = 0;
    let isCooldown = false;

    const navigateSection = (direction: 'next' | 'prev') => {
      if (isCooldown) return;
      isCooldown = true;
      setTimeout(() => { isCooldown = false; }, 350);

      if (layoutMode === 'two-column' && window.innerWidth >= 768) {
        const scrollContainer = document.getElementById("two-column-scroll-container");
        if (!scrollContainer) return;
        
        const step = (scrollContainer.clientWidth + 24) / 2;
        const currentStep = Math.round(scrollContainer.scrollLeft / step);

        if (direction === 'next') {
          scrollContainer.scrollTo({ left: (currentStep + 1) * step, behavior: "smooth" });
        } else {
          scrollContainer.scrollTo({ left: (currentStep - 1) * step, behavior: "smooth" });
        }
        return;
      }

      if (!sectionsContainerRef.current) return;
      const sectionElements = Array.from(sectionsContainerRef.current.querySelectorAll('[data-section="true"]'));
      const offsets = sectionElements.map(el => el.getBoundingClientRect().top + window.scrollY);

      if (direction === 'next') {
        const next = offsets.find(top => top > window.scrollY + 160);
        if (next !== undefined) window.scrollTo({ top: next - 140, behavior: "smooth" });
      } else {
        const prev = [...offsets].reverse().find(top => top < window.scrollY + 120);
        window.scrollTo({ top: prev !== undefined ? prev - 140 : 0, behavior: "smooth" });
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        navigateSection('next');
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        navigateSection('prev');
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const touchEndY = e.changedTouches[0].clientY;
      const touchEndX = e.changedTouches[0].clientX;

      const diffY = touchStartY - touchEndY;
      const diffX = touchStartX - touchEndX;
      const minSwipeDistance = 35;

      if (layoutMode === 'two-column' && window.innerWidth >= 768) {
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > minSwipeDistance) {
          if (diffX > 0) navigateSection('next');
          else navigateSection('prev');
        }
      } else {
        if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > minSwipeDistance) {
          if (diffY > 0) navigateSection('next');
          else navigateSection('prev');
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [song, loading, layoutMode]);

  const transposeChord = (chord: string, delta: number, capoOffset: number): string => {
    return chord.replace(/([A-G][b#]?)/g, (match) => {
      let note = match.replace("A#", "Bb").replace("Db", "C#").replace("D#", "Eb");
      const index = NOTES.indexOf(note);
      if (index === -1) return match;
      const finalDelta = delta - capoOffset;
      return NOTES[(index + finalDelta + 120) % 12];
    });
  };

const renderLineContent = (line: string) => {
    const hasChords = line.includes('[');
    const isOnlyChords = line.trim().length > 0 && line.replace(/\[.*?\]/g, '').trim().length === 0;

    const chordSizes = ["text-[11px] md:text-[14px]", "text-[14px] md:text-[18px]", "text-[18px] md:text-[22px]"];
    const textSizes = ["text-base md:text-xl", "text-xl md:text-3xl", "text-2xl md:text-4xl"];
    const margins = ["mb-3 md:mb-5", "mb-6 md:mb-8", "mb-8 md:mb-10"];

    if (!hasChords) {
      return (
        <div className={`flex flex-col ${margins[fontSizeLevel]}`}>
          <span className={`font-mono whitespace-pre-wrap leading-tight ${textSizes[fontSizeLevel]} ${theme === 'dark' ? 'text-gray-300' : 'text-gray-800'}`}>
            {line}
          </span>
        </div>
      );
    }

    const parts = line.split(/(\[.*?\])/g);
    let pairs: { chord: string; text: string }[] = [];
    let currentChord = "";
    let currentText = "";

    parts.forEach((part) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        if (currentChord || currentText) {
          pairs.push({ chord: currentChord, text: currentText });
          currentChord = "";
          currentText = "";
        }
        currentChord = transposeChord(part.slice(1, -1), semitones, capo);
      } else {
        currentText += part;
      }
    });
    pairs.push({ chord: currentChord, text: currentText });

    // Проверяем, является ли строка чисто инструментальной (нет обычного текста, кроме пробелов и символов '|')
    const isInstrumentalLine = pairs.every(p => !p.text.replace(/[|\s]/g, ''));

    if (isInstrumentalLine) {
      return (
        <div className={`flex flex-wrap items-center gap-x-3 ${margins[fontSizeLevel]}`}>
          {pairs.map((pair, index) => (
            <div key={index} className="flex items-center gap-x-3">
              {pair.chord && (
                <span className={`font-medium font-mono ${chordSizes[fontSizeLevel]} ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                  {pair.chord}
                </span>
              )}
              {pair.text.includes('|') && (
                <span className={`font-mono font-bold ${chordSizes[fontSizeLevel]} ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  |
                </span>
              )}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className={`flex flex-wrap items-start ${margins[fontSizeLevel]} ${isOnlyChords ? 'pb-1 md:pb-2' : ''}`}>
        {pairs.map((pair, index) => (
          <div key={index} className="flex flex-col inline-flex mr-[2px]">
            <span className={`font-medium font-mono whitespace-pre leading-none ${chordSizes[fontSizeLevel]} ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
              {pair.chord || "\u00A0"}
            </span>
            <span className={`font-mono whitespace-pre leading-tight ${textSizes[fontSizeLevel]} ${theme === 'dark' ? 'text-gray-300' : 'text-gray-800'}`}>
              {pair.text || "\u00A0"}
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <div className="p-8 text-gray-500 bg-black h-full w-full font-mono text-center italic text-xs uppercase tracking-widest">ЗАВАНТАЖЕННЯ...</div>;

  const rawContent: string = song?.content || initialContent || "";
  const translationMap: Record<string, string> = {
    "INTRO": "ВСТУП", "VERSE": "КУПЛЕТ", "CHORUS": "ПРИСПІВ", "REFRAIN": "РЕФРЕЙН", 
    "BRIDGE": "БРІДЖ", "OUTRO": "АУТРО", "ENDING": "КІНЕЦЬ", "SOLO": "СОЛО", 
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
      
      <div id="sticky-header" className={`w-full sticky top-[73px] z-[90] transition-all duration-500 flex-shrink-0 ${theme === 'dark' ? 'bg-[#050505]/95 backdrop-blur-sm border-b border-gray-900' : 'bg-gray-100/95 backdrop-blur-sm border-b border-gray-200'} ${layoutMode === 'two-column' ? 'md:relative md:top-0' : ''}`}>
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
          {/* НОВАЯ НАВИГАЦИЯ (Внутри Sticky Шапки) */}
          <div className={`w-full flex flex-wrap justify-start gap-2 md:gap-3 transition-all duration-500 ${isScrolled ? 'mt-3' : 'mt-5'}`}>
            {sections.map((section, idx) => (
              <button
                key={`nav-${idx}`}
                onClick={() => {
                  const el = document.getElementById(`section-${idx}`);
                  if (el) {
                    if (layoutMode === 'two-column' && window.innerWidth >= 768) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
                    } else {
                      // Динамически получаем нижнюю границу шапки
                      const header = document.getElementById('sticky-header');
                      const headerBottom = header ? header.getBoundingClientRect().bottom : 170;
                      
                      // Скроллим так, чтобы блок был прямо под шапкой + 20px для красоты
                      const y = el.getBoundingClientRect().top + window.scrollY - headerBottom - 20;
                      window.scrollTo({ top: y, behavior: 'smooth' });
                    }
                  }
                }}
                className={`border rounded-xl px-3 py-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  theme === 'dark' 
                    ? 'bg-[#0a0c10] border-gray-800 text-gray-500 hover:text-blue-400 hover:border-gray-700' 
                    : 'bg-white border-gray-300 text-gray-500 hover:text-blue-600 hover:border-gray-400'
                }`}
              >
                {section.type}
              </button>
            ))}
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

      <div className={`relative flex-grow w-full ${layoutMode === 'two-column' ? 'md:min-h-0' : 'p-4 md:p-5'}`}>
        
        {layoutMode === 'two-column' && (
          <div className="hidden md:block absolute inset-0 pt-4 pb-8 overflow-hidden px-4">
            <div
              id="two-column-scroll-container"
              className="h-full w-full max-w-[1200px] mx-auto overflow-x-auto overflow-y-hidden custom-scrollbar"
              style={{
                columnCount: 2,
                columnGap: '24px',
                columnFill: 'auto'
              }}
            >
              {sections.map((section, idx) => (
                <div
                  key={idx}
                  id={`section-${idx}`}
                  data-section="true"
                  className={`relative border p-4 md:p-6 pt-5 rounded-xl mb-6 mt-3 ${theme === 'dark' ? 'border-gray-800 bg-transparent' : 'border-gray-300 bg-transparent'}`}
                  style={{
                    breakInside: 'avoid',
                    pageBreakInside: 'avoid',
                    display: 'inline-block',
                    width: '100%',
                    verticalAlign: 'top'
                  }}
                >
                  <div className={`absolute -top-[10px] left-4 md:left-6 px-2 ${theme === 'dark' ? 'bg-[#050505]' : 'bg-gray-100'}`}>
                    <h3 className={`text-xs md:text-sm font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {section.type}
                    </h3>
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
          className={`w-full max-w-[1200px] mx-auto flex flex-col gap-6 pb-20 ${layoutMode === 'two-column' ? 'md:hidden' : 'px-[5px] md:px-[5px] py-4'}`}
          ref={layoutMode === 'single' ? sectionsContainerRef : null}
        >
          {sections.map((section, idx) => (
            <div 
              key={idx} 
              id={`section-${idx}`}
              data-section="true"
              className={`relative border p-4 md:p-6 pt-5 rounded-xl mt-3 ${theme === 'dark' ? 'border-gray-800 bg-transparent' : 'border-gray-300 bg-transparent'}`}
            >
              <div className={`absolute -top-[10px] left-4 md:left-6 px-2 ${theme === 'dark' ? 'bg-[#050505]' : 'bg-gray-100'}`}>
                <h3 className={`text-xs md:text-sm font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {section.type}
                </h3>
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