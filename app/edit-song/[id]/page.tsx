"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function EditSongPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const songId = unwrappedParams.id;
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState(""); // Состояние для YouTube ссылки
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // Загружаем текущие данные песни
  useEffect(() => {
    const fetchSong = async () => {
      const { data, error } = await supabase
        .from("songs")
        .select("*")
        .eq("id", songId)
        .single();

      if (data) {
        setTitle(data.title);
        setContent(data.content);
        setYoutubeUrl(data.youtube_url || ""); // Заполняем поле, если ссылка есть
      }
      setLoading(false);
    };

    fetchSong();
  }, [songId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from("songs")
      .update({ 
        title, 
        content, 
        youtube_url: youtubeUrl // Сохраняем обновленную ссылку
      })
      .eq("id", songId);

    if (error) {
      alert("Помилка при оновленні: " + error.message);
    } else {
      router.back(); // Возвращаемся назад после сохранения
    }
    setSaving(false);
  };

  if (loading) return <div className="p-10 text-white bg-black min-h-screen">Завантаження...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-black text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Редагувати пісню</h1>
      
      <form onSubmit={handleUpdate} className="flex flex-col gap-4">
        <div>
          <label className="text-xs text-gray-500 uppercase ml-1">Назва</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full p-3 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* ПОЛЕ YOUTUBE */}
        <div>
          <label className="text-xs text-gray-500 uppercase ml-1">YouTube Посилання</label>
          <input
            type="text"
            placeholder="https://www.youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            className="w-full p-3 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-red-900"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 uppercase ml-1">Текст та аккорди</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={15}
            className="w-full p-3 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-sm"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 p-4 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold transition-colors"
          >
            Скасувати
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-[2] p-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold transition-colors disabled:opacity-50"
          >
            {saving ? "Збереження..." : "Зберегти зміни"}
          </button>
        </div>
      </form>
    </div>
  );
}