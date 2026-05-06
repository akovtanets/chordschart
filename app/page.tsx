import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#161616] text-white flex flex-col">
      
      {/* HERO SECTION З ФОНОМ */}
      <section className="relative h-[65vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-30 shadow-inner"
          style={{ 
            backgroundImage: "url('https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=2000&auto=format&fit=crop')", 
          }}
        />
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/70 via-transparent to-[#161616]" />

        <div className="relative z-20 max-w-4xl">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Створено для прославлення. <br /> 
            <span className="italic font-black text-[#0090ff]">ChordsChart.</span>
          </h1>
          
          <p className="text-[#ccc] text-lg md:text-xl font-light leading-relaxed mb-10 max-w-2xl mx-auto italic">
            Твоя база християнських пісень з акордами. Створюй власні списки, шукай нове та слав Господа разом з нами.
          </p>

          {/* ТВОЇ КНОПКИ ЗІ СТИЛІЗАЦІЄЮ */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/songs" 
              className="w-full sm:w-auto bg-white text-black hover:bg-gray-200 font-black py-4 px-10 rounded-full transition-all active:scale-95 text-[12px] tracking-[0.2em] uppercase text-center shadow-xl"
            >
              Знайти пісню
            </Link>
            
            <Link 
              href="/add-song" 
              className="w-full sm:w-auto bg-[#0090ff] hover:bg-[#33a5ff] text-white font-black py-4 px-10 rounded-full transition-all active:scale-95 text-[12px] tracking-[0.2em] uppercase text-center shadow-[0_0_20px_rgba(0,144,255,0.3)]"
            >
              Додати свою
            </Link>
          </div>
        </div>
      </section>

      {/* БЛОКИ ПЕРЕВАГ */}
      <section className="bg-[#161616] py-20 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-[#222] p-12 rounded-lg flex flex-col items-center text-center transition-transform hover:-translate-y-1 border border-white/5">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
            </div>
            <h3 className="text-xl font-bold mb-4 uppercase tracking-tighter">Впевнене виконання</h3>
            <p className="text-[#888] text-sm leading-relaxed">
              Отримуйте точні акорди з правильним форматуванням бемолів для професійного звучання.
            </p>
          </div>

          <div className="bg-[#222] p-12 rounded-lg flex flex-col items-center text-center transition-transform hover:-translate-y-1 shadow-2xl border border-white/5">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            </div>
            <h3 className="text-xl font-bold mb-4 uppercase tracking-tighter">Свобода на сцені</h3>
            <p className="text-[#888] text-sm leading-relaxed">
              Керуйте своїми сетлістами в реальному часі, змінюйте тональність прямо під час прославлення.
            </p>
          </div>

          <div className="bg-[#222] p-12 rounded-lg flex flex-col items-center text-center transition-transform hover:-translate-y-1 border border-white/5">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </div>
            <h3 className="text-xl font-bold mb-4 uppercase tracking-tighter">Почни зараз</h3>
            <p className="text-[#888] text-sm leading-relaxed">
              Додавайте власні пісні або імпортуйте готові тексти — ChordsChart зробить решту за вас.
            </p>
          </div>

        </div>
      </section>

      <footer className="py-10 text-center text-[10px] text-[#444] uppercase tracking-[0.5em] font-bold">
        Experience the power of praise
      </footer>
    </div>
  );
}