"use client";

import { useEffect, useState, use } from "react";
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
    const lines = content.split("\n");
    const sections: { type: string; lines: string[] }[] = [];
    const keywords = ["ВСТУП", "ІНТРО", "КУПЛЕТ", "ПРИСПІВ", "БРІДЖ", "ВСТАВКА", "ІНТЕРЛЮД", "КІНЕЦЬ", "INTRO", "VERSE", "CHORUS", "BRIDGE", "OUTRO"];
    let currentSection: { type: string; lines: string[] } | null = null;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const upperLine = trimmed.toUpperCase();
      const isHeader = keywords.some(key => {
        const regex = new RegExp(`(^|\\d|\\s)${key}(\\b|:|\\s)`, "i");
        return regex.test(upperLine);
      });

      if (isHeader && trimmed.length < 30) {
        if (currentSection) sections.push(currentSection);
        currentSection = { type: trimmed.replace(/[:]/g, "").trim(), lines: [] };
      } else {
        if (!currentSection) currentSection = { type: "ВСТУП", lines: [] };
        currentSection.lines.push(line);
      }
    });
    if (currentSection) sections.push(currentSection);
    return sections;
  };

  const RenderLine = ({ line }: { line: string }) => {
    const parts = line.split(/(\[.*?\])/g);
    return (
      <div className="flex flex-wrap leading-none mb-6 mt-4 min-h-[1.5rem]">
        {parts.map((part, i) => {
          if (part.startsWith('[') && part.endsWith(']')) {
            const chord = transposeChord(part.slice(1, -1), offset);
            return (
              <div key={i} className="relative inline-block mr-6">
                <span className="absolute -top-5 left-0 font-bold text-blue-400 text-sm font-mono tracking-tighter whitespace-nowrap">
                  {chord}
                </span>
                <span className="invisible text-transparent">{" ".repeat(chord.length + 1)}</span>
              </div>
            );
          }
          return <span key={i} className="text-gray-200 font-mono text-lg leading-tight whitespace-pre">{part}</span>;
        })}
      </div>
    );
  };

  if (loading) return <div className="min-h-screen bg-black text-gray-600 p-10 text-center font-mono">LOADING...</div>;
  if (!song) return <div className="min-h-screen bg-black text-white p-10 text-center font-mono">SONG NOT FOUND</div>;

  const sections = getStructuredSections(song.content);

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 border-b border-gray-900 pb-8 gap-8">
          <div>
            <button onClick={() => router.back()} className="text-gray-600 hover:text-white mb-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em]">← Назад</button>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase leading-[0.8] mb-2 italic italic-style">{song.title}</h1>
            <p className="text-2xl text-gray-500 font-medium tracking-tight mb-4">{song.author}</p>
          </div>

          <div className="flex flex-col items-end gap-6 w-full lg:w-auto">
            <div className="flex flex-wrap gap-3">
              {[
                { label: "Key", val: song.default_key, color: "text-blue-400" },
                { label: "BPM", val: song.bpm },
                { label: "Time", val: song.timesig || "4/4" },
                { label: "Length", val: song.length }
              ].map((attr, idx) => (
                <div key={idx} className="bg-[#0a0c10] border border-gray-800 px-5 py-3 rounded-2xl min-w-[90px] text-center shadow-lg">
                  <p className="text-[9px] text-gray-600 uppercase font-black tracking-widest mb-1">{attr.label}</p>
                  <p className={`font-bold font-mono text-base ${attr.color || "text-white"}`}>{attr.val || "—"}</p>
                </div>
              ))}
            </div>

            {isOwner ? (
              <Link href={`/edit-song/${song.id}`} className="bg-white text-black px-10 py-4 rounded-full text-xs font-black hover:scale-105 transition-all">РЕДАГУВАТИ</Link>
            ) : (
              <div className="group relative">
                <button className="bg-gray-900 text-gray-700 px-10 py-4 rounded-full text-xs font-black cursor-not-allowed border border-gray-800">РЕДАГУВАТИ (🔒)</button>
                <div className="absolute top-full mt-2 right-0 w-64 p-4 bg-[#111] border border-gray-800 rounded-2xl text-[10px] text-gray-500 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity z-30 shadow-2xl">
                  Редагування в загальному каталозі дозволено тільки власнику.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-16">
          <div className="bg-[#0a0c10] border border-gray-900 rounded-[32px] p-8 shadow-2xl">
            <p className="text-[10px] text-gray-600 uppercase font-black mb-6">Транспонувати</p>
            <div className="flex items-center justify-between bg-black/40 rounded-2xl p-2 border border-gray-800/50">
              <button onClick={() => setOffset(prev => prev - 1)} className="w-12 h-12 rounded-xl text-2xl hover:bg-gray-800">-</button>
              <span className="text-3xl font-mono font-bold text-blue-400">{offset > 0 ? `+${offset}` : offset}</span>
              <button onClick={() => setOffset(prev => prev + 1)} className="w-12 h-12 rounded-xl text-2xl hover:bg-gray-800">+</button>
            </div>
            <button onClick={() => setOffset(0)} className="mt-4 w-full text-[9px] text-gray-700 hover:text-white uppercase font-black">Скинути</button>
          </div>
          <div className="lg:col-span-3 bg-[#0a0c10] border border-gray-900 rounded-[32px] p-8 shadow-2xl">
            <p className="text-[10px] text-gray-600 uppercase font-black mb-4">YouTube Player</p>
            {song.youtube_url ? <YouTubePlayer url={song.youtube_url} isFullWidth={true} offset={offset} /> : <div className="h-24 border border-dashed border-gray-900 rounded-3xl flex items-center justify-center text-gray-800 text-[10px] uppercase font-bold tracking-[0.2em]">YouTube Link Missing</div>}
          </div>
        </div>

        <div className="columns-1 md:columns-2 gap-10 space-y-10">
          {sections.map((section, idx) => (
            <div key={idx} className="break-inside-avoid bg-[#0a0c10] border border-gray-900 p-10 rounded-[40px] shadow-2xl hover:border-gray-700 transition-all group">
              <div className="flex items-center gap-4 mb-10">
                <h3 className="text-blue-500 text-[11px] font-black uppercase tracking-[0.4em]">{section.type}</h3>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-blue-900/40 to-transparent"></div>
              </div>
              <div className="flex flex-col gap-2">
                {section.lines.map((line, lIdx) => <RenderLine key={lIdx} line={line} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}