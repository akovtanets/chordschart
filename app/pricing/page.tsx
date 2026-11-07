"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function PricingPage() {
  const router = useRouter();
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Стейты для Fake Door (Збір лідів)
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const fetchUserStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
        const { data } = await supabase
          .from("profiles")
          .select("is_pro")
          .eq("id", session.user.id)
          .single();
        setIsPro(data?.is_pro || false);
      }
      setLoading(false);
    };
    
    fetchUserStatus();
  }, []);

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Записуємо email у базу Supabase
    await supabase.from("pro_leads").insert([
      { user_id: userId, email: email }
    ]);

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500/30 font-sans pb-20 relative">
      {/* Навигация */}
      <nav className="p-4 md:p-6 flex justify-between items-center max-w-6xl mx-auto">
        <button 
          onClick={() => router.back()} 
          className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
        >
          <span>←</span> <span className="text-sm font-bold uppercase tracking-widest">Назад</span>
        </button>
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
          Chordschart
        </div>
      </nav>

      {/* Заголовок */}
      <div className="text-center mt-10 md:mt-20 mb-16 px-4">
        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-4">
          Інструменти для <br className="md:hidden" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
            справжніх музикантів
          </span>
        </h1>
        <p className="text-gray-400 max-w-xl mx-auto text-sm md:text-base">
          Почніть безкоштовно та переходьте на PRO, коли ваша група буде готова до великих виступів.
        </p>
      </div>

      {/* Карточки тарифов */}
      <div className="max-w-5xl mx-auto px-4 grid md:grid-cols-2 gap-8 items-start">
        
        {/* FREE Карточка */}
        <div className="bg-[#0a0a0a] border border-gray-800 rounded-3xl p-8 transition-transform hover:-translate-y-1">
          <div className="mb-6">
            <h2 className="text-2xl font-black uppercase tracking-widest mb-2">Free</h2>
            <p className="text-gray-500 text-sm">Для індивідуальних репетицій</p>
          </div>
          <div className="mb-8">
            <span className="text-4xl font-black">₴0</span>
            <span className="text-gray-500 text-sm"> / назавжди</span>
          </div>
          <ul className="space-y-4 mb-8">
            <FeatureItem text="Додавання пісень без обмежень" />
            <FeatureItem text="До 4 сетлістів на місяць" />
            <FeatureItem text="Транспонування та каподастр" />
            <FeatureItem text="Вбудований метроном" />
            <FeatureItem text="YouTube та Аудіо плеєр" />
          </ul>
          
          <div className={`block w-full py-4 rounded-xl border text-center font-bold uppercase tracking-widest text-xs transition-colors ${!isPro ? 'border-gray-700 bg-gray-800 text-white' : 'border-gray-800 text-gray-600'}`}>
            {!loading && (!isPro ? "Поточний тариф" : "Базовий тариф")}
          </div>
        </div>

        {/* PRO Карточка */}
        <div className="bg-[#0a0a0a] border-2 border-blue-600 rounded-3xl p-8 relative shadow-[0_0_50px_rgba(37,99,235,0.15)] transition-transform hover:-translate-y-1 scale-100 md:scale-105">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest py-1.5 px-4 rounded-full whitespace-nowrap">
            Вибір професіоналів
          </div>
          
          <div className="mb-6">
            <h2 className="text-2xl font-black uppercase tracking-widest text-blue-400 mb-2">PRO</h2>
            <p className="text-gray-400 text-sm">Для живих виступів та кавер-бендів</p>
          </div>
          <div className="mb-8">
            <span className="text-4xl font-black">₴149</span>
            <span className="text-gray-500 text-sm"> / місяць</span>
          </div>
          <ul className="space-y-4 mb-8">
            <FeatureItem text="Усе з безкоштовного тарифу, плюс:" isProHighlighted />
            <FeatureItem text="Безлімітна кількість сетлістів" isPro />
            <FeatureItem text="Офлайн-режим (Live Mode) для сцени" isPro />
            <FeatureItem text="Спільний доступ до бази для команди" isPro />
            <FeatureItem text="Експорт сетлістів у PDF" isPro />
          </ul>
          
          {!loading && (
            isPro ? (
              <div className="w-full py-4 rounded-xl bg-blue-900/30 border border-blue-500/50 text-blue-400 text-center font-bold uppercase tracking-widest text-xs">
                Ваш поточний тариф
              </div>
            ) : (
              <button 
                onClick={() => setShowLeadModal(true)}
                className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-center font-bold uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)]"
              >
                Оформити підписку
              </button>
            )
          )}
          
          {!isPro && !loading && (
            <p className="text-center text-[10px] text-gray-500 mt-4 uppercase tracking-widest">
              Скасувати можна в будь-який момент
            </p>
          )}
        </div>
      </div>

      {/* FAKE DOOR MODAL */}
      {showLeadModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#0a0a0a] border border-gray-800 rounded-3xl p-6 md:p-8 max-w-md w-full relative shadow-[0_0_40px_rgba(37,99,235,0.15)]">
            <button 
              onClick={() => setShowLeadModal(false)} 
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-900 text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
            >
              ✕
            </button>

            {!isSubmitted ? (
              <>
                <div className="text-center mb-6 mt-2">
                  <div className="inline-block px-3 py-1 bg-blue-900/30 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full mb-4">
                    Ранній доступ
                  </div>
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white mb-2">
                    PRO-версія у розробці
                  </h2>
                  <p className="text-sm text-gray-400">
                    Наразі PRO-функції знаходяться на етапі закритого тестування. Залиште свій email, і ми надішлемо вам запрошення та <span className="text-white font-bold">знижку 50%</span> одразу після релізу.
                  </p>
                </div>

                <form onSubmit={handleLeadSubmit} className="space-y-3">
                  <input 
                    type="email" 
                    required 
                    placeholder="Ваш email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#111] border border-gray-800 rounded-xl p-4 text-sm text-white outline-none focus:border-blue-500 transition-colors"
                  />
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-xl text-center transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                  >
                    {isSubmitting ? "Надсилання..." : "Отримати знижку 50%"}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-blue-900/30 border border-blue-500/30 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-500">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight text-white mb-2">
                  Дякуємо!
                </h2>
                <p className="text-sm text-gray-400 mb-6">
                  Ваш email успішно збережено. Ми зв'яжемося з вами щойно PRO-версія стане доступною.
                </p>
                <button 
                  onClick={() => setShowLeadModal(false)}
                  className="w-full py-4 border border-gray-800 hover:bg-gray-900 text-white font-black text-xs uppercase tracking-widest rounded-xl text-center transition-all"
                >
                  Зрозуміло
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Вспомогательный компонент
function FeatureItem({ text, isPro = false, isProHighlighted = false }: { text: string, isPro?: boolean, isProHighlighted?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <div className={`mt-0.5 ${isPro ? 'text-blue-500' : 'text-gray-600'}`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span className={`text-sm ${isProHighlighted ? 'text-gray-400 font-bold' : (isPro ? 'text-gray-200 font-bold' : 'text-gray-400')}`}>
        {text}
      </span>
    </li>
  );
}