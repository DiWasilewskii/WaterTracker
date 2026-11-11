// Офлайн-кеш для веб-версії: файли гри — з мережі з резервом у кеші, API погоди не кешується
const CACHE = 'aqua-tamagotchi-v5';
const ASSETS = [
    './',
    'index.html',
    'css/style.css',
    'js/app.js',
    'js/weather.js',
    'js/lines.js',
    'js/schedule.js',
    'js/chart.js',
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
    // network-first: онлайн завжди свіжа версія, офлайн — з кешу
    e.respondWith(
        caches.open(CACHE).then(cache =>
            fetch(e.request).then(res => {
                if (res.ok) cache.put(e.request, res.clone());
                return res;
            }).catch(() => cache.match(e.request))
        )
    );
});
