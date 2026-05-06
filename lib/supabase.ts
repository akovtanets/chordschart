import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("ОШИБКА: Ключи Supabase не найдены в .env.local!");
}

// Використовуємо createBrowserClient для автоматичної синхронізації кук
export const supabase = createBrowserClient(
  supabaseUrl || '', 
  supabaseAnonKey || ''
)