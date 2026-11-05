"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ProModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string; // Назва функції, на яку натиснув користувач
}

export default function ProModal({ isOpen, onClose, featureName }: ProModalProps) {
  // Блокуємо скролл сторінки, коли модалка відкрита
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#0a0a0a] border border-gray-800 rounded-3xl p-6 md:p-8 max-w-md w-full relative shadow-[0_0_40px_rgba(37,99,235,0.15)]">
        
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-900 text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
        >
          ✕
        </button>

        <div className="text-center mb-6 mt-2">
          <div className="inline-block px-3 py-1 bg-blue-900/30 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full mb-4">
            PRO Версія
          </div>
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white mb-2">
            {featureName ? `${featureName} доступно в PRO` : "Відкрий всі можливості PRO"}
          </h2>
          <p className="text-sm text-gray-400">
            Оформіть підписку, щоб зняти ліміти та отримати інструменти для професійних музикантів.
          </p>
        </div>

        <div className="space-y-3 mb-8">
          {[
            "Необмежена кількість сетлістів",
            "Офлайн-режим для безпеки на сцені",
            "Спільний доступ для команди",
            "Експорт сетлістів у PDF"
          ].map((feature, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="mt-0.5 text-blue-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-300">{feature}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <Link 
            href="/pricing" 
            onClick={onClose}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs md:text-sm uppercase tracking-widest rounded-xl text-center transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] hover:-translate-y-0.5"
          >
            Переглянути тарифи
          </Link>
          <button 
            onClick={onClose}
            className="w-full py-3 bg-transparent text-gray-500 hover:text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-colors"
          >
            Можливо пізніше
          </button>
        </div>
      </div>
    </div>
  );
}