import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Получаем токен с фронтенда
    const { token } = await request.json();
    
    // Достаем приватный ключ из .env.local
    const secretKey = process.env.TURNSTILE_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json({ success: false, error: 'Secret key missing' }, { status: 500 });
    }

    // Формируем запрос к Cloudflare
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);

    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    const verifyData = await verifyRes.json();

    // Если Cloudflare сказал, что токен поддельный или просрочен
    if (!verifyData.success) {
      return NextResponse.json({ success: false, error: 'Invalid captcha' }, { status: 400 });
    }

    // Если всё отлично, даем зеленый свет
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}