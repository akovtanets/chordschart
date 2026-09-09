"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { processFileAction } from "@/app/actions/parse-song";
import { Turnstile } from "@marsidev/react-turnstile";

export default function AddSongPage() {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  
  // Додано підтримку вибору джерела аудіо/відео
  const [sourceType, setSourceType] = useState<"youtube" | "mp3">("youtube");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const [songKey, setSongKey] = useState("");
  const [bpm, setBpm] = useState("");
  const [length, setLength] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [parsingType, setParsingType] = useState<"pdf" | "docx" | "jpg" | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  
  const router = useRouter();

  const handleAiUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "pdf" | "docx" | "jpg") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsingType(type);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await processFileAction(formData);

      if (result.success && result.data) {
        const data = result.data as any;
        
        setTitle(data.title || "");
        setAuthor(data.author || "");
        setSongKey(data.key || "");

        if (data.content) {
          setContent(data.content);
        } else if (data.sections && Array.isArray(data.sections)) {
          const formattedContent = data.sections
            .map((section: any) => {
              const header = `[${section.type}]`;
              const lines = section.lines.join("\n");
              return `${header}\n${lines}`;
            })
            .join("\n\n");
          setContent(formattedContent);
        }
      } else {
        alert(result.error || "ШІ не зміг розпізнати файл");
      }
    } catch (err) {
      console.error("Помилка при аналізі:", err);
      alert("Сталася помилка при відправці файлу на сервер.");
    } finally {
      setParsingType(null);
      e.target.value = ""; 
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaToken) {
      alert("Будь ласка, пройдіть перевірку капчею.");
      return;
    }

    setLoading(true);

    try {
      // Перевірка капчі через наш новий API-роут
      const verifyRes = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: captchaToken })
      });
      
      const verification = await verifyRes.json();

      if (!verifyRes.ok || !verification.success) {
        alert("Помилка перевірки Cloudflare. Спробуйте ще раз.");
        setLoading(false);
        setCaptchaToken(null);
        return;
      }

      let finalAudioUrl = null;

      // Якщо обрано MP3, завантажуємо його в Supabase Storage
      if (sourceType === "mp3" && audioFile) {
        const fileExt = audioFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `audio/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("songs-audio") // Назва вашого бакета в Supabase Storage
          .upload(filePath, audioFile);

        if (uploadError) {
          alert(`Помилка завантаження аудіо: ${uploadError.message}`);
          setLoading(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from("songs-audio")
          .getPublicUrl(filePath);

        finalAudioUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase.from("songs").insert([{ 
        title, 
        author: author || null, 
        content, 
        youtube_url: sourceType === "youtube" ? youtubeUrl : null, 
        audio_url: sourceType === "mp3" ? finalAudioUrl : null,
        default_key: songKey, 
        bpm: bpm || null, 
        length: length || null 
      }]);

      if (error) {
        alert(`Помилка бази даних: ${error.message}`);
      } else {
        router.push("/songs");
      }
    } catch (err) {
      console.error(err);
      alert("Сталася критична помилка при збереженні.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-black text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6 italic uppercase tracking-tighter">Додати нову пісню</h1>
      
      {/* AI Upload Section - Три блоки (PDF, Word, JPG) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        
        {/* PDF Block */}
        <div className="relative">
          <input 
            type="file" 
            id="pdf-upload"
            className="hidden" 
            accept=".pdf" 
            onChange={(e) => handleAiUpload(e, "pdf")}
            disabled={parsingType !== null || loading}
          />
          <label 
            htmlFor="pdf-upload"
            className={`
              flex flex-col items-center justify-center w-full h-32 
              border-2 border-dashed rounded-xl cursor-pointer
              transition-all duration-300 bg-[#0a0a0a]
              ${parsingType === "pdf" ? "border-red-500 bg-[#150a0a]" : "border-gray-800 hover:border-red-500 hover:bg-[#111]"}
              ${parsingType !== null && parsingType !== "pdf" ? "opacity-20 cursor-not-allowed" : "opacity-100"}
            `}
          >
            <span className={`text-3xl mb-2 ${parsingType === "pdf" ? "animate-spin" : ""}`}>
              {parsingType === "pdf" ? "⏳" : "📕"}
            </span>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
              {parsingType === "pdf" ? "Аналізуємо..." : "PDF"}
            </p>
          </label>
        </div>

        {/* Word Block */}
        <div className="relative">
          <input 
            type="file" 
            id="word-upload"
            className="hidden" 
            accept=".docx" 
            onChange={(e) => handleAiUpload(e, "docx")}
            disabled={parsingType !== null || loading}
          />
          <label 
            htmlFor="word-upload"
            className={`
              flex flex-col items-center justify-center w-full h-32 
              border-2 border-dashed rounded-xl cursor-pointer
              transition-all duration-300 bg-[#0a0a0a]
              ${parsingType === "docx" ? "border-blue-500 bg-[#0a0e15]" : "border-gray-800 hover:border-blue-500 hover:bg-[#111]"}
              ${parsingType !== null && parsingType !== "docx" ? "opacity-20 cursor-not-allowed" : "opacity-100"}
            `}
          >
            <span className={`text-3xl mb-2 ${parsingType === "docx" ? "animate-spin" : ""}`}>
              {parsingType === "docx" ? "⏳" : "📘"}
            </span>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
              {parsingType === "docx" ? "Аналізуємо..." : "WORD"}
            </p>
          </label>
        </div>

        {/* JPG / PNG Block */}
        <div className="relative">
          <input 
            type="file" 
            id="jpg-upload"
            className="hidden" 
            accept=".jpg,.jpeg,.png" 
            onChange={(e) => handleAiUpload(e, "jpg")}
            disabled={parsingType !== null || loading}
          />
          <label 
            htmlFor="jpg-upload"
            className={`
              flex flex-col items-center justify-center w-full h-32 
              border-2 border-dashed rounded-xl cursor-pointer
              transition-all duration-300 bg-[#0a0a0a]
              ${parsingType === "jpg" ? "border-green-500 bg-[#0a150a]" : "border-gray-800 hover:border-green-500 hover:bg-[#111]"}
              ${parsingType !== null && parsingType !== "jpg" ? "opacity-20 cursor-not-allowed" : "opacity-100"}
            `}
          >
            <span className={`text-3xl mb-2 ${parsingType === "jpg" ? "animate-spin" : ""}`}>
              {parsingType === "jpg" ? "⏳" : "🖼️"}
            </span>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
              {parsingType === "jpg" ? "Аналізуємо..." : "ФОТО (JPG/PNG)"}
            </p>
          </label>
        </div>

      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-500 ml-1 uppercase tracking-[0.2em] font-bold">Назва пісні</label>
            <input
              type="text"
              placeholder="Наприклад: Чудова Благодать"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="p-3 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-[#0090ff] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-500 ml-1 uppercase tracking-[0.2em] font-bold">Автор / Виконавець</label>
            <input
              type="text"
              placeholder="Наприклад: Chris Tomlin"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="p-3 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-[#0090ff] transition-colors"
            />
          </div>
        </div>

        {/* Перемикач джерела аудіо/відео */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="text-[10px] text-gray-500 ml-1 uppercase tracking-[0.2em] font-bold">Джерело звуку</label>
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
              className="p-3 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-[#0090ff] transition-colors"
            />
          ) : (
            <input
              type="file"
              accept=".mp3,.wav,.m4a"
              onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
              className="p-2.5 bg-[#111] border border-gray-800 rounded-lg text-xs text-gray-400 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
            />
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
             <label className="text-[10px] text-gray-500 ml-1 uppercase tracking-[0.2em] font-bold">Тональність</label>
             <input
               type="text"
               placeholder="Am"
               value={songKey}
               onChange={(e) => setSongKey(e.target.value)}
               className="p-3 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-[#0090ff] transition-colors"
             />
          </div>
          <div className="flex flex-col gap-1">
             <label className="text-[10px] text-gray-500 ml-1 uppercase tracking-[0.2em] font-bold">Темп (BPM)</label>
             <input
               type="text"
               placeholder="120"
               value={bpm}
               onChange={(e) => setBpm(e.target.value)}
               className="p-3 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-[#0090ff] transition-colors"
             />
          </div>
          <div className="flex flex-col gap-1">
             <label className="text-[10px] text-gray-500 ml-1 uppercase tracking-[0.2em] font-bold">Тривалість</label>
             <input
               type="text"
               placeholder="03:45"
               value={length}
               onChange={(e) => setLength(e.target.value)}
               className="p-3 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-[#0090ff] transition-colors"
             />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-500 ml-1 uppercase tracking-[0.2em] font-bold">Текст та акорди</label>
          <textarea
            placeholder="Текст пісні з акордами [Am]..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={15}
            className="p-3 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-[#0090ff] font-mono text-sm leading-relaxed"
          />
        </div>

        <div className="my-2 flex justify-center">
          <Turnstile
            siteKey="0x4AAAAAADKKcfnA9ehATL1w" 
            onSuccess={(token) => setCaptchaToken(token)}
            onExpire={() => setCaptchaToken(null)}
            options={{ theme: 'dark' }} 
          />
        </div>

        <button
          type="submit"
          disabled={loading || parsingType !== null || !title || !content || !captchaToken}
          className="p-4 bg-[#0090ff] hover:bg-[#33a5ff] disabled:bg-gray-800 disabled:text-gray-500 rounded-xl font-bold transition-all mt-2 active:scale-95 uppercase text-xs tracking-widest text-white"
        >
          {loading ? "Збереження..." : "Зберегти пісню"}
        </button>
      </form>
    </div>
  );
}