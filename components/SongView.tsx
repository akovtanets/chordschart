"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const notes = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "H"];

export default function SongView({ songId }: { songId: number }) {
  const [song, setSong] = useState<any>(null);
  const [semitones, setSemitones] = useState(0);

  useEffect(() => {
    async function fetchSong() {
      const { data } = await supabase
        .from("songs")
        .select("*")
        .eq("id", songId)
        .single();
      if (data) setSong(data);
    }
    if (songId) fetchSong();
  }, [songId]);

  const transposeChord = (chord: string, delta: number) => {
    return chord.replace(/[A-H][#b]?/g, (match) => {
      let note = match;
      if (note === "C#") note = "Db";
      if (note === "D#") note = "Eb";
      if (note === "F#") note = "Gb";
      if (note === "G#") note = "Ab";
      if (note === "A#") note = "Bb";
      const index = notes.indexOf(note);
      if (index === -1) return match;
      const newIndex = (index + delta + 12) % 12;
      return notes[newIndex];
    });
  };

  const renderContent = (content: string) => {
    const parts = content.split(/(\[[^\]]+\])/g);
    return parts.map((part, i) => {
      if (part.startsWith("[") && part.endsWith("]")) {
        const chord = part.slice(1, -1);
        return (
          <span key={i} className="relative inline-block w-0 overflow-visible pointer-events-none">
            <span 
              className="absolute font-bold text-blue-400 select-none" 
              style={{ 
                bottom: '1.2em', // Опустили аккорд ближе к тексту (было 1.8)
                left: '0',
                fontSize: '0.8em',
                whiteSpace: 'nowrap',
                lineHeight: '1',
              }}
            >
              {transposeChord(chord, semitones)}
            </span>
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (!song) return <div className="p-20 text-center text-gray-500 font-mono">Завантаження...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 bg-[#0a0a0a] min-h-screen text-white">
      {/* Шапка */}
      <div className="flex justify-between items-center mb-10 border-b border-gray-900 pb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">{song.title}</h1>
          <p className="text-lg text-gray-500 italic">{song.author}</p>
        </div>
        
        <div className="flex items-center gap-1 bg-gray-900/80 p-1 rounded-xl border border-gray-800">
          <button onClick={() => setSemitones(s => s - 1)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-800 rounded-lg transition-colors">b</button>
          <div className="w-10 text-center font-mono font-bold text-blue-500">{semitones}</div>
          <button onClick={() => setSemitones(s => s + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-800 rounded-lg transition-colors">#</button>
        </div>
      </div>

      {/* Контент с уменьшенными параметрами */}
      <div className="relative">
        <pre 
          className="whitespace-pre-wrap font-mono text-base md:text-lg text-gray-200 px-2"
          style={{ 
            lineHeight: '2.2', // Уменьшили в два раза (было 4.2)
            letterSpacing: '0.01em'
          }}
        >
          {renderContent(song.content)}
        </pre>
      </div>

      <div className="h-40" />
    </div>
  );
}