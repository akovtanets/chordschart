"use client";

import { useState, useEffect, useMemo, Suspense, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

function SetlistsListContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dateParam = searchParams.get("date");

  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Зберігаємо список всіх команд, де користувач має право шарити сетлісти (leader або admin)
  const [userAdminTeams, setUserAdminTeams] = useState<any[]>([]);
  
  // Стан для випадаючого меню шарингу (який сетліст зараз відкритий)
  const [openShareMenuId, setOpenShareMenuId] = useState<string | null>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  const initialDate = dateParam ? new Date(dateParam) : new Date();
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [currentMonth, setCurrentMonth] = useState(initialDate);

  // Закриття меню шарингу при кліку зовні
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setOpenShareMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchLists = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id || null;
    setUserId(currentUserId);

    if (!currentUserId) return;

    // 1. Отримуємо команди, де користувач має право поширювати сетлісти
    const { data: adminMemberships } = await supabase
      .from("team_members")
      .select("team_id, teams(*)")
      .eq("user_id", currentUserId)
      .in('role', ['admin', 'leader']); // Шукаємо і admin, і leader про всяк випадок
    
    if (adminMemberships) {
      // Витягуємо самі об'єкти команд
      const teams = adminMemberships.map(m => Array.isArray(m.teams) ? m.teams[0] : m.teams).filter(Boolean);
      setUserAdminTeams(teams);
    }

    // 2. Отримуємо всі команди користувача для фільтрації сетлістів (щоб бачити чужі шарені сетлісти)
    const { data: allMemberships } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", currentUserId);
    
    const teamIds = allMemberships?.map(m => m.team_id) || [];

    // 3. Формуємо запит на сетлісти
    let query = supabase.from("setlists").select("*");

    if (teamIds.length > 0) {
      query = query.or(`user_id.eq.${currentUserId},and(is_team_shared.eq.true,team_id.in.(${teamIds.join(',')}))`);
    } else {
      query = query.eq("user_id", currentUserId);
    }

    const { data } = await query.order("created_at", { ascending: false });
    if (data) setLists(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLists();
  }, []);

  // Оновлена функція поширення (тепер приймає конкретний ID команди або null для приватного)
  const handleShareChange = async (e: React.MouseEvent, listId: string, teamId: string | null) => {
    e.preventDefault();
    e.stopPropagation();

    const isShared = teamId !== null;

    const { error } = await supabase
      .from("setlists")
      .update({ 
        is_team_shared: isShared,
        team_id: teamId 
      })
      .eq("id", listId);

    if (!error) {
      setLists(prev => prev.map(l => 
        l.id === listId ? { ...l, is_team_shared: isShared, team_id: teamId } : l
      ));
    }
    setOpenShareMenuId(null); // Закриваємо меню після вибору
  };

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
          {hasEvents && <div className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-50'}`}></div>}
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
              filteredLists.map((list: any) => {
                const isMyList = list.user_id === userId;
                const isShared = list.is_team_shared;
                // Знаходимо назву команди, з якою пошарено
                const sharedTeam = userAdminTeams.find(t => t.id === list.team_id);

                return (
                  <div key={list.id} className="relative group">
                    <Link 
                      href={`/setlist/${list.id}`} 
                      className="flex bg-[#0d0d0d] border border-gray-800 p-6 rounded-[30px] hover:border-blue-500 transition-all duration-300"
                    >
                      <div className="flex justify-between items-center w-full">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h2 className="text-2xl font-bold group-hover:text-blue-400 transition-colors uppercase italic tracking-tighter">{list.title}</h2>
                            {!isMyList && (
                              <span className="px-2 py-0.5 bg-blue-600/10 border border-blue-500/30 text-blue-500 text-[8px] font-black uppercase tracking-tighter rounded-md">Від команди</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[10px] font-black uppercase text-gray-500 tracking-widest">
                            <span>{list.song_ids?.length || 0} пісень</span>
                            <span className="font-mono text-gray-700 normal-case italic">{new Date(list.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          
                          {/* БЛОК ШАРИНГУ */}
                          {isMyList && userAdminTeams.length > 0 && (
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setOpenShareMenuId(openShareMenuId === list.id ? null : list.id);
                                }}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                                  isShared 
                                  ? 'bg-blue-600/10 border-blue-500/40 text-blue-400' 
                                  : 'bg-black border-gray-800 text-gray-600 hover:border-gray-600'
                                }`}
                              >
                                <div className={`w-2 h-2 rounded-full ${isShared ? 'bg-blue-500 animate-pulse' : 'bg-gray-800'}`}></div>
                                <span className="text-[9px] font-black uppercase tracking-widest">
                                  {isShared ? (sharedTeam?.name || 'Спільний') : 'Приватний'}
                                </span>
                              </button>

                              {/* ВИПАДАЮЧЕ МЕНЮ ШАРИНГУ */}
                              {openShareMenuId === list.id && (
                                <div ref={shareMenuRef} className="absolute right-0 top-full mt-2 w-48 bg-[#111] border border-gray-800 rounded-2xl shadow-2xl py-2 z-50">
                                  <div className="px-3 py-2 border-b border-gray-800 mb-1">
                                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-500">Доступ</span>
                                  </div>
                                  
                                  {/* Опція "Приватний" */}
                                  <button
                                    onClick={(e) => handleShareChange(e, list.id, null)}
                                    className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-between ${!isShared ? 'text-blue-500 bg-blue-600/10' : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'}`}
                                  >
                                    Лише я
                                    {!isShared && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                                  </button>

                                  {/* Список команд */}
                                  {userAdminTeams.map(t => (
                                    <button
                                      key={t.id}
                                      onClick={(e) => handleShareChange(e, list.id, t.id)}
                                      className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-between ${isShared && list.team_id === t.id ? 'text-blue-500 bg-blue-600/10' : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'}`}
                                    >
                                      {t.name}
                                      {isShared && list.team_id === t.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="w-10 h-10 rounded-full border border-gray-800 flex items-center justify-center group-hover:bg-blue-600 group-hover:border-blue-600 transition-all shadow-lg">
                            <svg className="w-4 h-4 text-gray-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })
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