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
  
  // Додано підтримку вибору джерела аудіо/відео
  const [sourceType, setSourceType] = useState<"youtube" | "mp3">("youtube");
  const [youtubeUrl, setYoutubeUrl] = useState(""); 
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [existingAudioUrl, setExistingAudioUrl] = useState<string | null>(null);

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
        
        // Визначаємо, що саме збережено у пісні
        if (data.audio_url) {
          setSourceType("mp3");
          setExistingAudioUrl(data.audio_url);
        } else if (data.youtube_url) {
          setSourceType("youtube");
          setYoutubeUrl(data.youtube_url);
        }

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

    setSaving(true);

    try {
      // ПЕРЕВІРКА КАПЧІ ЧЕРЕЗ НАШ API-РОУТ
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

      let finalAudioUrl = existingAudioUrl;

      // Якщо під час редагування завантажили новий MP3 файл
      if (sourceType === "mp3" && audioFile) {
        const fileExt = audioFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `audio/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("songs-audio")
          .upload(filePath, audioFile);

        if (uploadError) {
          alert(`Помилка завантаження аудіо: ${uploadError.message}`);
          setSaving(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from("songs-audio")
          .getPublicUrl(filePath);

        finalAudioUrl = publicUrlData.publicUrl;
      }

      // ОНОВЛЮЄМО ДАНІ В БАЗІ
      const { error } = await supabase
        .from("songs")
        .update({ 
          title, 
          author: author || null, 
          content, 
          youtube_url: sourceType === "youtube" ? youtubeUrl : null, 
          audio_url: sourceType === "mp3" ? finalAudioUrl : null,
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

        {/* Перемикач джерела аудіо/відео */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="text-xs text-gray-500 uppercase ml-1 font-bold tracking-widest">Джерело звуку</label>
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setSourceType("youtube")} 
                className={`px-3 py-1 text-[9px] font-bold uppercase rounded-md transition-all ${sourceType === 'youtube' ? 'bg-blue-600 text-white' : 'bg-[#111] text-gray-400'}`}
              >
                YouTube
              </button>
              <button 
                type="button" 
                onClick={() => setSourceType("mp3")} 
                className={`px-3 py-1 text-[9px] font-bold uppercase rounded-md transition-all ${sourceType === 'mp3' ? 'bg-blue-600 text-white' : 'bg-[#111] text-gray-400'}`}
              >
                MP3 файл
              </button>
            </div>
          </div>

          {sourceType === "youtube" ? (
            <input
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="w-full p-3 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-[#0090ff] transition-colors"
            />
          ) : (
            <div className="flex flex-col gap-2">
              {existingAudioUrl && !audioFile && (
                <p className="text-xs text-gray-400 ml-1">
                  Поточний файл: <a href={existingAudioUrl} target="_blank" className="text-blue-400 underline">слухати</a>
                </p>
              )}
              <input
                type="file"
                accept=".mp3,.wav,.m4a"
                onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                className="p-2.5 bg-[#111] border border-gray-800 rounded-lg text-xs text-gray-400 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
              />
            </div>
          )}
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