"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import styles from "./AddSong.module.css";

export default function AddSongPage() {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [defaultKey, setDefaultKey] = useState("");
  const [bpm, setBpm] = useState("");
  const [timesig, setTimesig] = useState("");
  const [length, setLength] = useState("");
  
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  const songData = { 
    title, 
    author, 
    content, 
    default_key: defaultKey || null, 
    bpm: bpm || null, 
    timesig: timesig || null, 
    length: length || null 
  };

  const { data, error } = await supabase
    .from("songs")
    .insert([songData])
    .select(); // Здесь Supabase возвращает массив с одной новой песней

  if (error) {
    alert("Помилка: " + error.message);
  } else if (data && data.length > 0) {
    // Гарантированно берем ID только что созданной записи (первый элемент массива data)
    const newSongId = data[0].id;
    console.log("Нова пісня створена з ID:", newSongId);
    router.push(`/song/${newSongId}`);
  }
  
  setLoading(false);
};

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Додати нову пісню</h1>
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label>Назва пісні</label>
          <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className={styles.field}>
          <label>Автор / Виконавець</label>
          <input required type="text" value={author} onChange={(e) => setAuthor(e.target.value)} />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label>Тональність</label>
            <input type="text" value={defaultKey} onChange={(e) => setDefaultKey(e.target.value)} placeholder="E" />
          </div>
          <div className={styles.field}>
            <label>Темп (BPM)</label>
            <input type="text" value={bpm} onChange={(e) => setBpm(e.target.value)} placeholder="72" />
          </div>
          <div className={styles.field}>
            <label>Розмір (Time Sig)</label>
            <input type="text" value={timesig} onChange={(e) => setTimesig(e.target.value)} placeholder="4/4" />
          </div>
          <div className={styles.field}>
            <label>Тривалість</label>
            <input type="text" value={length} onChange={(e) => setLength(e.target.value)} placeholder="4:30" />
          </div>
        </div>

        <div className={styles.field}>
          <label>Текст та акорди</label>
          <textarea required rows={15} value={content} onChange={(e) => setContent(e.target.value)} />
        </div>

        <button type="submit" disabled={loading} className={styles.button}>
          {loading ? "Зберігаємо..." : "Опублікувати"}
        </button>
      </form>
    </main>
  );
}