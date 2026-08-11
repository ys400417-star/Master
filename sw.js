const CACHE = 'delivery-master-v60-5';
const PRECACHE = ['./', './index.html', './manifest.json'];
// 실시간 데이터(API·지도타일)는 캐시하지 않음
const NO_CACHE = ['api.open-meteo.com', 'mt1.google.com', 'router.project-osrm.org', 'date.nager.at'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (NO_CACHE.some(h => url.hostname.includes(h))) return;

  // 앱 본체(HTML)는 네트워크 우선 + HTTP 캐시 재검증 → 항상 최신 버전, 오프라인이면 캐시
  if (req.mode === 'navigate' || url.pathname.endsWith('index.html')) {
    e.respondWith(
      fetch(req, { cache: 'no-cache' }).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // CDN 자산(tailwind, leaflet, fontawesome, 폰트)은 캐시 우선
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});
