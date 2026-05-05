'use server'

import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";

// Використовуємо надійний парсер для PDF на сервері
const pdf = require("pdf-parse-fork");

/**
 * Основна функція для обробки файлів (PDF, DOCX, TXT) через Gemini AI
 */
export async function processFileAction(formData: FormData) {
  const file = formData.get("file") as File;
  const apiKey = process.env.GOOGLE_API_KEY;

  // Базова перевірка вхідних даних
  if (!file) return { success: false, error: "Файл не отримано на сервері" };
  if (!apiKey) return { success: false, error: "API Ключ не налаштований у системі" };

  try {
    // Ініціалізація клієнта
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Використовуємо модель gemini-2.5-flash, яка доступна у вашому проекті
    // Налаштовуємо responseMimeType для отримання чистого JSON об'єкта
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    let rawText = "";

    // 1. Екстракція тексту залежно від формату
    if (file.type === "application/pdf") {
      const data = await pdf(buffer);
      rawText = data.text;
    } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
    } else {
      rawText = await file.text();
    }

    // Очищення тексту від невидимих символів та обмеження довжини
    const cleanText = rawText
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "")
      .trim()
      .substring(0, 10000);

    if (!cleanText) {
      throw new Error("Файл порожній або текст не вдалося розпізнати");
    }

    // 2. Промпт для ШІ з вашими правилами нотації
    const prompt = `
      Ти — музичний редактор. Твоє завдання: перетворити текст пісні на JSON.
      
      ПРАВИЛА:
      1. Знайди акорди та встав їх у текст у квадратних дужках ПЕРЕД складами, наприклад: [Bb]Слова.
      2. ПРІОРИТЕТ БЕМОЛІВ: ЗАМІНИ ВСІ ДІЄЗИ НА БЕМОЛІ. Наприклад: A# -> Bb, C# -> Db, D# -> Eb, F# -> Gb, G# -> Ab.
      3. Якщо акорди написані окремим рядком над словами, інтегруй їх у текст саме над тими складами, де вони мають звучати.
      
      СТРУКТУРА JSON (поверни тільки об'єкт):
      {
        "title": "Назва пісні",
        "author": "Виконавець або автор",
        "content": "Весь текст пісні з [акордами]",
        "key": "Тональність (використовуй тільки бемолі, наприклад Eb, а не D#)"
      }

      ТЕКСТ ПІСНІ ДЛЯ ОБРОБКИ:
      ${cleanText}
    `;

    // 3. Запит до Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiResponseText = response.text();

    // Оскільки ми вказали responseMimeType: "application/json", 
    // відповідь має бути валідним JSON без зайвих символів.
    const data = JSON.parse(aiResponseText);

    return { 
      success: true, 
      data: {
        title: data.title || "",
        content: data.content || "",
        author: data.author || "",
        key: data.key || ""
      } 
    };

  } catch (e: any) {
    console.error("AI Error Details:", e);
    
    // Обробка помилок активації або доступу
    if (e.message?.includes('404') || e.message?.includes('activating')) {
      return { 
        success: false, 
        error: "Модель ще активується або версія не підтримується. Спробуйте ще раз через кілька хвилин." 
      };
    }

    return { 
      success: false, 
      error: "Помилка аналізу: " + (e.message || "невідома помилка") 
    };
  }
}