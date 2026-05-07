"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function SetlistsListContent() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");

  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const initialDate = dateParam ? new Date(dateParam) : new Date();
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [currentMonth, setCurrentMonth] = useState(initialDate);

  useEffect(() => {
    async function fetchLists() {
      const { data } = await supabase
        .from("setlists")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setLists(data);
      setLoading(false);
    }
    fetchLists();
  }, []);

  const filteredLists = useMemo(() => {
    return lists.filter((list: any) => {
      const d = new Date(list.created_at);
      return d.toDateString() === selectedDate.toDateString();
    });
  }, [lists, selectedDate]);

  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date: Date) => {
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const renderCalendar = () => {
    const days = [];
    const totalDays = daysInMonth(currentMonth);
    const startDay = firstDayOfMonth(currentMonth);

    for (let i = 0; i < startDay; i++) days.push(<div key={`empty-${i}`} className="h-10"></div>);

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const isSelected = date.toDateString() === selectedDate.toDateString();
      const isToday = date.toDateString() === new Date().toDateString();
      const hasEvents = lists.some((l: any) => new Date(l.created_at).toDateString() === date.toDateString());

      days.push(
        <button
          key={day}
          onClick={() => setSelectedDate(date)}
          className={`h-10 w-10 relative flex flex-col items-center justify-center rounded-xl text-xs transition-all
            ${isSelected ? 'bg-blue-600 text-white font-bold' : 'hover:bg-gray-800 text-gray-400'}
            ${isToday && !isSelected ? 'border border-blue-500/50 text-blue-400' : ''}`}
        >
          {day}
          {hasEvents && <div className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`}></div>}
        </button>
      );
    }
    return days;
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center font-mono text-[10px] text-gray-700 uppercase tracking-widest">Синхронізація...</div>;

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-12">
        <aside className="w-full md:w-[300px] flex-shrink-0">
          <div className="bg-[#0d0d0d] border border-gray-800 p-6 rounded-[30px] sticky top-12 shadow-2xl">
            <div className="flex justify-between items-center mb-6 px-1">
              <h3 className="font-bold text-sm uppercase italic">
                {currentMonth.toLocaleString('uk-UA', { month: 'long', year: 'numeric' })}
              </h3>
              <div className="flex gap-1 text-gray-500">
                <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-1 hover:text-white transition">←</button>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-1 hover:text-white transition">→</button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-2 font-black text-[9px] text-gray-600 uppercase">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map(d => <span key={d}>{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>
            <button onClick={() => { setSelectedDate(new Date()); setCurrentMonth(new Date()); }} className="w-full mt-6 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 hover:text-white transition-colors">Сьогодні</button>
          </div>
        </aside>

        <section className="flex-1">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h1 className="text-4xl font-bold tracking-tight uppercase italic leading-none">Сет-листи</h1>
              <p className="text-blue-500 text-[10px] uppercase mt-2 tracking-widest font-black">
                {selectedDate.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <Link href="/create-setlist" className="bg-white text-black px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all">+ Створити</Link>
          </div>

          <div className="grid gap-4">
            {filteredLists.length > 0 ? (
              filteredLists.map((list: any) => (
                <Link 
                  key={list.id} 
                  href={`/setlist/${list.id}`} 
                  prefetch={false} // Вимикаємо префетч для економії ресурсів сервера
                  className="group bg-[#0d0d0d] border border-gray-800 p-6 rounded-[30px] hover:border-blue-500 transition-all duration-300"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-bold group-hover:text-blue-400 transition-colors uppercase italic tracking-tighter">{list.title}</h2>
                      <div className="flex items-center gap-3 mt-1 text-[10px] font-black uppercase text-gray-500 tracking-widest">
                        <span>{list.song_ids?.length || 0} пісень</span>
                        <span className="font-mono text-gray-700 normal-case italic">{new Date(list.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full border border-gray-800 flex items-center justify-center group-hover:bg-blue-600 group-hover:border-blue-600 transition-all"><svg className="w-4 h-4 text-gray-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg></div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="py-32 text-center border border-dashed border-gray-900 rounded-[40px] opacity-40 font-mono text-[10px] uppercase tracking-widest">Подій не заплановано</div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function SetlistsListPage() {
  return (
    <Suspense fallback={<div className="bg-black h-screen" />}>
      <SetlistsListContent />
    </Suspense>
  );
}