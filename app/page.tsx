"use client";

import { useState } from "react";

// Массив всех нот для математики транспонирования
const ALL_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Наш тестовый текст песни с аккордами в скобках
const SONG_TEXT = `[Em]Ти благий, і [C]милість Твоя
[G]Навіки, [D]навіки.
[Em]Славимо [C]Твоє Ім'я,
[G]Навіки, [D]навіки.

[Em]Бог могутній, [C]Ти зі мною,
[G]Твоя любов [D]як ріка.
[Em]В Тобі маю [C]я надію,
[G]Скеля моя [D]Ти міцна.`;

export default function SongPage() {
  const [transposeStep, setTransposeStep] = useState(0);

  // Функция для сдвига аккорда
  const transposeChord = (chord: string) => {
    // Находим основную ноту аккорда (например, "C#" из "C#m")
    const match = chord.match(/^[A-G]#?/);
    if (!match) return chord;

    const root = match[0];
    const suffix = chord.slice(root.length); // Окончание аккорда (m, 7, sus4 и т.д.)

    const index = ALL_NOTES.indexOf(root);
    if (index === -1) return chord;

    // Считаем новую ноту (с учетом перехода через край массива)
    let newIndex = (index + transposeStep) % 12;
    if (newIndex < 0) newIndex += 12;

    return ALL_NOTES[newIndex] + suffix;
  };

  // Функция для рендеринга строки текста с аккордами над словами
  const renderLine = (line: string, lineIndex: number) => {
    if (!line.trim()) return <div key={lineIndex} className="h-6"></div>; // Пустая строка

    // Разбиваем строку по аккордам
    const parts = line.split(/(\[[^\]]+\])/g);
    const pairs = [];
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

  return (
    <main className="min-h-screen bg-[#111111] text-white p-4 sm:p-12 font-sans selection:bg-blue-500/30">
      <div className="max-w-2xl mx-auto">
        
        {/* Шапка */}
        <div className="mb-6 mt-8 sm:mt-0">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Ти благий</h1>
          <p className="text-gray-400 flex items-center gap-2">
            Тональність: <span className="font-bold text-white bg-gray-800 px-2 py-1 rounded">{transposeChord("Em")}</span>
          </p>
        </div>

        {/* Панель управления транспонированием */}
        <div className="flex flex-wrap items-center gap-3 bg-gray-900/80 p-4 rounded-2xl mb-8 border border-gray-800 shadow-lg">
          <span className="text-gray-400 font-medium text-sm sm:text-base mr-2">Транспонування:</span>
          
          <button 
            onClick={() => setTransposeStep((prev) => prev - 1)}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl transition-all active:scale-95 font-bold"
          >
            -1
          </button>
          
          <span className="w-8 text-center font-bold text-lg">
            {transposeStep > 0 ? `+${transposeStep}` : transposeStep}
          </span>
          
          <button 
            onClick={() => setTransposeStep((prev) => prev + 1)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl transition-all active:scale-95 font-bold shadow-[0_0_15px_rgba(37,99,235,0.3)]"
          >
            +1
          </button>
        </div>

        {/* Текст песни */}
        <div className="bg-[#1a1a1a] p-6 sm:p-10 rounded-3xl shadow-2xl leading-relaxed border border-gray-800/50">
          {SONG_TEXT.split('\n').map((line, i) => renderLine(line, i))}
        </div>

      </div>
    </main>
  );
}