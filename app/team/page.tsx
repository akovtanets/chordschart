"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function TeamPage() {
  const [team, setTeam] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  
  const [searchEmail, setSearchEmail] = useState("");
  const [foundUser, setFoundUser] = useState<{id: string, email: string} | null>(null);
  const [selectedRole, setSelectedRole] = useState("musician");
  const [inviteStatus, setInviteStatus] = useState("");
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  useEffect(() => {
    fetchTeamData();
  }, []);

  async function fetchTeamData() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const currentUserId = session.user.id;
      setUserId(currentUserId);

      // 1. Шукаємо команду, де ви є власником
      const { data: ownedTeam } = await supabase
        .from("teams")
        .select("*")
        .eq("owner_id", currentUserId)
        .maybeSingle();

      let activeTeam = ownedTeam;
      let teamId = ownedTeam?.id;

      // 2. Якщо не власник, шукаємо через таблицю учасників
      if (!activeTeam) {
        const { data: membership } = await supabase
          .from("team_members")
          .select("team_id, teams(*)")
          .eq("user_id", currentUserId)
          .maybeSingle();
        
        if (membership) {
          activeTeam = membership.teams;
          teamId = membership.team_id;
        }
      }

      if (activeTeam && teamId) {
        setTeam(activeTeam);
        // 3. Завантажуємо всіх учасників через View з Email
        const { data: allMembers } = await supabase
          .from("team_members_with_emails")
          .select("*")
          .eq("team_id", teamId);
        
        setMembers(allMembers || []);
      } else {
        setTeam(null);
        setMembers([]);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const { data, error } = await supabase
        .from("team_members")
        .update({ role: newRole })
        .eq("id", memberId)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        alert("Помилка доступу RLS. Перевірте політики в Supabase.");
        return;
      }

      setEditingMemberId(null);
      // Миттєве локальне оновлення
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    } catch (err: any) {
      alert("Помилка: " + err.message);
    }
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim() || !userId) return;
    setLoading(true);
    try {
      // 1. Створюємо команду
      const { data: newTeam, error: tErr } = await supabase
        .from("teams")
        .insert({ name: teamName.trim(), owner_id: userId })
        .select()
        .single();

      if (tErr) throw tErr;

      // 2. Додаємо себе як адміна
      const { error: mErr } = await supabase
        .from("team_members")
        .insert({ team_id: newTeam.id, user_id: userId, role: 'admin' });

      if (mErr) throw mErr;

      await fetchTeamData();
    } catch (err: any) {
      alert("Не вдалося створити: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchUser = async () => {
    if (!searchEmail.includes("@")) return;
    setInviteStatus("Пошук...");
    const { data } = await supabase.rpc('get_user_id_by_email', { email_search: searchEmail.trim().toLowerCase() });
    if (data && data.length > 0) {
      setFoundUser(data[0]);
      setInviteStatus("");
    } else {
      setFoundUser(null);
      setInviteStatus("Не знайдено");
    }
  };

  const handleInviteUser = async () => {
    if (!foundUser || !team) return;
    const { error } = await supabase
      .from("team_members")
      .insert({ team_id: team.id, user_id: foundUser.id, role: selectedRole });

    if (error) {
      setInviteStatus("Вже в команді або помилка");
    } else {
      setInviteStatus("Додано!");
      setFoundUser(null);
      setSearchEmail("");
      await fetchTeamData();
    }
  };

  if (loading && !team) return <div className="min-h-screen bg-black flex items-center justify-center text-blue-500 font-mono text-xs uppercase tracking-[0.3em]">Завантаження...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 font-sans">
      <div className="max-w-[1100px] mx-auto">
        
        <header className="mb-12 border-b border-gray-900 pb-8 flex justify-between items-end">
          <div>
            <Link href="/" className="text-gray-600 hover:text-white mb-6 block text-[10px] uppercase tracking-widest font-black transition-all">← Назад</Link>
            <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none">Команда</h1>
          </div>
          {team && (
            <div className="text-right">
              <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest mb-1 italic">Active Group</p>
              <p className="text-blue-500 font-black uppercase italic text-2xl md:text-3xl tracking-tighter">{team.name}</p>
            </div>
          )}
        </header>

        {!team ? (
          <div className="bg-[#0a0c10] border border-gray-900 rounded-[40px] p-10 md:p-20 text-center shadow-2xl animate-in fade-in zoom-in-95">
            <h2 className="text-3xl font-black uppercase italic mb-4">Створіть свій гурт</h2>
            <p className="text-gray-500 mb-10 max-w-sm mx-auto text-sm italic">Керуйте складом музикантів та вокалістів разом.</p>
            <div className="flex flex-col md:flex-row gap-4 max-w-md mx-auto">
              <input 
                type="text" 
                placeholder="Назва команди" 
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="flex-1 bg-black border border-gray-800 rounded-2xl px-6 py-4 outline-none focus:border-blue-500 transition-all font-bold text-white shadow-inner"
              />
              <button 
                onClick={handleCreateTeam}
                className="bg-white text-black px-10 py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-blue-500 hover:text-white transition-all active:scale-95 shadow-lg"
              >
                Створити
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[#0a0c10] border border-gray-900 rounded-[32px] p-8 shadow-xl">
                <div className="flex justify-between items-center mb-10">
                  <h3 className="text-blue-500 text-[10px] font-black uppercase tracking-[0.4em] italic">Склад команди</h3>
                  <span className="text-[10px] bg-gray-900 text-gray-500 px-3 py-1 rounded-full font-bold uppercase border border-gray-800">{members.length} Чоловік</span>
                </div>
                <div className="grid gap-3">
                  {members.map((m) => (
                    <div key={m.id} className="group flex items-center justify-between p-5 bg-black/40 border border-gray-900/50 rounded-[24px] hover:border-gray-700 transition-all">
                      <div className="flex items-center gap-5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs border ${m.role === 'admin' ? 'bg-blue-600/10 border-blue-500/30 text-blue-500' : 'bg-gray-900 border-gray-800 text-gray-400'}`}>
                          {m.role[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[14px] text-white font-bold mb-1">{m.email}</p>
                          {editingMemberId === m.id ? (
                            <select 
                              autoFocus
                              value={m.role}
                              onChange={(e) => handleUpdateRole(m.id, e.target.value)}
                              onBlur={() => setEditingMemberId(null)}
                              className="bg-blue-600 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg outline-none cursor-pointer"
                            >
                              <option value="admin">Admin</option>
                              <option value="leader">Leader</option>
                              <option value="musician">Musician</option>
                              <option value="vocalist">Vocalist</option>
                            </select>
                          ) : (
                            <button 
                              onClick={() => { if (m.user_id !== userId) setEditingMemberId(m.id); }}
                              className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border transition-all ${m.user_id === userId ? 'bg-gray-900/40 border-gray-800/50 text-gray-600 cursor-default' : 'bg-gray-900 border-gray-800 text-blue-400 hover:border-blue-500 hover:text-white'}`}
                            >
                              {m.role} {m.user_id !== userId && ' ✎'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

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
                        <option value="musician">Музикант</option>
                        <option value="vocalist">Вокаліст</option>
                        <option value="leader">Лідер</option>
                        <option value="admin">Адмін</option>
                      </select>
                      <button onClick={handleInviteUser} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg">Додати</button>
                    </div>
                  )}
                  {inviteStatus && <div className="text-center py-2"><span className="text-[9px] uppercase font-black tracking-[0.2em] text-blue-500 animate-pulse">{inviteStatus}</span></div>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}