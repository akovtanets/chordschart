"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import styles from "../../add-song/AddSong.module.css"; 

export default function EditSongPage() {
  const params = useParams();
  const router = useRouter();
  
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [defaultKey, setDefaultKey] = useState("");
  const [bpm, setBpm] = useState("");
  const [timesig, setTimesig] = useState("");
  const [length, setLength] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSong() {
      try {
        const { data, error } = await supabase
          .from("songs")
          .select("*")
          .eq("id", params.id)
          .single();

        if (error) throw error;

        if (data) {
          setTitle(data.title);
          setAuthor(data.author);
          setContent(data.content);
          setDefaultKey(data.default_key || "");
          setBpm(data.bpm || "");
          setTimesig(data.timesig || "");
          setLength(data.length || "");
        }
      } catch (err) {
        console.error("Помилка завантаження:", err);
      } finally {
        setLoading(false);
      }
    }
    if (params.id) fetchSong();
  }, [params.id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from("songs")
      .update({
        title,
        author,
        content,
        default_key: defaultKey,
        bpm: bpm || null,
        timesig: timesig || null,
        length: length || null
      })
      .eq("id", params.id);

    if (error) {
      alert("Помилка при оновленні: " + error.message);
    } else {
      router.push(`/song/${params.id}`);
    }
    setSaving(false);
  };

  if (loading) return <div className="p-12 text-center text-gray-400">Завантаження...</div>;

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Редагувати пісню</h1>
      
      <form onSubmit={handleUpdate} className={styles.form}>
        <div className={styles.field}>
          <label>Назва</label>
          <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className={styles.field}>
          <label>Автор</label>
          <input required type="text" value={author} onChange={(e) => setAuthor(e.target.value)} />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label>Тональність</label>
            <input type="text" value={defaultKey} onChange={(e) => setDefaultKey(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>BPM</label>
            <input type="text" value={bpm} onChange={(e) => setBpm(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>Розмір</label>
            <input type="text" value={timesig} onChange={(e) => setTimesig(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>Тривалість</label>
            <input type="text" value={length} onChange={(e) => setLength(e.target.value)} />
          </div>
        </div>

        <div className={styles.field}>
          <label>Текст (використовуйте [G] для акордів)</label>
          <textarea required rows={12} value={content} onChange={(e) => setContent(e.target.value)} />
        </div>

        <div className="flex gap-4">
          <button type="submit" disabled={saving} className={styles.button}>
            {saving ? "Збереження..." : "Оновити пісню"}
          </button>
          <button type="button" onClick={() => router.back()} className="text-gray-400 hover:text-white px-4">
            Скасувати
          </button>
        </div>
      </form>
    </main>
  );
}