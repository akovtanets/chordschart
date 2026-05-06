"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import YouTubePlayer from "@/components/YouTubePlayer";

const NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

interface SongViewProps {
  songId: number;
  initialContent: string;
  setlistId?: number | null;
  youtubeUrl?: string | null;
}

export default function SongView({ songId, initialContent, setlistId = null, youtubeUrl = null }: SongViewProps) {
  const [semitones, setSemitones] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [song, setSong] = useState<any>(null);

  useEffect(() => {
    const initSettings = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      const { data: songData } = await supabase.from("songs").select("*").eq("id", songId).single();
      if (songData) setSong(songData);

      if (currentUser && setlistId) {
        const { data } = await supabase.from("user_song_settings").select("transposition_offset").eq("setlist_id", setlistId).eq("song_id", songId).maybeSingle();
        if (data) setSemitones(data.transposition_offset);
      }
      setLoading(false);
    };
    initSettings();
  }, [songId, setlistId]);

  const saveSettings = async (offset: number) => {
    if (!user || !setlistId) return;
    await supabase.from("user_song_settings").upsert({
      user_id: user.id, setlist_id: setlistId, song_id: songId, transposition_offset: offset,
    }, { onConflict: "user_id,setlist_id,song_id" });
  };

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
            const chord = transposeChord(part.slice(1, -1), semitones); 
            return (
              <div key={i} className="relative inline-block mr-6">
                <span className="absolute -top-5 left-0 font-bold text-blue-400 text-sm font-mono tracking-tighter whitespace-nowrap">{chord}</span>
                <span className="invisible text-transparent">{" ".repeat(chord.length + 1)}</span>
              </div>
            );
          }
          return <span key={i} className="text-gray-200 font-mono text-lg leading-tight whitespace-pre">{part}</span>;
        })}
      </div>
    );
  };

  if (loading) return <div className="p-8 text-gray-600 bg-black h-full font-mono uppercase text-xs">Loading...</div>;

  const sections = getStructuredSections(song?.content || initialContent);

  return (
    <div className="flex flex-col h-full bg-[#050505] text-white overflow-hidden">
      <div className="p-6 bg-[#0a0c10] border-b border-gray-900 shadow-2xl flex-shrink-0">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none italic italic-style mb-2">{song?.title}</h1>
            <p className="text-lg text-gray-500 font-medium">{song?.author}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {[{ label: "Key", val: song?.default_key, color: "text-blue-400" }, { label: "BPM", val: song?.bpm }, { label: "Time", val: song?.timesig || "4/4" }, { label: "Length", val: song?.length }].map((attr, idx) => (
              <div key={idx} className="bg-black/50 border border-gray-800 px-4 py-2 rounded-2xl min-w-[80px] text-center">
                <p className="text-[8px] text-gray-600 uppercase font-black mb-1">{attr.label}</p>
                <p className={`font-bold font-mono text-sm ${attr.color || "text-white"}`}>{attr.val || "—"}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 p-4 bg-[#0a0c10]/50 border-b border-gray-900 z-10 flex-shrink-0">
        <div className="max-w-[1600px] mx-auto w-full flex items-center gap-6">
          <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-gray-800">
            <button onClick={() => { const n = semitones - 1; setSemitones(n); saveSettings(n); }} className="w-10 h-10 hover:bg-gray-800 rounded-lg text-xl">-</button>
            <div className="text-center min-w-[40px]">
              <p className="text-[8px] text-gray-600 uppercase font-black">Semitones</p>
              <p className="font-bold font-mono text-sm text-blue-400">{semitones > 0 ? `+${semitones}` : semitones}</p>
            </div>
            <button onClick={() => { const n = semitones + 1; setSemitones(n); saveSettings(n); }} className="w-10 h-10 hover:bg-gray-800 rounded-lg text-xl">+</button>
          </div>
          <div className="flex-1">{youtubeUrl ? <YouTubePlayer url={youtubeUrl} isFullWidth={true} /> : <div className="h-10 border border-dashed border-gray-800 rounded-xl flex items-center justify-center text-gray-800 text-[10px] uppercase font-bold">YouTube Link Missing</div>}</div>
          {semitones !== 0 && <button onClick={() => { setSemitones(0); saveSettings(0); }} className="text-[9px] text-gray-600 hover:text-white underline uppercase font-black">Reset</button>}
        </div>
      </div>

      <div className="p-6 md:p-10 overflow-y-auto flex-1 custom-scrollbar">
        <div className="max-w-[1600px] mx-auto columns-1 lg:columns-2 gap-12 space-y-10">
          {sections.map((section, idx) => (
            <div key={idx} className="break-inside-avoid bg-[#0a0c10] border border-gray-900 p-10 rounded-[40px] shadow-2xl transition-all hover:border-gray-700">
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