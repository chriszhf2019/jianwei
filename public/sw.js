/**
 * 见微静态资源缓存：只缓存带内容哈希的 /assets/*，API 永不缓存。
 * 目标：重复访问时静态资源直接命中本地缓存，首屏不再重新下载。
 */
const CACHE_NAME = 'jianwei-assets-v1';
const MAX_ENTRIES = 200;

async function trimCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_ENTRIES) return;
  for (const key of keys.slice(0, keys.length - MAX_ENTRIES)) {
    await cache.delete(key);
  }
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('jianwei-assets-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // API 与鉴权请求不进缓存
  if (url.pathname.startsWith('/api/')) return;

  // 带哈希的静态资源：缓存优先
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) {
          await cache.put(request, response.clone());
          await trimCache(cache);
        }
        return response;
      })()
    );
    return;
  }

  // 页面导航：网络优先，失败时用缓存兜底
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put('/', response.clone());
          }
          return response;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match('/')) || Response.error();
        }
      })()
    );
  }
});
