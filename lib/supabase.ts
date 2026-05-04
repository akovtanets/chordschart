import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("ОШИБКА: Ключи Supabase не найдены в .env.local!");
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')