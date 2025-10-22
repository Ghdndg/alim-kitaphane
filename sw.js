// Service Worker для оффлайн-поддержки КрымЧиталка
const CACHE_NAME = 'crimchitalka-v1.0.0';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Ресурсы для предварительного кеширования
const STATIC_ASSETS = [
  '/',
  '/reader.html',
  '/styles.css', 
  '/reader.css',
  '/script.js',
  '/reader.js',
  '/manifest.json',
  // Шрифты и иконки
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  // Базовые файлы книги
  '/book/chapters.json',
  '/book/ch1.html',
  '/book/ch2.html'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activated');
        return self.clients.claim();
      })
  );
});

// Обработка запросов (стратегия Cache First с Network Fallback)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Игнорировать запросы к внешним API и chrome-extension
  if (
    !url.origin.includes(self.location.origin) ||
    url.protocol === 'chrome-extension:' ||
    request.method !== 'GET'
  ) {
    return;
  }

  // Стратегия для разных типов контента
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
  } else if (isBookContent(request)) {
    event.respondWith(cacheFirstStrategy(request, DYNAMIC_CACHE));
  } else {
    event.respondWith(networkFirstStrategy(request));
  }
});

// Проверка, является ли запрос статическим ресурсом
function isStaticAsset(request) {
  const url = new URL(request.url);
  return (
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.includes('fonts.googleapis.com') ||
    url.pathname.includes('cdnjs.cloudflare.com')
  );
}

// Проверка, является ли запрос контентом книги
function isBookContent(request) {
  const url = new URL(request.url);
  return (
    url.pathname.includes('/book/') ||
    url.pathname.includes('/chapters/') ||
    url.pathname.endsWith('.json')
  );
}

// Стратегия Cache First (сначала кеш, затем сеть)
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Serving from cache:', request.url);
      return cachedResponse;
    }

    console.log('[SW] Fetching from network:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Клонируем ответ для кеширования
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
      console.log('[SW] Cached new resource:', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first strategy failed:', error);
    return createOfflinePage();
  }
}

// Стратегия Network First (сначала сеть, затем кеш)
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return createOfflinePage();
  }
}

// Создание офлайн страницы
function createOfflinePage() {
  const offlineHTML = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Офлайн - КрымЧиталка</title>
      <style>
        body {
          font-family: system-ui, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          background: #f8f9fa;
          color: #1a1a1a;
          text-align: center;
        }
        h1 { color: #4f46e5; margin-bottom: 1rem; }
        p { max-width: 400px; line-height: 1.6; margin-bottom: 2rem; }
        button {
          background: #4f46e5;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
        }
        button:hover { background: #4338ca; }
        .offline-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.6;
        }
      </style>
    </head>
    <body>
      <div class="offline-icon">📚</div>
      <h1>Нет подключения к интернету</h1>
      <p>Вы находитесь в офлайн режиме. Некоторые функции могут быть недоступны.</p>
      <button onclick="window.location.reload()">Обновить страницу</button>
    </body>
    </html>
  `;
  
  return new Response(offlineHTML, {
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': 'no-cache'
    }
  });
}

// Обработка сообщений от клиентских скриптов
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'CACHE_BOOK_CHAPTER':
      cacheBookChapter(data.url);
      break;
      
    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0].postMessage({ type: 'CACHE_STATUS', data: status });
      });
      break;
      
    case 'CLEAR_CACHE':
      clearCache().then(() => {
        event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
      });
      break;
  }
});

// Кеширование главы книги
async function cacheBookChapter(url) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    await cache.add(url);
    console.log('[SW] Cached book chapter:', url);
  } catch (error) {
    console.error('[SW] Failed to cache book chapter:', error);
  }
}

// Получение статуса кеша
async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    status[cacheName] = {
      count: keys.length,
      size: await getCacheSize(cache, keys)
    };
  }
  
  return status;
}

// Расчет размера кеша
async function getCacheSize(cache, keys) {
  let totalSize = 0;
  
  for (const key of keys) {
    try {
      const response = await cache.match(key);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    } catch (error) {
      console.warn('[SW] Failed to get size for:', key.url);
    }
  }
  
  return totalSize;
}

// Очистка кеша
async function clearCache() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
  console.log('[SW] All caches cleared');
}

// Периодическая синхронизация (если поддерживается)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reading-progress') {
    event.waitUntil(syncReadingProgress());
  }
});

// Синхронизация прогресса чтения
async function syncReadingProgress() {
  try {
    // Здесь можно добавить логику синхронизации прогресса
    // с сервером при восстановлении соединения
    console.log('[SW] Syncing reading progress...');
  } catch (error) {
    console.error('[SW] Failed to sync reading progress:', error);
  }
}

// Push уведомления (если включены)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'Новое уведомление от КрымЧиталка',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: data.tag || 'general',
    renotify: true,
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Открыть',
        icon: '/icons/open-action.png'
      },
      {
        action: 'close',
        title: 'Закрыть',
        icon: '/icons/close-action.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'КрымЧиталка', options)
  );
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' })
        .then((clientList) => {
          if (clientList.length > 0) {
            return clientList[0].focus();
          }
          return self.clients.openWindow('/');
        })
    );
  }
});

console.log('[SW] Service Worker registered successfully');