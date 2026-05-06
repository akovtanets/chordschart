import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/songs'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    
    // Якщо сталася помилка обміну — виводимо її в консоль сервера
    console.error('Auth callback error:', error.message)
  }

  // Якщо коду немає або сталася помилка, але ми бачимо access_token в хеші (як у вашому випадку),
  // це означає, що клієнтська частина Supabase сама підхопить сесію.
  // Тому ми просто редиректимо на /songs, а клієнтський SDK зробить свою роботу.
  return NextResponse.redirect(`${origin}/songs`)
}