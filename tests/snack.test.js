// Snack-Rahmen, Portionen und Mikronährstoff-Stufen (0.5.0), nach dem Rezeptbuch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorage } from './helpers.js';
import { usualPortion, snackAllowance, snackAmount, richLevel } from '../js/features/recipes/snack.js';

const budget2000 = (m) => ({ breakfast: 500, lunch: 700, dinner: 600, snack: 200 })[m];

test('Snack-Rahmen: Hauptmahlzeiten darüber nehmen weg, darunter geben Platz, nie unter 0', () => {
  const mains = ['breakfast', 'lunch', 'dinner'];
  assert.deepEqual(snackAllowance({ eatenBy: {}, budget: budget2000, mains, mealCount: 3 }), { total: 200, free: 200 });
  assert.equal(snackAllowance({ eatenBy: { breakfast: 400, snack: 50 }, budget: budget2000, mains, mealCount: 3 }).free, 250, 'Frühstück 100 unter dem Rahmen');
  assert.equal(snackAllowance({ eatenBy: { lunch: 850 }, budget: budget2000, mains, mealCount: 3 }).free, 50);
  assert.equal(snackAllowance({ eatenBy: { lunch: 1200 }, budget: budget2000, mains, mealCount: 3 }).free, 0);
  assert.equal(snackAllowance({ eatenBy: {}, budget: budget2000, mains, mealCount: 2 }).total, 400, 'bei 2 Mahlzeiten zwei Snacks');
});

test('Menge: ganze Portion, Teil auf 5 g abgerundet, Vorrat begrenzt, nichts mehr drin', () => {
  assert.deepEqual(snackAmount({ portion: 150, k: 50, stock: null, free: 200 }), { g: 150, status: 'full', kcal: 75 });
  assert.deepEqual(snackAmount({ portion: 30, k: 600, stock: null, free: 100 }), { g: 15, status: 'part', kcal: 90 });
  assert.deepEqual(snackAmount({ portion: 150, k: 50, stock: 80, free: 500 }), { g: 80, status: 'stock', kcal: 40 });
  assert.equal(snackAmount({ portion: 30, k: 600, stock: null, free: 20 }).status, 'none');
  assert.equal(snackAmount({ portion: 30, k: 0, stock: null, free: 20 }), null);
});

test('Übliche Portion: Name vor Gruppe, Packung, wenn kleiner; ohne Portion nur als Snack markiert', () => {
  assert.equal(usualPortion({}, 'Banane', 'obst'), 150);
  assert.equal(usualPortion({}, 'Käse', 'milch'), 25);
  assert.equal(usualPortion({ serving: 20 }, 'Nüsse', 'nuesse'), 20);
  assert.equal(usualPortion({ serving: 60 }, 'Nüsse', 'nuesse'), 30);
  assert.equal(usualPortion({}, 'Butter', 'milch'), null);
  assert.equal(usualPortion({}, null, 'getreide'), null, 'Nudeln, Reis …: keine Snack-Portion');
  assert.equal(usualPortion({ snack: true, serving: 45 }, null, 'suess'), 45);
  assert.equal(usualPortion({ snack: true }, null, 'sonst'), 40);
});

test('Stufen: viel ab 30 %, etwas ab 15 % des Tageswerts, Getränke halbe Schwellen, unbekannt = null', () => {
  assert.equal(richLevel(4.5, 15), 2);
  assert.equal(richLevel(2.5, 15), 1);
  assert.equal(richLevel(1, 15), 0);
  assert.equal(richLevel(2.5, 15, true), 2);
  assert.equal(richLevel(null, 15), null);
  assert.equal(richLevel(0, 15), 0, '0 ist ein Wert, nicht unbekannt');
});

test('Vorrat: Snack-Markierung setzen und entfernen', async () => {
  globalThis.localStorage = new MemoryStorage();
  const P = await import('../js/features/recipes/pantry.js');
  P.addFood({ src: 'off', id: 'off:1', n: 'Riegel', k: 450, p: 6, c: 60, f: 20, serving: 40, pq: 200 }, 1, 'pkg', 200);
  const id = P.pantry()[0].id;
  P.setSnack(id, true);
  assert.equal(P.pantryById(id).snack, true);
  P.setSnack(id, false);
  assert.equal('snack' in P.pantryById(id), false);
  assert.equal(P.microsOfItem(P.pantryById(id)), null, 'Gescanntes ohne BLS-Bezug: unbekannt');
});
