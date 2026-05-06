"use client";

import { useState, useEffect, useRef } from "react";

interface MetronomeProps {
  bpm: number;
  timeSignature?: string;
}

export default function Metronome({ bpm, timeSignature = "4/4" }: MetronomeProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContext = useRef<AudioContext | null>(null);
  const nextTickTime = useRef<number>(0);
  const timerID = useRef<NodeJS.Timeout | null>(null);
  const beatRef = useRef<number>(0);

  const beatsPerMeasure = parseInt(timeSignature.split('/')[0]) || 4;

  // Инициализируем контекст заранее, чтобы избежать задержки при первом клике
  useEffect(() => {
    if (typeof window !== "undefined" && !audioContext.current) {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: 'interactive'
      });
    }
    return () => {
      if (timerID.current) clearTimeout(timerID.current);
    };
  }, []);

  const scheduleTick = () => {
    if (!audioContext.current) return;
    
    while (nextTickTime.current < audioContext.current.currentTime + 0.15) {
      playTick(nextTickTime.current, beatRef.current);
      beatRef.current = (beatRef.current + 1) % beatsPerMeasure;
      nextTickTime.current += 60.0 / bpm;
    }
    timerID.current = setTimeout(scheduleTick, 25);
  };

  const playTick = (time: number, beat: number) => {
    if (!audioContext.current) return;

    const osc = audioContext.current.createOscillator();
    const envelope = audioContext.current.createGain();
    const filter = audioContext.current.createBiquadFilter();

    // ВОЗВРАЩАЕМ ПРИЯТНЫЙ ТЕМБР
    const frequency = beat === 0 ? 1000 : 500;
    osc.type = "triangle"; 
    osc.frequency.setValueAtTime(frequency, time);
    osc.frequency.exponentialRampToValueAtTime(10, time + 0.06);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2500, time); // Немного шире фильтр для яркости

    // ГРОМКОСТЬ +20% (1.8 для сильной, 0.7 для слабой)
    const gainValue = beat === 0 ? 1.8 : 0.7;
    
    envelope.gain.setValueAtTime(gainValue, time);
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

    osc.connect(filter);
    filter.connect(envelope);
    envelope.connect(audioContext.current.destination);

    osc.start(time);
    osc.stop(time + 0.06);
  };

  const toggleMetronome = async () => {
    if (!audioContext.current) return;

    // Сначала пробуждаем контекст
    if (audioContext.current.state === 'suspended') {
      await audioContext.current.resume();
    }

    if (isPlaying) {
      if (timerID.current) clearTimeout(timerID.current);
      setIsPlaying(false);
    } else {
      beatRef.current = 0;
      // Даем браузеру 100мс (0.1) на подготовку первого удара
      nextTickTime.current = audioContext.current.currentTime + 0.1;
      scheduleTick();
      setIsPlaying(true);
    }
  };

  return (
    <div className="flex items-center gap-3 bg-[#0a0c10] border border-gray-800 rounded-full px-4 py-1.5 shadow-2xl">
      <div className="flex flex-col">
        <span className="text-[7px] text-blue-500 uppercase font-black tracking-[0.2em] leading-none mb-1">
          {timeSignature}
        </span>
        <span className="text-white font-mono text-[13px] font-bold leading-none">
          {bpm} <span className="text-[9px] text-gray-600">BPM</span>
        </span>
      </div>
      
      <button
        onClick={toggleMetronome}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${
          isPlaying 
          ? "bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]" 
          : "bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.2)]"
        }`}
      >
        {isPlaying ? (
          <div className="w-2.5 h-2.5 bg-white rounded-sm" />
        ) : (
          <svg className="w-3.5 h-3.5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
    </div>
  );
}