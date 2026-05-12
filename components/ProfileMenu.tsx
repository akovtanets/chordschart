"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ProfileMenu() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Данные пользователя
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [loading, setLoading] = useState(false);

  // Закрытие меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Загрузка данных профиля
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      
      setUserId(session.user.id);
      setEmail(session.user.email || "");

      const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (data) {
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setPhone(data.phone || "");
        setSpecialty(data.specialty || "");
      } else {
        // Если профиля вдруг нет, создаем его (подстраховка)
        await supabase.from("profiles").insert([{ id: session.user.id }]);
      }
    };
    loadProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setLoading(true);

    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      first_name: firstName,
      last_name: lastName,
      phone: phone,
      specialty: specialty
    });

    setLoading(false);
    if (!error) setIsModalOpen(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login"); // Замените на ваш путь редиректа при выходе
  };

  return (
    <div className="relative z-50" ref={menuRef}>
      {/* Кнопка в шапке */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-800 bg-[#0a0a0a] hover:bg-[#111] transition-all text-sm font-bold text-white shadow-sm"
      >
        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs text-white uppercase">
          {firstName ? firstName[0] : email ? email[0] : 'U'}
        </div>
        Мой профиль
        <svg className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
      </button>

      {/* Выпадающее меню */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-gray-800 bg-[#0d0d0d] shadow-2xl overflow-hidden py-2">
          <div className="px-4 py-3 border-b border-gray-800 mb-2">
            <p className="text-sm font-bold text-white truncate">{firstName || lastName ? `${firstName} ${lastName}` : 'Користувач'}</p>
            <p className="text-[10px] text-gray-500 truncate">{email}</p>
          </div>
          
          <button 
            onClick={() => { setIsModalOpen(true); setIsOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-blue-600/10 hover:text-blue-400 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Редагувати профіль
          </button>
          
          <button 
            onClick={handleLogout}
            className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Вийти
          </button>
        </div>
      )}

      {/* Модальное окно редактирования */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[#0d0d0d] border border-gray-800 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-lg font-black uppercase tracking-widest text-white">Редагування профілю</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white text-2xl leading-none">×</button>
            </div>
            
            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Email (не змінюється)</label>
                <input type="email" value={email} disabled className="w-full bg-[#111] border border-gray-800 rounded-xl p-4 text-sm text-gray-500 cursor-not-allowed" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Ім'я</label>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Іван" className="w-full bg-[#111] border border-gray-800 rounded-xl p-4 text-sm text-white focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Прізвище</label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Франко" className="w-full bg-[#111] border border-gray-800 rounded-xl p-4 text-sm text-white focus:border-blue-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Телефон (необов'язково)</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+380..." className="w-full bg-[#111] border border-gray-800 rounded-xl p-4 text-sm text-white focus:border-blue-500 outline-none" />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Спеціальність</label>
                <select value={specialty} onChange={e => setSpecialty(e.target.value)} className="w-full bg-[#111] border border-gray-800 rounded-xl p-4 text-sm text-white focus:border-blue-500 outline-none appearance-none">
                  <option value="" disabled>Оберіть роль...</option>
                  <option value="Вокаліст">Вокаліст</option>
                  <option value="Музикант">Музикант</option>
                  <option value="Лідер">Лідер</option>
                  <option value="Звукорежисер">Звукорежисер</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 rounded-xl border border-gray-800 text-gray-400 font-bold text-xs uppercase tracking-widest hover:bg-[#111] transition-all">Скасувати</button>
                <button type="submit" disabled={loading} className="flex-1 py-4 rounded-xl bg-blue-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-blue-500 transition-all disabled:opacity-50">
                  {loading ? 'Збереження...' : 'Зберегти'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}