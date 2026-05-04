export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      
      {/* Главный блок (Hero) */}
      <div className="text-center py-16 sm:py-24">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6">
          Акорди для <span className="text-blue-500">твого прославлення</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          Українська база християнських пісень. Зберігай сетлісти, транспонуй акорди в один клік та ділися з командою.
        </p>
        
        {/* Строка поиска (пока просто визуал) */}
        <div className="max-w-xl mx-auto relative">
          <input 
            type="text" 
            placeholder="Знайти пісню або автора..." 
            className="w-full bg-gray-900 border border-gray-800 text-white rounded-2xl px-6 py-4 text-lg focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button className="absolute right-3 top-3 bg-blue-600 hover:bg-blue-500 text-white px-6 py-1.5 rounded-xl transition-all">
            Пошук
          </button>
        </div>
      </div>

      {/* Блок с карточками для навигации */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
        
        <a href="/song" className="bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800 hover:border-blue-500/50 transition-all group">
          <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors">Тестова пісня →</h3>
          <p className="text-gray-500 text-sm">Перейти до нашого MVP: текст з акордами та робоче транспонування.</p>
        </a>

        <a href="/setlists" className="bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800 hover:border-blue-500/50 transition-all group">
          <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors">Сетлісти →</h3>
          <p className="text-gray-500 text-sm">Створюйте підбірки пісень для недільного служіння або репетицій.</p>
        </a>

        <a href="/teams" className="bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800 hover:border-blue-500/50 transition-all group">
          <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors">Команди →</h3>
          <p className="text-gray-500 text-sm">Об'єднуйте музикантів, діліться доступом та розподіляйте ролі.</p>
        </a>

      </div>

    </div>
  );
}