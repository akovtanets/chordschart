import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  const pathname = request.nextUrl.pathname;

  // Визначаємо шляхи, які доступні ТІЛЬКИ авторизованим користувачам
  const isProtectedRoute = 
    pathname.startsWith('/setlists') || 
    pathname.startsWith('/setlist') || 
    pathname.startsWith('/add-song') || 
    pathname.startsWith('/edit-song');

  // Якщо користувач не залогінений і лізе куди не треба — на сторінку логіну
  if (!session && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Всі інші маршрути (включно з /songs та /song/[id]) автоматично дозволені
  return response
}

export const config = {
  // Запускаємо middleware на всіх сторінках, окрім системних (статика, картинки, api)
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}