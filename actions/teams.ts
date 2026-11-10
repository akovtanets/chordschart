'use server';

import { createClient } from '@supabase/supabase-js';

// Используем админ-клиент для защищенного доступа к представлению team_members_with_emails
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function searchUserForTeam(emailQuery: string) {
  if (!emailQuery || emailQuery.trim().length < 2) {
    return [];
  }

  // Запрос с лимитом, чтобы исключить массовую выгрузку базы через консоль
  const { data, error } = await supabaseAdmin
    .from('team_members_with_emails')
    .select('user_id, email')
    .ilike('email', `%${emailQuery.trim()}%`)
    .limit(5);

  if (error) {
    console.error('Помилка пошуку користувача:', error);
    return [];
  }

  return data;
}