// Service Worker ديال Robaty — كاش أساسي لهيكل التطبيق (app shell)
// كل تحديث فالكود، بدّل رقم النسخة (CACHE_NAME) باش يتجدد الكاش عند المستخدمات

const CACHE_NAME = 'robaty-v4';
const APP_SHELL = [
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// نخدمو من الكاش أولاً، ونرجعو للشبكة كـfallback
// طلبات Gemini API (POST) ماكنديروهاش فالكاش
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => {
        // إيلا ماكانش فالكاش ولا فالشبكة (بلا نت)، نرجعو Response صالح بدل undefined
        return new Response('أنترنت غير متوفر حالياً 📡', {
          status: 503,
          statusText: 'Offline',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      });
    })
  );
});
