/* The Tracker – Service Worker. Speichert nur App-Dateien, keine Nutzerdaten.
   Bei jeder Änderung an den Dateien CACHE_VERSION erhöhen (und js/core/version.js abgleichen).
   Strategie wie im Rezeptbuch: erst Netz (immer neueste Version), offline aus dem Cache.
   Wichtig: Die Origin st0ptv.github.io teilen sich mehrere Apps. Beim Aufräumen nur EIGENE Caches (tt-cache-…) löschen. */
const CACHE_VERSION = 25;
const CACHE = `tt-cache-v${CACHE_VERSION}`;

const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'css/training.css',
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
  'js/features/food/events.js',
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
  'js/features/recipes/recipe-data.js',
  'js/features/recipes/recipe-data-2.js',
  'js/features/recipes/ingredients.js',
  'js/features/recipes/recipes.js',
  'js/features/recipes/ginger.js',
  'js/features/recipes/parts.js',
  'js/features/recipes/recipe-view.js',
  'js/features/recipes/own-view.js',
  'js/features/recipes/start-view.js',
  'js/features/recipes/week.js',
  'js/features/recipes/shopping.js',
  'js/features/recipes/week-view.js',
  'js/features/recipes/shop-view.js',
  'js/features/recipes/pantry.js',
  'js/features/recipes/pantry-view.js',
  'js/core/lock.js',
  'js/features/me/lock-view.js',
  'js/features/cycle/model.js',
  'js/features/cycle/cycle.js',
  'js/features/cycle/cycle-card.js',
  'js/features/cycle/cycle-views.js',
  'js/features/cycle/cycle-knowledge.js',
  'js/features/cycle/cycle-settings.js',
  'js/features/cycle/routes.js',
  'js/features/training.js',
  'js/features/training/analysis-anim.js',
  'js/features/training/analysis-view.js',
  'js/features/training/analysis.js',
  'js/features/training/anim-bar.js',
  'js/features/training/anim-data.js',
  'js/features/training/anim-index.js',
  'js/features/training/anim-view.js',
  'js/features/training/assistant-view.js',
  'js/features/training/body3d.js',
  'js/features/training/controls.js',
  'js/features/training/cycle-view.js',
  'js/features/training/cycle.js',
  'js/features/training/demo.js',
  'js/features/training/device.js',
  'js/features/training/diary-view.js',
  'js/features/training/exercises-view.js',
  'js/features/training/exercises.js',
  'js/features/training/figure.js',
  'js/features/training/gear-view.js',
  'js/features/training/glossary.js',
  'js/features/training/group-view.js',
  'js/features/training/groups.js',
  'js/features/training/history.js',
  'js/features/training/icons.js',
  'js/features/training/info.js',
  'js/features/training/input.js',
  'js/features/training/main.js',
  'js/features/training/model.js',
  'js/features/training/motion-female.js',
  'js/features/training/motion-front.js',
  'js/features/training/motion.js',
  'js/features/training/muscle-info.js',
  'js/features/training/muscle-pick.js',
  'js/features/training/muscle-view.js',
  'js/features/training/onboarding.js',
  'js/features/training/plan-analysis-view.js',
  'js/features/training/plan-analysis.js',
  'js/features/training/plan-apply.js',
  'js/features/training/plan-body-view.js',
  'js/features/training/plan-body.js',
  'js/features/training/plan-builder.js',
  'js/features/training/plan-changes.js',
  'js/features/training/plan-duration.js',
  'js/features/training/plan-sync.js',
  'js/features/training/plans-view.js',
  'js/features/training/plans.js',
  'js/features/training/plates.js',
  'js/features/training/pool.js',
  'js/features/training/progress-info.js',
  'js/features/training/progress-view.js',
  'js/features/training/progress.js',
  'js/features/training/progression-view.js',
  'js/features/training/progression.js',
  'js/features/training/rest.js',
  'js/features/training/routine-data.js',
  'js/features/training/routine-view.js',
  'js/features/training/routines.js',
  'js/features/training/schedule.js',
  'js/features/training/session.js',
  'js/features/training/set-info.js',
  'js/features/training/set-view.js',
  'js/features/training/sets.js',
  'js/features/training/settings-view.js',
  'js/features/training/sheet.js',
  'js/features/training/store.js',
  'js/features/training/superset.js',
  'js/features/training/swap-alt.js',
  'js/features/training/timed.js',
  'js/features/training/timer.js',
  'js/features/training/training-view.js',
  'js/features/training/ui.js',
  'js/features/training/util.js',
  'js/features/training/warmup-info.js',
  'js/features/training/warnings.js',
  'js/features/training/week.js',
  'js/features/ich.js',
  'js/features/analyse/insights.js',
  'js/features/analyse/micro.js',
  'js/features/analyse/dge.js',
  'js/features/analyse/deficits.js',
  'js/features/analyse/stomach.js',
  'js/features/analyse/data.js',
  'js/features/analyse/charts.js',
  'js/features/analyse/analyse-view.js',
  'js/features/analyse/analyse-pages.js',
  'js/features/analyse/stomach-view.js',
  'js/features/analyse/routes.js',
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
