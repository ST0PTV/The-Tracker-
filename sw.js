/* The Tracker – Service Worker. Speichert nur App-Dateien, keine Nutzerdaten.
   Bei jeder Änderung an den Dateien CACHE_VERSION erhöhen (und js/core/version.js abgleichen).
   Strategie wie im Rezeptbuch: erst Netz (immer neueste Version), offline aus dem Cache.
   Wichtig: Die Origin st0ptv.github.io teilen sich mehrere Apps. Beim Aufräumen nur EIGENE Caches (tt-cache-…) löschen. */
const CACHE_VERSION = 11;
const CACHE = `tt-cache-v${CACHE_VERSION}`;

const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/app.js',
  'js/core/util.js',
  'js/core/store.js',
  'js/core/profile.js',
  'js/core/settings.js',
  'js/core/ui.js',
  'js/core/sheet.js',
  'js/core/icons.js',
  'js/core/theme.js',
  'js/core/viewport-gap.js',
  'js/core/version.js',
  'js/core/format.js',
  'js/core/info.js',
  'js/core/tracker-card.js',
  'js/features/food/foods.js',
  'js/features/food/portions.js',
  'js/features/food/off.js',
  'js/features/food/custom.js',
  'js/features/food/ocr.js',
  'js/features/food/barcode.js',
  'js/features/journal/food-form.js',
  'js/features/journal/journal.js',
  'js/features/journal/day-card.js',
  'js/features/journal/add-sheet.js',
  'js/features/journal/amount-sheet.js',
  'js/features/dev/demo.js',
  'js/features/drinks/caffeine-model.js',
  'js/features/drinks/alcohol-model.js',
  'js/features/drinks/alcohol.js',
  'js/features/drinks/alcohol-card.js',
  'js/features/drinks/caffeine.js',
  'js/features/drinks/caffeine-chart.js',
  'js/features/drinks/caffeine-card.js',
  'js/features/drinks/water.js',
  'js/features/drinks/water-card.js',
  'js/features/drinks/drinks-settings.js',
  'js/features/supp/catalog.js',
  'js/features/supp/supplements.js',
  'js/features/supp/supp-card.js',
  'js/features/goal/weightgoal.js',
  'js/features/goal/weight.js',
  'js/features/goal/weight-card.js',
  'js/features/goal/wgoal-view.js',
  'js/features/me/body-view.js',
  'js/features/heute.js',
  'js/features/quick-add.js',
  'js/features/rezepte.js',
  'js/features/training.js',
  'js/features/ich.js',
  'data/bls.json',
  'vendor/zxing.min.js',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(PRECACHE.map((f) => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('tt-cache-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // z. B. später Open Food Facts
  e.respondWith(
    // no-cache: beim Server nachfragen (GitHub Pages liefert sonst bis zu 10 Minuten alte Dateien)
    fetch(e.request, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html')))
  );
});
