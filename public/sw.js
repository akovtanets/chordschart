const CACHE_NAME = 'chordchart-cache-v1';

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

// Перехват сетевых запросов (Network First, с fallback на кэш)
self.addEventListener('fetch', (event) => {
  // Пропускаем запросы к Supabase или внешним API, если нужно, но страницы кэшируем
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Если сеть есть — клонируем ответ и сохраняем в кэш
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Если интернета нет — ищем страницу в кэше
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Если в кэше нет конкретной страницы, отдаем главную или список (чтобы приложение не падало)
          return caches.match('/setlists');
        });
      })
  );
});