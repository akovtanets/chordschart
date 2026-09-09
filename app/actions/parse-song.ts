"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";
const pdf = require("pdf-parse-fork");

/**
* Функція для розпізнавання пісні та розбиття її на секції
* Підтримує PDF, DOCX та зображення (JPG/PNG).
*/
export async function processFileAction(formData: FormData) {
  const file = formData.get("file") as File;
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!file) return { success: false, error: "Файл не отримано на сервері" };
  if (!apiKey) return { success: false, error: "API Ключ не налаштований у системі" };

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type;

    let prompt = "";
    let imagePart = null;

    // Перевіряємо, чи є файл зображенням
    const isImage = mimeType.startsWith("image/") || file.name.match(/\.(jpg|jpeg|png|webp)$/i);

    if (isImage) {
      imagePart = {
        inlineData: {
          data: buffer.toString("base64"),
          mimeType: mimeType || "image/jpeg",
        },
      };

      prompt = `
        Ти — професійний музичний редактор. Твоє завдання: проаналізувати це зображення з текстом пісні та акордами, після чого перетворити їх на структурований JSON для професійної верстки.

        ПРАВИЛА ОБРОБКИ ДЛЯ ТОЧНОСТІ:
        1. Розбий пісню на логічні секції. ДОЗВОЛЕНІ ТИПИ СЕКЦІЙ: Intro, Verse, Chorus, Bridge, Outro, Interlude, Instrumental, Solo, Tag, Pre-Chorus.
        2. КРИТИЧНО ВАЖЛИВО: Якщо в тексті є слова "Interlude", "Instrumental", "Програш" або просто набір акордів між куплетами, обов'язково виділяй їх в ОКРЕМУ секцію з відповідним "type" (наприклад, "Interlude" або "Instrumental"). НЕ залишай їх як звичайний текст всередині Verse чи Chorus.
        3. АКОРДИ: Якщо акорд у оригіналі стоїть над конкретною літерою, встав його у квадратних дужках ПЕРЕД цією літерою.
           Приклад: якщо "C" стоїть над "п" у слові "непослух", результат має бути "непо[C]слух".
        4. ПРІОРИТЕТ БЕМОЛІВ: ЗАМІНИ ВСІ ДІЄЗИ НА БЕМОЛІ (A# -> Bb, C# -> Db, D# -> Eb, F# -> Gb, G# -> Ab).
        5. Якщо акорди написані окремим рядком, інтегруй їх точно в текст під ними. Якщо це програш без слів, просто залиш рядок з акордами.

        СТРУКТУРА JSON (поверни тільки об'єкт):
        {
          "title": "Назва пісні",
          "author": "Виконавець",
          "key": "Тональність (наприклад: Eb)",
          "sections": [
            {
              "type": "Verse 1",
              "lines": [
                "Рядок [Eb]тексту з [Ab]акордами",
                "Наступний [Bb]рядок"
              ]
            }
          ]
        }
      `;
    } else {
      let rawText = "";

      if (mimeType === "application/pdf" || file.name.endsWith(".pdf")) {
        const data = await pdf(buffer);
        rawText = data.text;
      } else if (
        mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.name.endsWith(".docx")
      ) {
        const result = await mammoth.extractRawText({ buffer });
        rawText = result.value;
      } else {
        rawText = buffer.toString("utf-8");
      }

      const cleanText = rawText
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "")
        .trim()
        .substring(0, 12000);

      if (!cleanText) {
        throw new Error("Файл порожній або текст не вдалося розпізнати");
      }

      prompt = `
        Ти — професійний музичний редактор. Твоє завдання: перетворити текст пісні на структурований JSON для професійної верстки.

        ПРАВИЛА ОБРОБКИ ДЛЯ ТОЧНОСТІ:
        1. Розбий пісню на логічні секції. ДОЗВОЛЕНІ ТИПИ СЕКЦІЙ: Intro, Verse, Chorus, Bridge, Outro, Interlude, Instrumental, Solo, Tag, Pre-Chorus.
        2. КРИТИЧНО ВАЖЛИВО: Якщо в тексті є слова "Interlude", "Instrumental", "Програш" або просто набір акордів між куплетами, обов'язково виділяй їх в ОКРЕМУ секцію з відповідним "type" (наприклад, "Interlude" або "Instrumental"). НЕ залишай їх як звичайний текст всередині Verse чи Chorus.
        3. АКОРДИ: Якщо акорд у оригіналі стоїть над конкретною літерою, встав його у квадратних дужках ПЕРЕД цією літерою.
           Приклад: якщо "C" стоїть над "п" у слові "непослух", результат має бути "непо[C]слух".
        4. ПРІОРИТЕТ БЕМОЛІВ: ЗАМІНИ ВСІ ДІЄЗИ НА БЕМОЛІ (A# -> Bb, C# -> Db, D# -> Eb, F# -> Gb, G# -> Ab).
        5. Якщо акорди написані окремим рядком, інтегруй їх точно в текст під ними. Якщо це програш без слів, просто залиш рядок з акордами.

        СТРУКТУРА JSON (поверни тільки об'єкт):
        {
          "title": "Назва пісні",
          "author": "Виконавець",
          "key": "Тональність (наприклад: Eb)",
          "sections": [
            {
              "type": "Verse 1",
              "lines": [
                "Рядок [Eb]тексту з [Ab]акордами",
                "Наступний [Bb]рядок"
              ]
            }
          ]
        }

        ТЕКСТ ДЛЯ ОБРОБКИ:
        ${cleanText}
      `;
    }

    let maxRetries = 3;
    let attempt = 0;
    let cleanJsonText = "";

    while (attempt < maxRetries) {
      try {
        // Передаємо масив вмісту, якщо це зображення, або рядок, якщо це текст
        const contentPayload = imagePart ? [prompt, imagePart] : prompt;
        const result = await model.generateContent(contentPayload);
        const response = await result.response;
        cleanJsonText = response.text();
        break;
      } catch (apiError: any) {
        attempt++;
        const isQuotaExceeded = apiError.message?.includes('429') || apiError.message?.includes('Too Many Requests');
        const isOverloaded = apiError.message?.includes('503') || apiError.message?.includes('overloaded');

        if ((isQuotaExceeded || isOverloaded) && attempt < maxRetries) {
          const waitTime = isQuotaExceeded ? 20000 : 5000;
          console.log(`⚠️ Помилка API. Спроба ${attempt}. Чекаємо ${waitTime/1000}с...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          throw apiError;
        }
      }
    }

    const data = JSON.parse(cleanJsonText);

    return {
      success: true,
      data: {
        title: data.title || "Unknown Title",
        author: data.author || "Unknown Artist",
        key: data.key || "",
        sections: data.sections || []
      }
    };

  } catch (e: any) {
    console.error("AI Error Details:", e);
    return {
      success: false,
      error: e.message?.includes('429')
        ? "Ліміт запитів вичерпано. Почекайте 30 секунд і спробуйте знову."
        : e.message?.includes('503')
        ? "Сервери перевантажені. Спробуйте ще раз через хвилину."
        : "Помилка аналізу: " + (e.message || "невідома помилка")
    };
  }
}