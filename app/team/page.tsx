"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const ROLE_NAMES: Record<string, string> = {
  leader: "Лідер",
  vocalist: "Вокаліст",
  musician: "Музикант",
  sound_engineer: "Звукорежисер"
};

export default function TeamPage() {
  // Стани списку команд
  const [userTeams, setUserTeams] = useState<any[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [isTeamSelectorOpen, setIsTeamSelectorOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  const [team, setTeam] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Стани створення/редагування
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);

  const [searchEmail, setSearchEmail] = useState("");
  const [foundUser, setFoundUser] = useState<{id: string, email: string} | null>(null);
  const [selectedRole, setSelectedRole] = useState("musician"); 
  const [inviteStatus, setInviteStatus] = useState("");
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  // Закриття селектора команд при кліку зовні
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setIsTeamSelectorOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. Завантажуємо ВСІ команди користувача
  useEffect(() => {
    fetchAllUserTeams();
  }, []);

  async function fetchAllUserTeams(newTeamIdToSelect?: string) {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const currentUserId = session.user.id;
      setUserId(currentUserId);

      // Шукаємо команди, де юзер - власник
      const { data: ownedTeams } = await supabase
        .from("teams")
        .select("*")
        .eq("owner_id", currentUserId);

      // Шукаємо команди, де юзер - учасник
      const { data: memberTeamsRaw } = await supabase
        .from("team_members")
        .select("team_id, teams(*)")
        .eq("user_id", currentUserId);

      // Об'єднуємо та прибираємо дублікати
      const allTeamsMap = new Map();
      ownedTeams?.forEach(t => allTeamsMap.set(t.id, t));
      memberTeamsRaw?.forEach(m => { 
        const teamData = Array.isArray(m.teams) ? m.teams[0] : m.teams;
        if (teamData) allTeamsMap.set(teamData.id, teamData); 
      });
      
      const allTeams = Array.from(allTeamsMap.values());
      setUserTeams(allTeams);

      if (allTeams.length > 0) {
        // Якщо передали ID нової команди - вибираємо її, інакше першу зі списку
        if (newTeamIdToSelect) {
          setActiveTeamId(newTeamIdToSelect);
        } else if (!activeTeamId) {
          setActiveTeamId(allTeams[0].id);
        }
      } else {
        setTeam(null);
        setActiveTeamId(null);
      }
    } catch (err) {
      console.error("Fetch teams error:", err);
    } finally {
      setLoading(false);
    }
  }

  // 2. Завантажуємо учасників КОНКРЕТНОЇ активної команди
  useEffect(() => {
    if (activeTeamId) {
      fetchTeamMembers(activeTeamId);
      const active = userTeams.find(t => t.id === activeTeamId);
      setTeam(active || null);
    }
  }, [activeTeamId, userTeams]);

  async function fetchTeamMembers(tId: string) {
    try {
      const { data: allMembers } = await supabase
        .from("team_members_with_emails")
        .select("*")
        .eq("team_id", tId);
      setMembers(allMembers || []);
    } catch (err) {
      console.error("Fetch members error:", err);
    }
  }

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const { data, error } = await supabase.from("team_members").update({ role: newRole }).eq("id", memberId).select();
      if (error) throw error;
      if (!data || data.length === 0) return alert("Помилка доступу. Ви не маєте прав змінювати ролі.");
      
      setEditingMemberId(null);
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    } catch (err: any) { alert("Помилка: " + err.message); }
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim() || !userId) return;
    setCreatingTeam(true);
    try {
      const { data: newTeam, error: tErr } = await supabase.from("teams").insert({ name: teamName.trim(), owner_id: userId }).select().single();
      if (tErr) throw tErr;

      const { error: mErr } = await supabase.from("team_members").insert({ team_id: newTeam.id, user_id: userId, role: 'leader' });
      if (mErr) throw mErr;

      setTeamName("");
      setIsCreateModalOpen(false);
      // Оновлюємо список і відразу перемикаємось на нову команду
      await fetchAllUserTeams(newTeam.id);
    } catch (err: any) { alert("Не вдалося створити: " + err.message); } 
    finally { setCreatingTeam(false); }
  };

  const handleSearchUser = async () => {
    if (!searchEmail.includes("@")) return;
    setInviteStatus("Пошук...");
    const { data } = await supabase.rpc('get_user_id_by_email', { email_search: searchEmail.trim().toLowerCase() });
    if (data && data.length > 0) {
      setFoundUser(data[0]); setInviteStatus("");
    } else {
      setFoundUser(null); setInviteStatus("Не знайдено");
    }
  };

  const handleInviteUser = async () => {
    if (!foundUser || !team) return;
    const { error } = await supabase.from("team_members").insert({ team_id: team.id, user_id: foundUser.id, role: selectedRole });
    if (error) {
      setInviteStatus("Вже в команді або помилка");
    } else {
      setInviteStatus("Додано!"); setFoundUser(null); setSearchEmail("");
      await fetchTeamMembers(team.id);
    }
  };

  if (loading && userTeams.length === 0) return <div className="min-h-screen bg-black flex items-center justify-center text-blue-500 font-mono text-xs uppercase tracking-[0.3em]">Завантаження...</div>;

  const isOwner = team?.owner_id === userId;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 font-sans relative">
      <div className="max-w-[1100px] mx-auto">
        
        <header className="mb-12 border-b border-gray-900 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <Link href="/" className="text-gray-600 hover:text-white mb-6 block text-[10px] uppercase tracking-widest font-black transition-all w-max">← Назад</Link>
            <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none">Команда</h1>
          </div>
          
          <div className="flex flex-col md:items-end gap-3">
            {/* СЕЛЕКТОР КОМАНД */}
            {userTeams.length > 0 && (
              <div className="relative" ref={selectorRef}>
                <button 
                  onClick={() => setIsTeamSelectorOpen(!isTeamSelectorOpen)}
                  className="flex items-center gap-2 text-blue-500 font-black uppercase italic text-2xl md:text-3xl tracking-tighter hover:opacity-80 transition-opacity"
                >
                  {team?.name}
                  {userTeams.length > 1 && (
                    <svg className={`w-5 h-5 transition-transform ${isTeamSelectorOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                  )}
                </button>

                {isTeamSelectorOpen && userTeams.length > 1 && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-[#0d0d0d] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden z-50">
                    <div className="p-2">
                      <p className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-600">Ваші команди</p>
                      {userTeams.map(t => (
                        <button 
                          key={t.id}
                          onClick={() => { setActiveTeamId(t.id); setIsTeamSelectorOpen(false); }}
                          className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold italic uppercase tracking-wider transition-all ${t.id === activeTeamId ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-[#151515] hover:text-white'}`}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-white text-black px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-500 hover:text-white transition-all active:scale-95 shadow-lg w-max"
            >
              Створити гурт
            </button>
          </div>
        </header>

        {/* Якщо немає команд */}
        {userTeams.length === 0 ? (
          <div className="bg-[#0a0c10] border border-gray-900 rounded-[40px] p-10 md:p-20 text-center shadow-2xl animate-in fade-in zoom-in-95">
            <h2 className="text-3xl font-black uppercase italic mb-4">У вас ще немає гурту</h2>
            <p className="text-gray-500 max-w-sm mx-auto text-sm italic">Натисніть кнопку "Створити гурт" у правому верхньому куті, щоб розпочати спільну роботу.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className={`${isOwner ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6`}>
              <div className="bg-[#0a0c10] border border-gray-900 rounded-[32px] p-8 shadow-xl">
                <div className="flex justify-between items-center mb-10">
                  <h3 className="text-blue-500 text-[10px] font-black uppercase tracking-[0.4em] italic">Склад команди</h3>
                  <span className="text-[10px] bg-gray-900 text-gray-500 px-3 py-1 rounded-full font-bold uppercase border border-gray-800">{members.length} Чоловік</span>
                </div>
                <div className="grid gap-3">
                  {members.map((m) => {
                    const roleDisplayName = ROLE_NAMES[m.role] || m.role;
                    return (
                      <div key={m.id} className="group flex items-center justify-between p-5 bg-black/40 border border-gray-900/50 rounded-[24px] hover:border-gray-700 transition-all">
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs border ${m.role === 'leader' ? 'bg-blue-600/10 border-blue-500/30 text-blue-500' : 'bg-gray-900 border-gray-800 text-gray-400'}`}>
                            {roleDisplayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[14px] text-white font-bold mb-1">{m.email}</p>
                            {editingMemberId === m.id && isOwner ? (
                              <select 
                                autoFocus
                                value={m.role}
                                onChange={(e) => handleUpdateRole(m.id, e.target.value)}
                                onBlur={() => setEditingMemberId(null)}
                                className="bg-blue-600 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg outline-none cursor-pointer"
                              >
                                <option value="leader">Лідер</option>
                                <option value="vocalist">Вокаліст</option>
                                <option value="musician">Музикант</option>
                                <option value="sound_engineer">Звукорежисер</option>
                              </select>
                            ) : (
                              <button 
                                onClick={() => { if (isOwner && m.user_id !== userId) setEditingMemberId(m.id); }}
                                className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border transition-all ${(!isOwner || m.user_id === userId) ? 'bg-gray-900/40 border-gray-800/50 text-gray-600 cursor-default' : 'bg-gray-900 border-gray-800 text-blue-400 hover:border-blue-500 hover:text-white'}`}
                              >
                                {roleDisplayName} {(isOwner && m.user_id !== userId) && ' ✎'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {isOwner && (
              <div className="space-y-6">
                <div className="bg-[#0a0c10] border border-gray-900 rounded-[32px] p-8 shadow-xl">
                  <h3 className="text-white text-[10px] font-black uppercase tracking-[0.2em] mb-8 italic">Додати учасника</h3>
                  <div className="space-y-5">
                    <div className="relative">
                      <input type="email" placeholder="Email" value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} className="w-full bg-black border border-gray-800 rounded-2xl px-5 py-4 text-xs outline-none focus:border-blue-500 transition-all font-medium text-white" />
                      <button onClick={handleSearchUser} className="absolute right-2 top-2 bg-gray-900 hover:bg-gray-800 text-[9px] font-black px-4 py-2.5 rounded-xl transition-all">ШУКАТИ</button>
                    </div>
                    {foundUser && (
                      <div className="p-6 bg-blue-600/5 border border-blue-500/20 rounded-[24px] space-y-5 animate-in fade-in zoom-in-95 shadow-inner text-center">
                        <p className="text-xs font-bold text-white truncate">{foundUser.email}</p>
                        <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none text-center cursor-pointer text-white">
                          <option value="leader">Лідер</option>
                          <option value="vocalist">Вокаліст</option>
                          <option value="musician">Музикант</option>
                          <option value="sound_engineer">Звукорежисер</option>
                        </select>
                        <button onClick={handleInviteUser} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg">Додати</button>
                      </div>
                    )}
                    {inviteStatus && <div className="text-center py-2"><span className="text-[9px] uppercase font-black tracking-[0.2em] text-blue-500 animate-pulse">{inviteStatus}</span></div>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Модальне вікно створення команди */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-[#0d0d0d] border border-gray-800 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
              <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                <h2 className="text-lg font-black uppercase tracking-widest text-white italic">Створити гурт</h2>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-500 hover:text-white text-2xl leading-none">×</button>
              </div>
              <div className="p-6 space-y-6">
                <p className="text-gray-400 text-xs italic">Створіть нову команду, щоб керувати музикантами та ділитися сетлістами.</p>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Назва команди</label>
                  <input 
                    type="text" 
                    value={teamName} 
                    onChange={e => setTeamName(e.target.value)} 
                    placeholder="Worship Team..." 
                    className="w-full bg-[#111] border border-gray-800 rounded-xl p-4 text-sm text-white focus:border-blue-500 outline-none" 
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-4 rounded-xl border border-gray-800 text-gray-400 font-bold text-xs uppercase tracking-widest hover:bg-[#111] transition-all">Скасувати</button>
                  <button 
                    onClick={handleCreateTeam} 
                    disabled={creatingTeam || !teamName.trim()} 
                    className="flex-1 py-4 rounded-xl bg-blue-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-blue-500 transition-all disabled:opacity-50"
                  >
                    {creatingTeam ? 'Створення...' : 'Створити'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}