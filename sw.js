// ALIYA ERP — сервис-воркер. Страница всегда берётся из сети (свежая версия), офлайн открывается последняя сохранённая.
const CACHE = 'aliya-v1';
const SHELL = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/favicon-32.png'];
const LIBS = ['https://cdn.jsdelivr.net/'];            // библиотека Supabase

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // данные и вход (Supabase) и Telegram никогда не кэшируем
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in') || url.hostname.endsWith('telegram.org')) return;
  // своя страница и файлы: сначала сеть, при отсутствии связи — сохранённая копия
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(req).then((r) => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return r;
    }).catch(() => caches.match(req).then((m) => m || (req.mode === 'navigate' ? caches.match('/index.html') : undefined))));
    return;
  }
  // библиотека с CDN: из кэша сразу, обновление в фоне
  if (LIBS.some((p) => req.url.startsWith(p))) {
    e.respondWith(caches.match(req).then((m) => {
      const net = fetch(req).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return r; }).catch(() => m);
      return m || net;
    }));
  }
});
