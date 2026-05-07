"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Turnstile } from "@marsidev/react-turnstile";

export default function EditSongPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const songId = unwrappedParams.id;
  
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState(""); // ДОДАНО: Стан для автора
  const [content, setContent] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState(""); 
  const [songKey, setSongKey] = useState("");
  const [bpm, setBpm] = useState("");
  const [length, setLength] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  
  const router = useRouter();

  useEffect(() => {
    const fetchSong = async () => {
      const { data, error } = await supabase
        .from("songs")
        .select("*")
        .eq("id", songId)
        .single();

      if (data) {
        setTitle(data.title);
        setAuthor(data.author || ""); // ДОДАНО: Завантажуємо автора з бази
        setContent(data.content);
        setYoutubeUrl(data.youtube_url || ""); 
        setSongKey(data.default_key || "");
        setBpm(data.bpm || "");
        setLength(data.length || "");
      }
      setLoading(false);
    };

    fetchSong();
  }, [songId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaToken) return;

    setSaving(true); // Використовуємо saving для стану кнопки

    try {
      // ПЕРЕВІРКА ЧЕРЕЗ EDGE FUNCTION
      const { data: verification, error: verifyError } = await supabase.functions.invoke('verify-turnstile', {
        body: { token: captchaToken }
      });

      if (verifyError || !verification?.success) {
        alert("Помилка перевірки Cloudflare. Спробуйте ще раз.");
        setSaving(false);
        return;
      }

      // ЯКЩО УСПІШНО — ОНОВЛЮЄМО (Виправлено insert на update)
      const { error } = await supabase
        .from("songs")
        .update({ 
          title, 
          author: author || null, 
          content, 
          youtube_url: youtubeUrl, 
          default_key: songKey, 
          bpm: bpm || null, 
          length: length || null 
        })
        .eq("id", songId); // Обов'язково вказуємо яку пісню оновлюємо!

      if (error) {
        alert(error.message);
      } else {
        router.push(`/song/${songId}`); // Краще повертати на сторінку самої пісні після редагування
      }
    } catch (err) {
      alert("Критична помилка при збереженні.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-black text-gray-500 font-mono text-xs italic">ЗАВАНТАЖЕННЯ...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-black text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6 italic uppercase tracking-tighter">Редагувати пісню</h1>
      
      <form onSubmit={handleUpdate} className="flex flex-col gap-4">
        
        {/* Ряд: Назва та Автор */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 uppercase ml-1 font-bold tracking-widest">Назва</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full p-3 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-[#0090ff] transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase ml-1 font-bold tracking-widest">Автор / Виконавець</label>
            <input
              type="text"
              placeholder="Наприклад: Chris Tomlin"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full p-3 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-[#0090ff] transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 uppercase ml-1 font-bold tracking-widest">YouTube Посилання</label>
          <input
            type="text"
            placeholder="https://www.youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            className="w-full p-3 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-[#0090ff] transition-colors"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 uppercase ml-1 font-bold tracking-widest">Тональність</label>
            <input
              type="text"
              placeholder="Bb"
              value={songKey}
              onChange={(e) => setSongKey(e.target.value)}
              className="w-full p-3 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-[#0090ff]"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase ml-1 font-bold tracking-widest">Темп (BPM)</label>
            <input
              type="text" 
              placeholder="80"
              value={bpm}
              onChange={(e) => setBpm(e.target.value)}
              className="w-full p-3 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-[#0090ff]"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase ml-1 font-bold tracking-widest">Тривалість</label>
            <input
              type="text"
              placeholder="4:09"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className="w-full p-3 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-[#0090ff]"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 uppercase ml-1 font-bold tracking-widest">Текст та акорди</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={15}
            className="w-full p-4 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-[#0090ff] font-mono text-sm leading-relaxed"
          />
        </div>

        {/* TURNSTILE WIDGET */}
        <div className="my-2 flex justify-center">
          <Turnstile
            siteKey="0x4AAAAAADKKcfnA9ehATL1w" 
            onSuccess={(token) => setCaptchaToken(token)}
            onExpire={() => setCaptchaToken(null)}
            options={{ theme: "dark" }}
          />
        </div>

        <div className="flex gap-4 mt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 p-4 bg-[#222] hover:bg-[#333] rounded-xl font-bold transition-all active:scale-95 text-xs uppercase tracking-widest"
          >
            Скасувати
          </button>
          <button
            type="submit"
            disabled={saving || !captchaToken || !title || !content}
            className="flex-[2] p-4 bg-[#0090ff] hover:bg-[#33a5ff] rounded-xl font-bold transition-all active:scale-95 text-xs uppercase tracking-widest disabled:opacity-50 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            {saving ? "Збереження..." : "Зберегти зміни"}
          </button>
        </div>
      </form>
    </div>
  );
}