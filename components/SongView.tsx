"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import YouTubePlayer from "@/components/YouTubePlayer";

// Используем только бемоли согласно твоим требованиям
const NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

interface SongViewProps {
  songId: number;
  initialContent: string;
  setlistId?: number | null;
  youtubeUrl?: string | null;
  bpm?: number | string | null;
  originalKey?: string | null;
}

export default function SongView({ 
  songId, 
  initialContent, 
  setlistId = null, 
  youtubeUrl = null,
  bpm = null,
  originalKey = null
}: SongViewProps) {
  const [semitones, setSemitones] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initSettings = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser && setlistId) {
        const { data } = await supabase
          .from("user_song_settings")
          .select("transposition_offset")
          .eq("setlist_id", setlistId)
          .eq("song_id", songId)
          .maybeSingle();

        if (data) setSemitones(data.transposition_offset);
      }
      setLoading(false);
    };
    initSettings();
  }, [songId, setlistId]);

  const saveSettings = async (offset: number) => {
    if (!user || !setlistId) return;
    await supabase.from("user_song_settings").upsert({
      user_id: user.id,
      setlist_id: setlistId,
      song_id: songId,
      transposition_offset: offset,
    }, { onConflict: "user_id,setlist_id,song_id" });
  };

  const transposeChord = (chord: string, delta: number) => {
    return chord.replace(/([A-G][b#]?)/g, (match) => {
      let note = match.replace("A#", "Bb").replace("C#", "Db").replace("D#", "Eb").replace("F#", "Gb").replace("G#", "Ab");
      const index = NOTES.indexOf(note);
      if (index === -1) return match;
      const newIndex = (index + delta + 120) % 12;
      return NOTES[newIndex];
    });
  };

  const parseLine = (line: string) => {
    let chordLine = "";
    let textLine = "";
    let lastChordEndPos = 0;
    const regex = /\[(.*?)\]/g;
    let match;

    while ((match = regex.exec(line)) !== null) {
      const transposed = transposeChord(match[1], semitones);
      const textBefore = line.substring(lastChordEndPos, match.index).replace(/\[.*?\]/g, "");
      const currentPosInText = textLine.length + textBefore.length;
      const spacesNeeded = currentPosInText - chordLine.length;
      chordLine += " ".repeat(Math.max(0, spacesNeeded)) + transposed;
      lastChordEndPos = match.index + match[0].length;
      textLine += textBefore;
    }
    textLine += line.substring(lastChordEndPos).replace(/\[.*?\]/g, "");

    return (
      <div key={Math.random()} className="mb-2 min-h-[2.5rem]">
        <div className="text-blue-400 font-bold whitespace-pre font-mono leading-none">{chordLine || " "}</div>
        <div className="text-white whitespace-pre font-mono leading-none">{textLine || " "}</div>
      </div>
    );
  };

  const handleTranspose = (delta: number) => {
    const newOffset = semitones + delta;
    setSemitones(newOffset);
    saveSettings(newOffset);
  };

  if (loading) return <div className="p-8 text-gray-500 bg-black h-full">Завантаження...</div>;

  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* ВЕРХНЯЯ ПАНЕЛЬ */}
      <div className="flex items-center gap-6 p-4 bg-[#111] border-b border-gray-800 h-20">
        
        {/* Блок управления тональностью и инфо */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => handleTranspose(-1)} className="w-10 h-10 bg-gray-800 rounded-lg hover:bg-gray-700 flex items-center justify-center text-xl">-</button>
            <div className="text-center min-w-[50px]">
              <p className="text-[9px] text-gray-500 uppercase leading-tight">Тональність</p>
              <p className="font-bold font-mono text-sm">{semitones > 0 ? `+${semitones}` : semitones}</p>
            </div>
            <button onClick={() => handleTranspose(1)} className="w-10 h-10 bg-gray-800 rounded-lg hover:bg-gray-700 flex items-center justify-center text-xl">+</button>
          </div>

          {/* BPM и Оригинальная тональность (если есть в базе) */}
          {(bpm || originalKey) && (
            <div className="hidden sm:flex border-l border-gray-700 pl-4 gap-4">
              {bpm && (
                <div>
                  <p className="text-[9px] text-gray-500 uppercase leading-tight">BPM</p>
                  <p className="font-mono text-sm font-bold">{bpm}</p>
                </div>
              )}
              {originalKey && (
                <div>
                  <p className="text-[9px] text-gray-500 uppercase leading-tight">Key</p>
                  <p className="font-mono text-sm font-bold">{originalKey}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ПЛЕЕР НА ВСЮ ОСТАВШУЮСЯ ШИРИНУ */}
        <div className="flex-1">
          {youtubeUrl ? (
            <YouTubePlayer url={youtubeUrl} isFullWidth={true} />
          ) : (
            <div className="h-12 border border-dashed border-gray-800 rounded-lg flex items-center justify-center text-gray-700 text-xs">
              YouTube link not provided
            </div>
          )}
        </div>

        {/* Кнопка сброса */}
        {semitones !== 0 && (
          <button 
            onClick={() => { setSemitones(0); saveSettings(0); }} 
            className="text-[9px] text-gray-500 hover:text-white underline uppercase flex-shrink-0"
          >
            Reset
          </button>
        )}
      </div>

      {/* ТЕКСТ ПЕСНИ */}
      <div className="p-6 overflow-y-auto flex-1">
        <div className="max-w-4xl mx-auto">
          {(initialContent || "").split("\n").map(line => parseLine(line))}
        </div>
      </div>
    </div>
  );
}