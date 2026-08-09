/* ===== 阿霖的溝通板 - Service Worker (PWA 離線支援) ===== */

const CACHE_NAME = 'alin-aac-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './data/vocabulary.json',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 安裝 Service Worker - 快取所有資源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('PWA: 快取資源中...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// 啟動 Service Worker - 清理舊快取
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('PWA: 清理舊快取', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// 攔截請求 - 優先從快取讀取，失敗才走網路
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response; // 從快取回傳
        }
        // 快取沒有才走網路
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });
      })
      .catch(() => {
        // 完全離線時回傳空白頁面
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      })
  );
});
