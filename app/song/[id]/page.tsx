"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import Link from "next/link";

// Бемольная сетка нот (без диезов)
const ALL_NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

export default function SongPage() {
  const params = useParams();
  const [song, setSong] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transposeStep, setTransposeStep] = useState(0);

  useEffect(() => {
    async function fetchSong() {
      try {
        setLoading(true);
        if (!params.id) return;

        const { data, error } = await supabase
          .from("songs")
          .select("*")
          .eq("id", params.id)
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
  }, [params.id]);

  const transposeChord = (chord: string) => {
    if (!chord || chord === "—") return chord;

    // Регулярное выражение ищет основную ноту (A-G) и возможный знак (# или b)
    const match = chord.match(/^([A-G][#b]?)/);
    if (!match) return chord;

    const root = match[1]; 
    const suffix = chord.slice(root.length); // Сохраняем минор, септаккорды и т.д. (m, 7, sus4)

    // Словарь для нормализации (если в базе есть диезы, переводим в бемоли для массива)
    const sharpToFlat: { [key: string]: string } = {
      "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb"
    };

    const normalizedRoot = sharpToFlat[root] || root;
    const index = ALL_NOTES.indexOf(normalizedRoot);

    if (index === -1) return chord;

    // Вычисляем новый индекс с учетом шага транспозиции
    let newIndex = (index + transposeStep) % 12;
    if (newIndex < 0) newIndex += 12;

    return ALL_NOTES[newIndex] + suffix;
  };

  const renderLine = (line: string, lineIndex: number) => {
    // Если строка пустая, возвращаем отступ
    if (!line.trim()) return <div key={lineIndex} className="h-6"></div>;

    // Разбиваем строку по квадратным скобкам: [Am] Текст
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
            {/* Рендерим аккорд синим цветом сверху */}
            <span className="text-blue-400 font-bold h-6 text-base sm:text-lg select-none">
              {pair.chord ? transposeChord(pair.chord) : " "}
            </span>
            {/* Рендерим текст под аккордом */}
            <span className="whitespace-pre text-gray-200">{pair.text}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <div className="p-12 text-center text-gray-400">Завантаження пісні...</div>;
  if (!song) return <div className="p-12 text-center text-red-400">Пісню не знайдено.</div>;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white p-4 sm:p-12 font-sans selection:bg-blue-500/30">
      <div className="max-w-4xl mx-auto">

        <div className="flex justify-between items-center mb-8">
          <Link href="/" className="text-gray-500 hover:text-white transition-colors">
            ← Назад
          </Link>
          <Link 
            href={`/edit-song/${params.id}`}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
          >
            <span>✏️</span> Редагувати
          </Link>
        </div>
        {/* Шапка с названием и автором */}
        <div className="mb-8 mt-4 sm:mt-0">
          <h1 className="text-4xl sm:text-6xl font-extrabold mb-4 tracking-tight">{song.title}</h1>
          <p className="text-xl text-gray-400 font-medium">{song.author}</p>
        </div>

        {/* Карточки с параметрами песни */}
        <div className="flex flex-wrap gap-3 mb-10">
          <div className="bg-gray-900/50 border border-gray-800 px-5 py-3 rounded-2xl">
            <span className="text-gray-500 text-[10px] block uppercase tracking-widest mb-1">Тональність</span>
            <span className="font-bold text-blue-400 text-lg">{transposeChord(song.default_key || "—")}</span>
          </div>
          {song.bpm && (
            <div className="bg-gray-900/50 border border-gray-800 px-5 py-3 rounded-2xl">
              <span className="text-gray-500 text-[10px] block uppercase tracking-widest mb-1">Темп</span>
              <span className="font-bold text-lg">{song.bpm} <small className="text-xs font-normal text-gray-400">BPM</small></span>
            </div>
          )}
          {song.timesig && (
            <div className="bg-gray-900/50 border border-gray-800 px-5 py-3 rounded-2xl">
              <span className="text-gray-500 text-[10px] block uppercase tracking-widest mb-1">Розмір</span>
              <span className="font-bold text-lg">{song.timesig}</span>
            </div>
          )}
          {song.length && (
            <div className="bg-gray-900/50 border border-gray-800 px-5 py-3 rounded-2xl">
              <span className="text-gray-500 text-[10px] block uppercase tracking-widest mb-1">Тривалість</span>
              <span className="font-bold text-lg">{song.length}</span>
            </div>
          )}
        </div>

        {/* Инструменты управления (Транспозиция) */}
        <div className="flex items-center gap-6 bg-blue-600/5 p-5 rounded-3xl mb-10 border border-blue-500/20">
          <div className="flex flex-col">
            <span className="text-blue-200/60 text-xs uppercase font-bold tracking-wider mb-2">Транспонувати</span>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setTransposeStep(p => p - 1)} 
                className="bg-gray-800 hover:bg-gray-700 w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold transition-all active:scale-90"
              >
                –
              </button>
              <span className="w-14 text-center font-mono text-2xl font-bold text-blue-400">
                {transposeStep > 0 ? `+${transposeStep}` : transposeStep}
              </span>
              <button 
                onClick={() => setTransposeStep(p => p + 1)} 
                className="bg-gray-800 hover:bg-gray-700 w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold transition-all active:scale-90"
              >
                +
              </button>
            </div>
          </div>
          <button 
            onClick={() => setTransposeStep(0)} 
            className="ml-auto text-sm font-semibold text-blue-400 hover:text-blue-300 bg-blue-400/10 px-4 py-2 rounded-lg transition-colors"
          >
            Скинути
          </button>
        </div>

        {/* Основной блок с текстом песни */}
        <div className="bg-[#141414] p-6 sm:p-12 rounded-[40px] shadow-2xl border border-white/5 overflow-x-auto ring-1 ring-white/5">
          <div className="min-w-max">
            {song.content.split('\n').map((line: string, i: number) => renderLine(line, i))}
          </div>
        </div>

      </div>
    </main>
  );
}