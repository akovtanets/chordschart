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

    const ctx = audioContext.current;
    
    // 1. СТВОРЮЄМО ОСНОВНИЙ ТІК (Pitch Drop)
    const osc = ctx.createOscillator();
    const envelope = ctx.createGain();
    
    const mainFreq = beat === 0 ? 1500 : 1000;
    osc.type = "sine";
    osc.frequency.setValueAtTime(mainFreq, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.02);

    // 2. ДОДАЄМО "КЛАТЦАННЯ" ПАЛИЧКИ (Noise Burst)
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.02, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "highpass";
    noiseFilter.frequency.setValueAtTime(2500, time);

    const noiseEnvelope = ctx.createGain();

    // НАЛАШТУВАННЯ ГУЧНОСТІ
    // Збільшено загальну гучність на 20% та акцент ще на 20%
    const baseGain = 0.6; // Було 0.5 (+20% ≈ 0.6)
    const accentGain = 1.73; // Було 1.2 (+20% загальна ≈ 1.44, потім ще +20% акцент ≈ 1.73)
    
    const currentGain = beat === 0 ? accentGain : baseGain;
    
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(currentGain, time + 0.001);
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

    noiseEnvelope.gain.setValueAtTime(0, time);
    noiseEnvelope.gain.linearRampToValueAtTime(currentGain * 1.8, time + 0.001);
    noiseEnvelope.gain.exponentialRampToValueAtTime(0.001, time + 0.007);

    // КОМУТАЦІЯ
    osc.connect(envelope);
    envelope.connect(ctx.destination);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseEnvelope);
    noiseEnvelope.connect(ctx.destination);

    // ЗАПУСК
    osc.start(time);
    osc.stop(time + 0.04);
    noise.start(time);
    noise.stop(time + 0.04);
  };

  const toggleMetronome = async () => {
    if (!audioContext.current) return;
    if (audioContext.current.state === 'suspended') {
      await audioContext.current.resume();
    }

    if (isPlaying) {
      if (timerID.current) clearTimeout(timerID.current);
      setIsPlaying(false);
    } else {
      beatRef.current = 0;
      nextTickTime.current = audioContext.current.currentTime + 0.1;
      scheduleTick();
      setIsPlaying(true);
    }
  };

  return (
    <div className="flex items-center gap-3 bg-[#0a0c10] border border-gray-800 rounded-full px-4 py-1.5 shadow-2xl print:hidden">
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