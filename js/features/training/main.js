// Trainingsbereich (Phase 4): Unterreiter Training · Pläne · Übungen · Fortschritt aus dem Workout-Tracker 3.14.0
// (MIT, ST0PTV). Wird erst beim Öffnen des Reiters geladen (dynamischer Import in features/training.js).
// Die Ansichten bleiben 1:1; hier kommen nur die Unterreiter dazu und das Anlassen des Bildschirms
// (vorher js/app.js des Workout-Trackers).
import { h } from './util.js';
import * as store from './store.js';
import { trainingView } from './training-view.js';
import { plansView } from './plans-view.js';
import { exercisesView } from './exercises-view.js';
import { progressView } from './progress-view.js';
import { runnerView } from './routine-view.js';
import { activeSession } from './session.js';
import { setKeepAwake } from './device.js';
import { trainingSettingsView } from './settings-view.js';

export const SUB = [
  ['/training', 'Training'],
  ['/training/plaene', 'Pläne'],
  ['/training/uebungen', 'Übungen'],
  ['/training/fortschritt', 'Fortschritt']
];

function subnav(active) {
  return h('nav', { class: 'seg tr-sub', 'aria-label': 'Training-Bereiche' },
    ...SUB.map(([path, label]) => h('a', { href: `#${path}`, 'aria-current': path === active ? 'page' : false }, label)));
}

// Unterreiter direkt unter die Titelzeile der Ansicht setzen (die Ansichten selbst bleiben unverändert).
function withSub(path, node) {
  const h1 = node.querySelector('h1');
  if (!h1) { node.prepend(subnav(path)); return node; }
  let row = h1;
  while (row.parentElement && row.parentElement !== node) row = row.parentElement;
  row.after(subnav(path));
  return node;
}

const withDevice = (view) => (rerender) => {
  const node = view(rerender);
  setKeepAwake(!!activeSession() && store.get('settings').keepAwake !== false);
  return node;
};

export const views = {
  '/training': withDevice((rr) => withSub('/training', trainingView(rr))),
  '/training/plaene': withDevice((rr) => withSub('/training/plaene', plansView(rr))),
  '/training/uebungen': withDevice((rr) => withSub('/training/uebungen', exercisesView(rr))),
  '/training/fortschritt': withDevice((rr) => withSub('/training/fortschritt', progressView(rr))),
  '/training/routine': withDevice(runnerView),
  '/ich/training': trainingSettingsView
};
