const CACHE_NAME = 'chordchart-cache-v2';

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

  // Запросы за страницами (навигация)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(async () => {
          // Ищем точное совпадение страницы в кэше
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Если точной страницы нет, пробуем отдать главную или любую закэшированную страницу
          const fallbackResponse = await caches.match('/');
          if (fallbackResponse) {
            return fallbackResponse;
          }
          // Крайний запасной вариант, чтобы не было ошибки ERR_FAILED
          return new Response('Offline mode. Please check your connection.', {
            status: 200,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        })
    );
    return;
  }

  // Для остальных ресурсов (скрипты, стили, картинки) стандартный Cache First / Network First
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