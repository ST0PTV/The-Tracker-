// Einstieg: Speicher prüfen, Erscheinung setzen, Router mit allen Bereichen starten.
import * as store from './core/store.js';
import { startRouter, toast, setTabAction } from './core/ui.js';
import { getSettings } from './core/settings.js';
import { applyTheme, appearanceOf } from './core/theme.js';
import { initViewportGap } from './core/viewport-gap.js';
import './core/profile.js';
import { heuteView, heuteDay } from './features/heute.js';
import { openQuickAdd } from './features/quick-add.js';
import { rezepteRoutes } from './features/rezepte.js';
import { trainingRoutes, TRAINING_PATHS } from './features/training.js';
import { ichRoutes } from './features/ich.js';
import { analyseRoutes } from './features/analyse/routes.js';
import { loadFoods } from './features/food/foods.js';
import { cycleRoutes } from './features/cycle/routes.js';
import { lockSettingsView, lockScreen } from './features/me/lock-view.js';
import { isLocked } from './core/lock.js';
import { closeAllSheets } from './core/sheet.js';

const boot = store.init();
applyTheme(appearanceOf(getSettings()));
initViewportGap(); // Streifen unter dem Fenster im iOS-Home-Bildschirm (Klasse .tt-gap)

// Schlägt ein Speichern fehl, bleibt oben ein Banner, bis das nächste Speichern klappt.
const saveBar = document.getElementById('savebar');
store.onWriteResult((ok) => { if (saveBar) saveBar.hidden = ok; });

// „+“ in der Tab-Leiste: auf „Heute“ für den gewählten Tag, sonst für heute
setTabAction((path) => { if (!isLocked('app')) openQuickAdd(path === '/' ? heuteDay() : undefined); });

const routes = {
  '/': heuteView,
  ...rezepteRoutes,
  ...trainingRoutes,
  ...ichRoutes,
  ...analyseRoutes,
  ...cycleRoutes,
  '/ich/sperre': lockSettingsView
};
// PIN-Sperre für die ganze App (core/lock.js): jede Seite zeigt dann den Sperrbildschirm, ohne Tab-Leiste.
const guarded = {};
for (const [path, view] of Object.entries(routes)) {
  guarded[path] = (rr) => {
    const locked = isLocked('app');
    document.body.classList.toggle('tt-locked', locked);
    document.body.classList.toggle('tt-train', !locked && TRAINING_PATHS.includes(path)); // Stil des Trainingsbereichs nur dort (css/training.css)
    return locked ? lockScreen(rr, 'app') : view(rr);
  };
}
const rerender = startRouter(guarded);

// Ziele geändert → offene Seite neu zeichnen (z. B. Rezepte zeigen das neue Tagesziel).
document.addEventListener('tt-profile', () => rerender());
// Journal geändert (Eintrag, Favorit, Anzeige) → Seite neu zeichnen
document.addEventListener('tt-journal', () => rerender());
// Zyklus geändert oder Sperre an/aus → neu zeichnen; beim Sperren offene Sheets schließen
document.addEventListener('tt-cycle', () => rerender());
document.addEventListener('tt-lock', () => { if (isLocked('app') || isLocked('zyklus')) closeAllSheets(); rerender(); });

// Lebensmitteldaten (ca. 1,4 MB) im Hintergrund laden, damit die Suche sofort bereit ist
const idle = globalThis.requestIdleCallback || ((fn) => setTimeout(fn, 800));
idle(() => loadFoods());

if (!boot.ok) toast('Gespeicherte Daten stammen aus einer neueren Version. Bitte App neu laden.', { error: true });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* Offline-Betrieb ist optional */ });
  });
}
