"use client";

import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// Импорты для DND-Kit
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// --- Компонент одного слота (SortableItem) ---
function SortableSlot({ 
  slot, 
  index, 
  onRemove, 
  onActivate, 
  isActive, 
  searchQuery, 
  setSearchQuery, 
  filteredSongs, 
  onSelectSong 
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: slot.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    position: 'relative' as 'relative',
  };

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-2 group ${isDragging ? "opacity-50" : ""}`}>
      {/* Иконка перетаскивания (Handle) */}
      <div 
        {...attributes} 
        {...listeners} 
        className="cursor-grab active:cursor-grabbing p-2 text-gray-700 hover:text-blue-400"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="5" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="9" cy="19" r="1" />
          <circle cx="15" cy="5" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="19" r="1" />
        </svg>
      </div>

      <div className={`flex-1 flex items-center gap-4 p-4 rounded-2xl border transition-all ${
        slot.songId ? "bg-gray-900/40 border-gray-800" : "bg-blue-600/5 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
      }`}>
        <span className="text-gray-600 font-mono text-xs w-4">{index + 1}</span>

        <div className="flex-1 relative">
          {isActive ? (
            <input
              autoFocus
              placeholder="Шукайте пісню за назвою..."
              className="w-full bg-transparent outline-none text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onBlur={() => setTimeout(() => onActivate(null), 200)}
            />
          ) : (
            <div onClick={() => onActivate(index)} className="cursor-text py-1">
              {slot.songTitle || <span className="text-gray-600 italic">Натисніть для вибору...</span>}
            </div>
          )}

          {/* Результаты поиска внутри слота */}
          {isActive && filteredSongs.length > 0 && (
            <div className="absolute z-[100] left-0 right-0 mt-3 bg-[#1a1a1a] border border-gray-800 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
              {filteredSongs.map((song: any) => (
                <div
                  key={song.id}
                  onClick={() => onSelectSong(index, song)}
                  className="p-4 hover:bg-blue-600 transition-colors cursor-pointer border-b border-gray-800 last:border-0 text-sm"
                >
                  <div className="font-bold">{song.title}</div>
                  <div className="text-xs opacity-50">{song.author}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={() => onRemove(index)} className="text-gray-600 hover:text-red-400 p-1">✕</button>
      </div>
    </div>
  );
}

// --- Основний контент (обгорнутий для useSearchParams) ---
function CreateSetlistContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Читаємо дату з URL. Якщо її немає - беремо сьогоднішню.
  const dateParam = searchParams.get("date");
  const targetDate = dateParam ? new Date(dateParam) : new Date();

  const [title, setTitle] = useState("");
  const [slots, setSlots] = useState<{ id: string; songId: number | null; songTitle: string }[]>([]);
  const [allSongs, setAllSongs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);

  // Стейты для лимитов и PRO / Fake Door модалки
  const [isPro, setIsPro] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    async function initData() {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (userId) {
        // Перевіряємо, чи має юзер PRO статус
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_pro")
          .eq("id", userId)
          .single();
        
        setIsPro(profile?.is_pro || false);
      }

      // Завантажуємо пісні
      const { data: songsData } = await supabase.from("songs").select("id, title, author");
      if (songsData) setAllSongs(songsData);

      setLoading(false);
    }
    initData();
  }, []);

  const addSlot = () => {
    setSlots([...slots, { id: `slot-${Date.now()}`, songId: null, songTitle: "" }]);
  };

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const selectSongForSlot = (index: number, song: any) => {
    const newSlots = [...slots];
    newSlots[index] = { ...newSlots[index], songId: song.id, songTitle: song.title };
    setSlots(newSlots);
    setActiveSlotIndex(null);
    setSearchQuery("");
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setSlots((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Фактичне збереження сетліста в базу
  const executeSave = async () => {
    const finalIds = slots.map(s => s.songId).filter(id => id !== null);
    if (!title || finalIds.length === 0) return alert("Введіть назву та додайте пісні");

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    const { error } = await supabase.from("setlists").insert({ 
      title, 
      song_ids: finalIds,
      created_at: targetDate.toISOString(),
      user_id: userId
    });
    
    if (!error) {
      router.push(`/setlists?date=${targetDate.toISOString()}`);
    } else {
      alert("Помилка: " + error.message);
    }
  };

  // Перевірка ліміту перед збереженням (Fake Door для Free користувачів)
  const handleSave = async () => {
    const finalIds = slots.map(s => s.songId).filter(id => id !== null);
    if (!title || finalIds.length === 0) return alert("Введіть назву та додайте пісні");

    // Якщо у користувача PRO — зберігаємо одразу без перевірки лімітів
    if (isPro) {
      await executeSave();
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    if (!userId) return;

    // Рахуємо початок поточного місяця
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Отримуємо кількість сетлістів, створених у цьому місяці
    const { count, error } = await supabase
      .from('setlists')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString());

    if (error) {
      console.error("Помилка перевірки ліміту:", error);
      return;
    }

    // Ліміт Free тарифу: 4 сетлісти на місяць
    if (count !== null && count >= 4) {
      setShowProModal(true); // Викликаємо модальне вікно Fake Door
      return;
    }

    // Якщо ліміт не перевищено — виконуємо збереження
    await executeSave();
  };

  const filteredSongs = searchQuery 
    ? allSongs.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white p-6 sm:p-12 font-sans relative">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Новий сет-лист</h1>
            <p className="text-blue-500 text-xs font-bold uppercase tracking-widest mt-2">
              ДАТА: {targetDate.toLocaleDateString('uk-UA')}
            </p>
          </div>
          <Link href={`/setlists?date=${targetDate.toISOString()}`} className="text-gray-500 hover:text-white transition-colors">Скасувати</Link>
        </div>
        
        <input 
          placeholder="Назва сет-листа (напр. Недільна служба)"
          className="w-full bg-gray-900 border border-gray-800 p-5 rounded-[24px] mb-8 text-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="space-y-3 mb-10">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={slots} strategy={verticalListSortingStrategy}>
              {slots.map((slot, index) => (
                <SortableSlot 
                  key={slot.id}
                  slot={slot}
                  index={index}
                  isActive={activeSlotIndex === index}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  filteredSongs={filteredSongs}
                  onRemove={removeSlot}
                  onActivate={setActiveSlotIndex}
                  onSelectSong={selectSongForSlot}
                />
              ))}
            </SortableContext>
          </DndContext>

          <button 
            onClick={addSlot}
            className="w-full py-5 border-2 border-dashed border-gray-800 rounded-[24px] text-gray-500 hover:border-blue-500/50 hover:text-blue-400 hover:bg-blue-500/5 transition-all font-semibold flex items-center justify-center gap-2"
          >
            <span className="text-xl">+</span> Додати слот для пісні
          </button>
        </div>

        <button 
          onClick={handleSave}
          disabled={slots.length === 0 || loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 disabled:text-gray-600 py-5 rounded-[24px] font-bold text-lg transition-all shadow-xl shadow-blue-900/20 active:scale-[0.98]"
        >
          Опублікувати сет-лист
        </button>
      </div>

      {/* FAKE DOOR / PRO MODAL */}
      {showProModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#0a0a0a] border border-gray-800 rounded-3xl p-6 md:p-8 max-w-md w-full relative shadow-[0_0_40px_rgba(37,99,235,0.15)]">
            <button 
              onClick={() => setShowProModal(false)} 
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-900 text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
            >
              ✕
            </button>

            <div className="text-center mb-6 mt-2">
              <div className="inline-block px-3 py-1 bg-blue-900/30 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full mb-4">
                Ліміт вичерпано
              </div>
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white mb-2">
                Досягнуто ліміт Free тарифу
              </h2>
              <p className="text-sm text-gray-400 mb-6">
                На безкоштовному тарифі ви можете створити до 4 сетлістів на місяць. Перейдіть на PRO, щоб отримати безлімітне створення подій та офлайн-режим для сцени.
              </p>
              
              <button 
                onClick={() => {
                  setShowProModal(false);
                  router.push('/pricing'); // Перенаправляємо на сторінку тарифікації з Fake Door
                }}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest rounded-xl text-center transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)]"
              >
                Дізнатися про PRO-доступ (знижка 50%)
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function CreateSetlistPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-gray-500">Завантаження...</div>}>
      <CreateSetlistContent />
    </Suspense>
  );
}