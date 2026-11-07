import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Відправляємо сповіщення ТОБІ на пошту
    // (Увага: поки домен не верифіковано в Resend, "to" має бути твоїм акаунтним email)
    const { data, error } = await resend.emails.send({
      from: 'Chordschart Leads <onboarding@resend.dev>',
      to: ['alexkoww@gmail.com'], // <--- Впиши сюди свій email
      subject: '🔥 Новий лід на Chordschart PRO!',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; padding: 20px; border: 1px solid #eaeaea; border-radius: 12px;">
          <h2 style="color: #2563eb; margin-top: 0;">З'явився новий бажаючий на PRO! 🎸</h2>
          <p>Хтось щойно залишив свій email у формі раннього доступу на сторінці тарифів.</p>
          
          <div style="background: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #666;">Email користувача:</p>
            <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #000;">${email}</p>
          </div>

          <p style="font-size: 12px; color: #888;">Цей запит також збережено у таблиці <code>pro_leads</code> в Supabase.</p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}