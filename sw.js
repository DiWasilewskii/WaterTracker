// Офлайн-кеш для веб-версії: статичні файли — з кешу, API погоди — завжди з мережі
const CACHE = 'aqua-tamagotchi-v1';
const ASSETS = [
    './',
    'index.html',
    'css/style.css',
    'js/app.js',
    'js/weather.js',
    'manifest.json',
    'img/button/glass.png',
    'img/charachter/regular_water.png',
    'img/charachter/drink_water.png',
    'img/charachter/sick_water.png',
    'img/charachter/death_water.png',
    'img/icon-192.png',
    'img/icon-512.png'
];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);
    if (e.request.method !== 'GET' || url.origin !== location.origin) return;
    // stale-while-revalidate
    e.respondWith(
        caches.open(CACHE).then(cache =>
            cache.match(e.request).then(cached => {
                const network = fetch(e.request).then(res => {
                    if (res.ok) cache.put(e.request, res.clone());
                    return res;
                }).catch(() => cached);
                return cached || network;
            })
        )
    );
});
