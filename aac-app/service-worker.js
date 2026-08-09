/* ===== 阿霖的溝通板 - Service Worker (PWA 離線支援) ===== */

const CACHE_NAME = 'alin-aac-v2';
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

// 安裝 Service Worker - 快取核心資源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('PWA v2: 快取資源中...');
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

// 攔截請求 - Network First（先網路後快取）
self.addEventListener('fetch', (event) => {
  event.respondWith(
    // 先嘗試從網路取得最新資源
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          // 同時更新快取
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // 網路失敗才回傳快取（離線模式）
        return caches.match(event.request);
      })
  );
});
