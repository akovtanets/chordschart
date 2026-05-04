"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function SetlistsListPage() {
  const [lists, setLists] = useState<any[]>([]);

  useEffect(() => {
    async function fetchLists() {
      const { data } = await supabase.from("setlists").select("*").order("created_at", { ascending: false });
      if (data) setLists(data);
    }
    fetchLists();
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white p-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-bold">Сет-листи</h1>
          <Link href="/create-setlist" className="bg-blue-600 px-6 py-3 rounded-xl font-bold">+ Створити</Link>
        </div>

        <div className="grid gap-4">
          {lists.map(list => (
            <Link 
              key={list.id} 
              href={`/setlist/${list.id}`}
              className="bg-gray-900/50 border border-gray-800 p-6 rounded-[30px] hover:border-blue-500/50 transition-all group"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold mb-1 group-hover:text-blue-400 transition-colors">{list.title}</h2>
                  <p className="text-gray-500">{list.song_ids.length} пісень</p>
                </div>
                <div className="text-blue-500">Відкрити →</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}