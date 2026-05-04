"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase"; // Подключаем наш мост

const ALL_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export default function SongPage() {
  const [song, setSong] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transposeStep, setTransposeStep] = useState(0);

  // Эффект, который срабатывает при открытии страницы
  useEffect(() => {
    async function fetchSong() {
      try {
        setLoading(true);
        // Запрашиваем первую попавшуюся песню из таблицы 'songs'
        const { data, error } = await supabase
          .from("songs")
          .select("*")
          .limit(1)
          .single();

        if (error) throw error;
        setSong(data);
      } catch (error) {
        console.error("Помилка при завантаженні пісні:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSong();
  }, []);

  const transposeChord = (chord: string) => {
    const match = chord.match(/^[A-G]#?/);
    if (!match) return chord;
    const root = match[0];
    const suffix = chord.slice(root.length);
    const index = ALL_NOTES.indexOf(root);
    if (index === -1) return chord;
    let newIndex = (index + transposeStep) % 12;
    if (newIndex < 0) newIndex += 12;
    return ALL_NOTES[newIndex] + suffix;
  };

  const renderLine = (line: string, lineIndex: number) => {
    if (!line.trim()) return <div key={lineIndex} className="h-6"></div>;
    const parts = line.split(/(\[[^\]]+\])/g);
    const pairs: { chord: string; text: string }[] = [];
    let currentChord = "";

    parts.forEach((part) => {
      if (part.startsWith("[") && part.endsWith("]")) {
        currentChord = part.slice(1, -1);
      } else {
        pairs.push({ chord: currentChord, text: part });
        currentChord = ""; 
      }
    });

    return (
      <div key={lineIndex} className="flex flex-wrap items-end mb-2 text-lg sm:text-xl">
        {pairs.map((pair, index) => (
          <div key={index} className="flex flex-col">
            <span className="text-blue-400 font-bold h-6 text-base sm:text-lg select-none">
              {pair.chord ? transposeChord(pair.chord) : " "}
            </span>
            <span className="whitespace-pre text-gray-200">{pair.text}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <div className="p-12 text-center text-gray-400">Завантаження пісні...</div>;
  if (!song) return <div className="p-12 text-center text-red-400">Пісню не знайдено в базі даних.</div>;

  return (
    <main className="min-h-screen bg-[#111111] text-white p-4 sm:p-12 font-sans selection:bg-blue-500/30">
      <div className="max-w-2xl mx-auto">
        
        <div className="mb-6 mt-8 sm:mt-0">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">{song.title}</h1>
          <p className="text-gray-400 flex items-center gap-2">
            Автор: <span className="text-white">{song.author}</span> | 
            Тональність: <span className="font-bold text-white bg-gray-800 px-2 py-1 rounded">
              {transposeChord(song.default_key)}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-gray-900/80 p-4 rounded-2xl mb-8 border border-gray-800">
          <span className="text-gray-400 font-medium text-sm sm:text-base mr-2">Транспонування:</span>
          <button onClick={() => setTransposeStep(p => p - 1)} className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-xl font-bold">-1</button>
          <span className="w-8 text-center font-bold text-lg">{transposeStep > 0 ? `+${transposeStep}` : transposeStep}</span>
          <button onClick={() => setTransposeStep(p => p + 1)} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl font-bold shadow-lg">+1</button>
        </div>

        <div className="bg-[#1a1a1a] p-6 sm:p-10 rounded-3xl shadow-2xl leading-relaxed border border-gray-800/50">
          {song.content.split('\n').map((line: string, i: number) => renderLine(line, i))}
        </div>

      </div>
    </main>
  );
}