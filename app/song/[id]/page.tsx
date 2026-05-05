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

  // Список нот: бемоли с маленькой 'b'
  const NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

  useEffect(() => {
    const fetchSong = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("songs")
        .select("*")
        .eq("id", id)
        .single();

      if (data) {
        setSong(data);
      }
      setLoading(false);
    };

    fetchSong();
  }, [id]);

  const handleIncrement = () => setOffset((prev) => prev + 1);
  const handleDecrement = () => setOffset((prev) => prev - 1);
  const handleReset = () => setOffset(0);

  const transposeChord = (chord: string, delta: number) => {
    return chord.replace(/([A-G][b#]?)/g, (match) => {
      // Приводим к стандарту массива (заменяем диезы и возможные BB на Bb)
      let note = match
        .replace("A#", "Bb").replace("C#", "Db").replace("D#", "Eb").replace("F#", "Gb").replace("G#", "Ab")
        .replace("BB", "Bb").replace("DB", "Db").replace("EB", "Eb").replace("GB", "Gb").replace("AB", "Ab");

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
      const transposed = transposeChord(match[1], offset);
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
        <div className="text-blue-400 font-bold whitespace-pre font-mono leading-none">
          {chordLine || " "}
        </div>
        <div className="text-white whitespace-pre font-mono leading-none">
          {textLine || " "}
        </div>
      </div>
    );
  };

  if (loading) return <div className="min-h-screen bg-black text-gray-500 p-10 font-mono text-center uppercase tracking-widest text-xs">Завантаження...</div>;
  if (!song) return <div className="min-h-screen bg-black text-white p-10 font-mono text-center uppercase tracking-widest text-xs">Пісню не знайдено</div>;

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Верхняя навигация */}
        <div className="flex justify-between items-center mb-8">
          <button 
            onClick={() => router.back()} 
            className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
          >
            ← Назад
          </button>
          <Link 
            href={`/edit-song/${song.id}`}
            className="bg-[#1a1d23] hover:bg-gray-700 text-white px-5 py-2 rounded-lg text-sm font-medium border border-gray-800 transition-all shadow-lg"
          >
            ✎ Редагувати
          </Link>
        </div>

        {/* Заголовок */}
        <div className="mb-10">
          <h1 className="text-5xl md:text-7xl font-black mb-3 tracking-tighter uppercase">{song.title}</h1>
          <p className="text-2xl text-gray-500 font-medium">{song.author || "Автор не вказаний"}</p>
        </div>

        {/* Инфо-панели */}
        <div className="flex flex-wrap gap-4 mb-10">
          <div className="bg-[#0a0c10] border border-gray-900 p-4 rounded-2xl min-w-[130px] text-center shadow-md">
            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Тональність</p>
            {/* УБРАН КЛАСС uppercase, чтобы выводилось Bb вместо BB */}
            <p className="text-blue-400 font-black text-xl">
              {song.default_key || "—"}
            </p>
          </div>
          
          <div className="bg-[#0a0c10] border border-gray-900 p-4 rounded-2xl min-w-[130px] text-center shadow-md">
            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Темп</p>
            <p className="font-black text-xl">{song.bpm ? `${song.bpm} BPM` : "—"}</p>
          </div>
          
          <div className="bg-[#0a0c10] border border-gray-900 p-4 rounded-2xl min-w-[130px] text-center shadow-md">
            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Розмір</p>
            <p className="font-black text-xl">{song.timesig || "4/4"}</p>
          </div>
          
          <div className="bg-[#0a0c10] border border-gray-900 p-4 rounded-2xl min-w-[130px] text-center shadow-md">
            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Тривалість</p>
            <p className="font-black text-xl">{song.length || "—"}</p>
          </div>
        </div>

        {/* ПАНЕЛЬ УПРАВЛЕНИЯ */}
        <div className="bg-[#0a0c10] border border-gray-800 rounded-3xl p-6 mb-12 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center gap-10">
            
            <div className="flex-shrink-0">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-4">Транспонувати</p>
              <div className="flex items-center gap-5">
                <button onClick={handleDecrement} className="w-14 h-14 bg-[#1a1d23] hover:bg-gray-700 rounded-xl flex items-center justify-center text-3xl border border-gray-800 transition-all active:scale-95">-</button>
                <span className="text-3xl font-black font-mono w-12 text-center text-blue-400">{offset > 0 ? `+${offset}` : offset}</span>
                <button onClick={handleIncrement} className="w-14 h-14 bg-[#1a1d23] hover:bg-gray-700 rounded-xl flex items-center justify-center text-3xl border border-gray-800 transition-all active:scale-95">+</button>
                <button onClick={handleReset} className="ml-2 text-[10px] text-gray-600 hover:text-white underline uppercase font-bold tracking-tighter">Скинути</button>
              </div>
            </div>

            <div className="flex-1">
              <div className="flex justify-between items-end mb-4">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Прослухати</p>
                {offset !== 0 && (
                  <div className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-md text-[9px] text-orange-500 uppercase font-black tracking-tighter">
                    Звук в оригіналі
                  </div>
                )}
              </div>
              {song.youtube_url ? (
                <YouTubePlayer url={song.youtube_url} isFullWidth={true} offset={offset} />
              ) : (
                <div className="h-16 border border-dashed border-gray-800 rounded-2xl flex items-center justify-center text-gray-700 text-xs uppercase tracking-widest font-bold">YouTube посилання відсутнє</div>
              )}
            </div>

          </div>
        </div>

        {/* Текст песни */}
        <div className="bg-[#050505] p-8 md:p-12 rounded-[40px] border border-gray-900 shadow-inner overflow-x-auto">
          <div className="max-w-none">
            {song.content?.split("\n").map((line: string) => parseLine(line))}
          </div>
        </div>
      </div>
    </div>
  );
}