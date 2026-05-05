"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { processFileAction } from "@/app/actions/parse-song";

export default function AddSongPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [songKey, setSongKey] = useState("");
  const [bpm, setBpm] = useState("");
  const [duration, setDuration] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const router = useRouter();

  // Функція обробки файлу через ШІ
  const handleAiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log("🚀 Файл вибрано:", file.name);
    setParsing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Викликаємо серверний екшен
      const result = await processFileAction(formData);
      console.log("📡 Результат від ШІ:", result);

      if (result.success && result.data) {
        setTitle(result.data.title || "");
        setContent(result.data.content || "");
        // Якщо ШІ знайшов тональність, можна додати її до контенту або назви
        console.log("✅ Дані успішно заповнені");
      } else {
        console.error("❌ Помилка розпізнавання:", result.error);
        alert(result.error || "ШІ не зміг розпізнати файл");
      }
    } catch (err) {
      console.error("💥 Критична помилка завантаження:", err);
      alert("Сталася помилка при відправці файлу на сервер.");
    } finally {
      setParsing(false);
      // Очищуємо інпут, щоб можна було завантажити той самий файл ще раз
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("songs").insert([
      { 
        title, 
        content, 
        youtube_url: youtubeUrl,
        key: songKey, 
        bpm: bpm ? parseInt(bpm) : null, // Сохраняем темп как число
        duration: duration || null
      }
    ]);

    if (error) {
      alert("Помилка при додаванні пісні: " + error.message);
    } else {
      router.push("/songs");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-black text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Додати нову пісню</h1>
      
      {/* ЗОНА ЗАВАНТАЖЕННЯ ФАЙЛУ */}
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
            transition-all border-gray-800 hover:border-blue-500 bg-[#0a0a0a]
            ${parsing ? "opacity-50 cursor-not-allowed border-blue-500" : "hover:bg-[#111]"}
          `}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <span className={`text-2xl mb-2 ${parsing ? "animate-bounce" : ""}`}>
              {parsing ? "⏳" : "✨"}
            </span>
            <p className="text-sm text-gray-400 font-medium">
              {parsing ? "ШІ аналізує структуру пісні..." : "Завантажити PDF / Word / TXT"}
            </p>
            {!parsing && (
              <p className="text-[10px] text-gray-600 uppercase mt-1 tracking-widest">
                автоматична розстановка акордів
              </p>
            )}
          </div>
        </label>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-500 ml-1 uppercase tracking-wider font-bold">Назва пісні</label>
          <input
            type="text"
            placeholder="Наприклад: Чудова Благодать"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="p-3 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-500 ml-1 uppercase tracking-wider font-bold">Посилання на YouTube</label>
          <input
            type="text"
            placeholder="https://www.youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            className="p-3 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-red-900 transition-colors"
          />
        </div>
        {/* НОВЫЙ БЛОК: Тональность, Темп, Длительность */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
             <label className="text-[10px] text-gray-500 ml-1 uppercase tracking-wider font-bold">Тональність</label>
             <input
               type="text"
               placeholder="Am, C, Bb..."
               value={songKey}
               onChange={(e) => setSongKey(e.target.value)}
               className="p-3 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
             />
          </div>
          <div className="flex flex-col gap-1">
             <label className="text-[10px] text-gray-500 ml-1 uppercase tracking-wider font-bold">Темп (BPM)</label>
             <input
               type="number"
               placeholder="120"
               value={bpm}
               onChange={(e) => setBpm(e.target.value)}
               className="p-3 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
             />
          </div>
          <div className="flex flex-col gap-1">
             <label className="text-[10px] text-gray-500 ml-1 uppercase tracking-wider font-bold">Тривалість</label>
             <input
               type="text"
               placeholder="03:45"
               value={duration}
               onChange={(e) => setDuration(e.target.value)}
               className="p-3 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
             />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-500 ml-1 uppercase tracking-wider font-bold">Текст та акорди</label>
          <textarea
            placeholder="Текст пісні з аккордами [Am]..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={15}
            className="p-3 bg-[#111] border border-gray-800 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-sm leading-relaxed"
          />
        </div>

        <button
          type="submit"
          disabled={loading || parsing || !title || !content}
          className="p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 disabled:text-gray-500 rounded-xl font-bold transition-all mt-2 active:scale-95"
        >
          {loading ? "Збереження у базу..." : "Зберегти пісню"}
        </button>
      </form>
    </div>
  );
}