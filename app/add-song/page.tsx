"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { processFileAction } from "@/app/actions/parse-song";
import { Turnstile } from "@marsidev/react-turnstile"; //

export default function AddSongPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [songKey, setSongKey] = useState("");
  const [bpm, setBpm] = useState("");
  const [length, setLength] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null); //
  
  const router = useRouter();

  const handleAiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await processFileAction(formData);

      // ВИПРАВЛЕНО: Додано перевірку типів для TS, щоб не було помилки на 'content'
      if (result.success && result.data) {
        const data = result.data as { title?: string; content?: string };
        setTitle(data.title || "");
        setContent(data.content || "");
      } else {
        alert(result.error || "ШІ не зміг розпізнати файл");
      }
    } catch (err) {
      alert("Сталася помилка при відправці файлу на сервер.");
    } finally {
      setParsing(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <div className="max-w-2xl mx-auto p-6 bg-black text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6 italic uppercase tracking-tighter">Додати нову пісню</h1>
      
      {/* AI Upload Section */}
      <div className="mb-6">
        <input 
          type="file" 
          id="ai-upload-input"
          className="hidden" 
          accept=".pdf,.docx,.txt" 
          onChange={handleAiUpload}
          disabled={parsing || loading}
        />
        <label 
          htmlFor="ai-upload-input"
          className={`
            flex flex-col items-center justify-center w-full h-32 
            border-2 border-dashed rounded-xl cursor-pointer
            transition-all border-gray-800 hover:border-[#0090ff] bg-[#0a0a0a]
            ${parsing ? "opacity-50 cursor-not-allowed border-[#0090ff]" : "hover:bg-[#111]"}
          `}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <span className={`text-2xl mb-2 ${parsing ? "animate-bounce" : ""}`}>
              {parsing ? "⏳" : "✨"}
            </span>
            <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">
              {parsing ? "ШІ аналізує структуру..." : "Завантажити файл"}
            </p>
          </div>
        </label>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

        {/* TURNSTILE WIDGET */}
        <div className="my-2 flex justify-center">
          <Turnstile
        siteKey="0x4AAAAAADKKcfnA9ehATL1w" 
        onSuccess={(token) => setCaptchaToken(token)}
        onExpire={() => setCaptchaToken(null)}
        // Якщо тема критична, спробуйте так:
        options={{ theme: 'dark' }} 
      />
        </div>

        <button
          type="submit"
          disabled={loading || parsing || !title || !content || !captchaToken}
          className="p-4 bg-[#0090ff] hover:bg-[#33a5ff] disabled:bg-gray-800 disabled:text-gray-500 rounded-xl font-bold transition-all mt-2 active:scale-95 uppercase text-xs tracking-widest"
        >
          {loading ? "Збереження..." : "Зберегти пісню"}
        </button>
      </form>
    </div>
  );
}