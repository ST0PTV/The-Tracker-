// Reiter „Training“ (Phase 4): lädt den Trainingsbereich erst beim ersten Öffnen (ca. 0,8 MB Code ohne
// Animationsdaten; die Animationsdaten kommen erst beim Öffnen einer Animation).
import { h } from '../core/util.js';
import { pageHead } from '../core/ui.js';

export const TRAINING_PATHS = ['/training', '/training/plaene', '/training/uebungen', '/training/fortschritt', '/training/routine', '/ich/training'];

let mod = null;

// Stylesheet des Trainingsbereichs einmal einhängen; erst danach zeichnen (kein Aufblitzen ohne Stil).
function loadCss(href) {
  if (document.querySelector(`link[data-tt="${href}"]`)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = href; l.dataset.tt = href;
    l.onload = () => resolve(); l.onerror = () => { l.remove(); reject(new Error('CSS')); };
    document.head.append(l);
  });
}
let loading = null;
let failed = false;
let failedAt = 0;

function load(rerender) {
  // Nach einem Fehler nicht sofort erneut versuchen (sonst Endlosschleife), erst nach 5 s beim nächsten Öffnen.
  if (failed && Date.now() - failedAt < 5000) return;
  if (!loading) {
    loading = Promise.all([import('./training/main.js'), loadCss('css/training.css')]).then(([m]) => m)
      .then((m) => { mod = m; failed = false; })
      .catch(() => { failed = true; failedAt = Date.now(); loading = null; })
      .finally(() => rerender());
  }
}

function placeholder() {
  return h('div', {}, pageHead('Training'),
    h('section', { class: 'card' }, h('p', { class: 'small muted' }, failed ? 'Trainingsbereich nicht geladen. Bitte einmal online öffnen.' : 'Trainingsbereich wird geladen …')));
}

export const trainingRoutes = Object.fromEntries(TRAINING_PATHS.map((path) => [path, (rerender) => {
  if (mod) return mod.views[path](rerender);
  load(rerender);
  return placeholder();
}]));
