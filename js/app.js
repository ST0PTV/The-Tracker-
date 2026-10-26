// Einstieg: Speicher prüfen, Erscheinung setzen, Router mit allen Bereichen starten.
import * as store from './core/store.js';
import { startRouter, toast, setTabAction } from './core/ui.js';
import { getSettings } from './core/settings.js';
import { applyTheme, appearanceOf } from './core/theme.js';
import './core/profile.js';
import { heuteView, heuteDay } from './features/heute.js';
import { openQuickAdd } from './features/quick-add.js';
import { rezepteRoutes } from './features/rezepte.js';
import { trainingView } from './features/training.js';
import { ichRoutes } from './features/ich.js';
import { loadFoods } from './features/food/foods.js';

const boot = store.init();
applyTheme(appearanceOf(getSettings()));

// Schlägt ein Speichern fehl, bleibt oben ein Banner, bis das nächste Speichern klappt.
const saveBar = document.getElementById('savebar');
store.onWriteResult((ok) => { if (saveBar) saveBar.hidden = ok; });

// „+“ in der Tab-Leiste: auf „Heute“ für den gewählten Tag, sonst für heute
setTabAction((path) => openQuickAdd(path === '/' ? heuteDay() : undefined));

const rerender = startRouter({
  '/': heuteView,
  ...rezepteRoutes,
  '/training': trainingView,
  ...ichRoutes
});

// Ziele geändert → offene Seite neu zeichnen (z. B. Rezepte zeigen das neue Tagesziel).
document.addEventListener('tt-profile', () => rerender());
// Journal geändert (Eintrag, Favorit, Anzeige) → Seite neu zeichnen
document.addEventListener('tt-journal', () => rerender());

// Lebensmitteldaten (ca. 1,4 MB) im Hintergrund laden, damit die Suche sofort bereit ist
const idle = globalThis.requestIdleCallback || ((fn) => setTimeout(fn, 800));
idle(() => loadFoods());

if (!boot.ok) toast('Gespeicherte Daten stammen aus einer neueren Version. Bitte App neu laden.', { error: true });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* Offline-Betrieb ist optional */ });
  });
}
