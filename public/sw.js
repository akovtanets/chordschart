const CACHE_NAME = 'chordchart-cache-v3';

// Установка воркера
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Активация и очистка старых кэшей
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Перехват сетевых запросов
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Для навигационных запросов (страницы сайта)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Если сеть есть — клонируем и сохраняем страницу в кэш
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(async () => {
          // 1. Проверяем, есть ли точный адрес в кэше
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // 2. Если точного адреса нет, ищем главную или любую другую закэшированную страницу приложения
          const allCache = await caches.open(CACHE_NAME);
          const keys = await allCache.keys();
          const foundKey = keys.find(key => key.url.includes('/setlist/') || key.url.includes('/setlists') || key.url.endsWith('/'));
          
          if (foundKey) {
            const fallbackPage = await allCache.match(foundKey);
            if (fallbackPage) return fallbackPage;
          }

          // 3. Последний рубеж: если совсем ничего нет в кэше, возвращаем базовую разметку, чтобы подгрузился React и localStorage
          return new Response(
            `<!DOCTYPE html>
            <html lang="uk">
              <head><meta charset="utf-8"><title>ChordsChart Offline</title></head>
              <body>
                <div style="padding: 40px; font-family: sans-serif; background: #121212; color: #fff; text-align: center;">
                  <h2>Режим офлайн</h2>
                  <p>Сторінка не була закешована. Будь ласка, перейдіть на головну або відкрийте список сетлістів онлайн хоча б раз.</p>
                  <a href="/setlists" style="color: #38bdf8; text-decoration: underline;">Перейти до сетлістів</a>
                </div>
              </body>
            </html>`,
            { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // Для статики, скриптов и картинок
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(event.request).then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
      );
    })
  );
});