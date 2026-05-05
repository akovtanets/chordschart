"use client";

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  // Добавляем состояние для переключения видов вручную, если линки не сработают
  const [view, setView] = useState<"sign_in" | "sign_up">("sign_up");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.push('/setlists');
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#111] border border-gray-800 p-8 rounded-3xl shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">
            Chord<span className="text-blue-500">Chart</span>
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            {view === "sign_up" ? "Реєстрація нового профілю" : "Вхід у кабінет"}
          </p>
        </div>
        
        <Auth
          supabaseClient={supabase}
          view={view}
          appearance={{ theme: ThemeSupa }}
          theme="dark"
          showLinks={true}
          providers={['google', 'apple']}
          localization={{
            variables: {
              sign_up: {
                email_label: 'Email',
                password_label: 'Пароль',
                button_label: 'Зареєструватися',
                link_text: 'Немає акаунту? Зареєструйтеся',
              },
              sign_in: {
                email_label: 'Email',
                password_label: 'Пароль',
                button_label: 'Увійти',
                link_text: 'Вже є акаунт? Увійдіть',
              }
            }
          }}
        />

        {/* Кнопка-костыль на случай, если линки внутри Auth не отобразятся */}
        <button 
          onClick={() => setView(view === "sign_in" ? "sign_up" : "sign_in")}
          className="w-full mt-4 text-xs text-blue-500 hover:underline text-center"
        >
          {view === "sign_in" ? "Потрібен новий акаунт? Реєстрація" : "Вже маєте акаунт? Увійти"}
        </button>
      </div>
    </div>
  );
}