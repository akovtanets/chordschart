"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Turnstile } from "@marsidev/react-turnstile";

export default function EditSongPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const songId = unwrappedParams.id;
  
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState(""); 
  const [content, setContent] = useState("");
  
  // Джерело відео (тільки YouTube)
  const [youtubeUrl, setYoutubeUrl] = useState(""); 

  // Обкладинка
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null);

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
        setAuthor(data.author || ""); 
        setContent(data.content);
        setYoutubeUrl(data.youtube_url || "");

        // Завантажуємо існуючу обкладинку, якщо є
        if (data.cover_url) {
          setExistingCoverUrl(data.cover_url);
          setCoverPreview(data.cover_url);
        }

        setSongKey(data.default_key || "");
        setBpm(data.bpm || "");
        setLength(data.length || "");
      }
      setLoading(false);
    };

    fetchSong();
  }, [songId]);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Перевірка типу файлу обкладинки
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      alert("Будь ласка, оберіть коректне зображення (JPG, PNG або WebP).");
      e.target.value = ""; 
      return;
    }

    // 2. Перевірка розміру (макс. 5 МБ)
    const maxSize = 5 * 1024 * 1024; 
    if (file.size > maxSize) {
      alert("Розмір файлу завеликий. Максимальний розмір обкладинки — 5 МБ.");
      e.target.value = ""; 
      return;
    }

    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaToken) return;

    // ВАЛІДАЦІЯ YOUTUBE URL
    if (youtubeUrl.trim() !== "") {
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]{11}(&.*)?$/;
      if (!youtubeRegex.test(youtubeUrl.trim())) {
        alert("Будь ласка, введіть коректне посилання на YouTube (напр., https://www.youtube.com/watch?v=...)");
        return;
      }
    }

    setSaving(true);

    try {
      // ПЕРЕВІРКА КАПЧІ
      const verifyRes = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: captchaToken })
      });
      
      const verification = await verifyRes.json();

      if (!verifyRes.ok || !verification.success) {
        alert("Помилка перевірки Cloudflare. Спробуйте ще раз.");
        setSaving(false);
        setCaptchaToken(null);
        return;
      }

      let finalCoverUrl = existingCoverUrl;

      // Завантаження нової Обкладинки
      if (coverFile) {
        const fileExt = coverFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { error: coverUploadError } = await supabase.storage
          .from("covers")
          .upload(fileName, coverFile);

        if (coverUploadError) {
          alert(`Помилка завантаження обкладинки: ${coverUploadError.message}`);
          setSaving(false);
          return;
        }

        const { data: coverUrlData } = supabase.storage
          .from("covers")
          .getPublicUrl(fileName);

        finalCoverUrl = coverUrlData.publicUrl;
      }

      // ОНОВЛЮЄМО ДАНІ В БАЗІ
      const { error } = await supabase
        .from("songs")
        .update({ 
          title, 
          author: author || null, 
          content, 
          youtube_url: youtubeUrl.trim() || null, 
          cover_url: finalCoverUrl,
          default_key: songKey, 
          bpm: bpm || null, 
          length: length || null 
        })
        .eq("id", songId);

      if (error) {
        alert(error.message);
      } else {
        router.push(`/song/${songId}`); 
      }
    } catch (err) {
      console.error(err);
      alert("Критична помилка при збереженні.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-black text-gray-500 font-mono text-xs italic uppercase tracking-widest">ЗАВАНТАЖЕННЯ...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-black text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6 italic uppercase tracking-tighter">Редагувати пісню</h1>
      
      <form onSubmit={handleUpdate} className="flex flex-col gap-4">
        
        {/* Завантаження обкладинки */}
        <div className="flex flex-col gap-2 mb-2">
          <label className="text-[10px] text-gray-500 ml-1 uppercase tracking-[0.2em] font-bold">Обкладинка альбому</label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#111] border border-gray-800 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
              {coverPreview ? (
                <img src={coverPreview} alt="Cover Preview" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div className="flex flex-col gap-1 w-full">
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className="p-2 w-full bg-[#111] border border-gray-800 rounded-lg text-xs text-gray-400 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer transition-colors"
              />
              {existingCoverUrl && !coverFile && (
                <p className="text-[10px] text-gray-500 ml-1">Поточна обкладинка вже збережена.</p>
              )}
            </div>
          </div>
        </div>

        {/* Ряд: Назва та Автор */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] text-gray-500 uppercase ml-1 font-bold tracking-widest">Назва</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full p-3 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-[#0090ff] transition-colors"
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-500 uppercase ml-1 font-bold tracking-widest">Автор / Виконавець</label>
            <input
              type="text"
              placeholder="Наприклад: Chris Tomlin"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full p-3 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-[#0090ff] transition-colors"
            />
          </div>
        </div>

        {/* Джерело звуку (Тільки YouTube) */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] text-gray-500 uppercase ml-1 font-bold tracking-widest">Посилання на YouTube</label>
          <input
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            className="w-full p-3 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-[#0090ff] transition-colors"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] text-gray-500 uppercase ml-1 font-bold tracking-widest">Тональність</label>
            <input
              type="text"
              placeholder="Bb"
              value={songKey}
              onChange={(e) => setSongKey(e.target.value)}
              className="w-full p-3 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-[#0090ff] transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase ml-1 font-bold tracking-widest">Темп (BPM)</label>
            <input
              type="text" 
              placeholder="80"
              value={bpm}
              onChange={(e) => setBpm(e.target.value)}
              className="w-full p-3 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-[#0090ff] transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase ml-1 font-bold tracking-widest">Тривалість</label>
            <input
              type="text"
              placeholder="4:09"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className="w-full p-3 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-[#0090ff] transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] text-gray-500 uppercase ml-1 font-bold tracking-widest">Текст та акорди</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={15}
            className="w-full p-4 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-[#0090ff] font-mono text-sm leading-relaxed transition-colors"
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