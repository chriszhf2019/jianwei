// Service Worker 已下线：清理旧版本注册与缓存，避免缓存过的旧哈希资源影响新发布。
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.registration && self.registration.unregister())
      .then(() => self.clients && self.clients.matchAll().then((clients) => clients.forEach((c) => c.navigate(c.url))))
  );
});
