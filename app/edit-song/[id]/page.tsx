"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Turnstile } from "@marsidev/react-turnstile"; // Імпортуємо Turnstile

export default function EditSongPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const songId = unwrappedParams.id;
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState(""); 
  const [songKey, setSongKey] = useState("");
  const [bpm, setBpm] = useState("");
  const [length, setLength] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null); // Стан для токена
  
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

  setLoading(true);

  // ПЕРЕВІРКА ЧЕРЕЗ EDGE FUNCTION
  const { data: verification, error: verifyError } = await supabase.functions.invoke('verify-turnstile', {
    body: { token: captchaToken }
  });

  if (verifyError || !verification?.success) {
    alert("Помилка перевірки Cloudflare. Спробуйте ще раз.");
    setLoading(false);
    return;
  }

  // ЯКЩО УСПІШНО — ЗБЕРІГАЄМО
  const { error } = await supabase.from("songs").insert([{ 
    title, content, youtube_url: youtubeUrl, default_key: songKey, bpm, length 
  }]);

  if (error) alert(error.message);
  else router.push("/songs");
  
  setLoading(false);
};

  if (loading) return <div className="p-10 text-white bg-black min-h-screen">Завантаження...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-black text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6 italic uppercase tracking-tighter">Редагувати пісню</h1>
      
      <form onSubmit={handleUpdate} className="flex flex-col gap-4">
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
            siteKey="0x4AAAAAADKKcfnA9ehATL1w" // Твій Site Key
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
            disabled={saving || !captchaToken}
            className="flex-[2] p-4 bg-[#0090ff] hover:bg-[#33a5ff] rounded-xl font-bold transition-all active:scale-95 text-xs uppercase tracking-widest disabled:opacity-50"
          >
            {saving ? "Збереження..." : "Зберегти зміни"}
          </button>
        </div>
      </form>
    </div>
  );
}