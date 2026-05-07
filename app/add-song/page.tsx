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
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [songKey, setSongKey] = useState("");
  const [bpm, setBpm] = useState("");
  const [length, setLength] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Відстежуємо, який саме блок зараз завантажується
  const [parsingType, setParsingType] = useState<"pdf" | "docx" | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  
  const router = useRouter();

  const handleAiUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "pdf" | "docx") => {
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

        // Гнучка обробка контенту (текст або секції)
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
      e.target.value = ""; // Очищаємо інпут
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
      const { data: verification, error: verifyError } = await supabase.functions.invoke('verify-turnstile', {
        body: { token: captchaToken }
      });

      if (verifyError || !verification?.success) {
        alert("Помилка перевірки Cloudflare. Спробуйте ще раз.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("songs").insert([{ 
        title, 
        author: author || null, 
        content, 
        youtube_url: youtubeUrl, 
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
      alert("Сталася критична помилка при збереженні.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-black text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6 italic uppercase tracking-tighter">Додати нову пісню</h1>
      
      {/* AI Upload Section - Two Distinct Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        
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
              {parsingType === "pdf" ? "Аналізуємо PDF..." : "Завантажити PDF"}
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
              {parsingType === "docx" ? "Аналізуємо Word..." : "Завантажити WORD"}
            </p>
          </label>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        
        {/* Ряд: Назва та Автор */}
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

        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-500 ml-1 uppercase tracking-[0.2em] font-bold">YouTube Посилання</label>
          <input
            type="text"
            placeholder="https://www.youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            className="p-3 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-[#0090ff] transition-colors"
          />
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