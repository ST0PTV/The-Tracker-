// Vorrat (0.2.5): Mengen, Zuordnung, Abziehen beim Kochen mit Rückgängig, Einkaufsliste minus Vorrat, Vorschläge.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MemoryStorage } from './helpers.js';
import { prepareIngredients } from '../js/features/recipes/ingredients.js';
import * as P from '../js/features/recipes/pantry.js';
import * as R from '../js/features/recipes/recipes.js';
import * as W from '../js/features/recipes/week.js';
import { shoppingList } from '../js/features/recipes/shopping.js';
import { setGoal } from '../js/core/profile.js';
import { entriesOf } from '../js/features/journal/journal.js';

const bls = JSON.parse(readFileSync(new URL('../data/bls.json', import.meta.url)));
const byId = new Map(bls.foods.map((f) => ['bls:' + f.id, f]));
const FOREIGN = { 'rezeptbuch-v1': '{"fremd":1}', 'ct.v1': '{"pantry":[1]}', wt_x: '1' };
const fresh = () => { globalThis.localStorage = new MemoryStorage({ ...FOREIGN }); R.clearNutrientCache(); prepareIngredients((id) => byId.get(id) || null); };

test('Hinzufügen: lose Zutat in g und Stück, Packung aus dem Scan, Beschriftung, Zuordnung nur bei ganzem Wort', () => {
  fresh();
  const z = P.addLoose('Zwiebel', 3, 'stk');
  assert.equal(z.fn, 'Zwiebel');
  assert.equal(P.grams(P.pantryById(z.id)), 3 * 80);
  assert.equal(P.label(P.pantryById(z.id)), '3 Stück');
  P.addLoose('Kartoffeln', 1500, 'g');
  assert.equal(P.label(P.pantry().find((x) => x.fn === 'Kartoffeln')), '1,5 kg');
  P.addLoose('Kartoffeln', 500, 'g');
  assert.equal(P.pantry().filter((x) => x.fn === 'Kartoffeln').length, 1, 'gleiche Zutat zählt zusammen');
  const pack = P.addFood({ src: 'off', id: 'off:4000000000002', n: 'Spaghetti Nr. 5', brand: 'Marke', pq: 500, k: 359, p: 13, c: 70, f: 2 }, 1, 'pkg');
  assert.equal(P.label(P.pantryById(pack.id)), '1 Pkg. (≈ 500 g)');
  assert.equal(P.foodOf(P.pantryById(pack.id)), 'Nudeln', 'Spaghetti → Nudeln');
  assert.equal(P.matchFood('Milchschnitte'), null, '„Milchschnitte“ ist keine Milch');
  assert.equal(P.groupOf(P.pantryById(z.id)), 'gemuese');
  assert.equal(P.groupOf(P.pantryById(pack.id)), 'getreide');
  assert.match(P.pantryById(z.id).added, /Z$/);
  assert.equal(localStorage.getItem('ct.v1'), FOREIGN['ct.v1'], 'Calorie-Tracker-Vorrat unberührt');
});

test('Kochen zieht ab (älteste zuerst), Rückgängig gibt zurück; ohne Vorrat passiert nichts', () => {
  fresh();
  const r = R.allRecipes().find((x) => x.id === 'spaghetti-bolognese');
  // ohne Vorrat
  let e = R.cookRecipe(r, 'dinner', 1, '2026-10-10');
  assert.deepEqual(R.cookedFromPantry(e.id), []);
  P.addLoose('Nudeln', 500, 'g');
  P.addLoose('Zwiebel', 2, 'stk');
  e = R.cookRecipe(r, 'dinner', 1.5, '2026-10-10');
  const nud = P.pantry().find((x) => x.fn === 'Nudeln');
  assert.equal(nud.qty, 500 - 80 * 1.5, 'Spaghetti 80 g × 1,5');
  assert.equal(P.pantry().find((x) => x.fn === 'Zwiebel').qty, 0.5);
  assert.deepEqual(R.cookedFromPantry(e.id).sort(), ['Nudeln', 'Zwiebel']);
  R.undoCook('2026-10-10', e);
  assert.equal(P.pantry().find((x) => x.fn === 'Nudeln').qty, 500);
  assert.equal(P.pantry().find((x) => x.fn === 'Zwiebel').qty, 2);
  assert.equal(entriesOf('2026-10-10').length, 1, 'nur der erste Eintrag bleibt');
});

test('Bestand eines Rezepts: alles da / fehlt; Packung ohne Gramm zählt als da', () => {
  fresh();
  const r = R.allRecipes().find((x) => x.id === 'spaghetti-bolognese');
  let st = P.recipeStock(R.portionLines(r));
  assert.equal(st.all, false);
  assert.ok(st.missing.includes('Hackfleisch'));
  P.addLoose('Nudeln', 500, 'g'); P.addLoose('Hackfleisch', 400, 'g'); P.addLoose('Zwiebel', 2, 'stk'); P.addLoose('Möhre', 2, 'stk');
  P.addLoose('Passierte Tomaten', 500, 'g');
  P.addFood({ src: 'off', id: 'off:1', n: 'Tomatenmark', k: 80 }, 1, 'pkg'); // ohne Packungsgröße
  st = P.recipeStock(R.portionLines(r));
  assert.deepEqual(st.missing, []);
  assert.equal(st.all, true);
  // Vorschläge: mit Vorrat höher
  setGoal({ goal: 2000, preset: 'dge', from: '2026-01-01' });
  const rank = R.ideasFor('dinner', '2026-10-11').findIndex((x) => x.recipe.id === 'spaghetti-bolognese');
  assert.ok(rank >= 0 && rank < 5, `Bolognese mit vollem Vorrat weit oben (Platz ${rank + 1})`);
});

test('Einkaufsliste minus Vorrat: reicht → „Schon im Vorrat“, zu wenig → nur der Rest', () => {
  fresh();
  W.setFit(false); W.setWeekPortions(1);
  W.planAt('spaghetti-bolognese', '2026-10-29', 'dinner');
  W.planAt('spaghetti-bolognese', '2026-10-30', 'dinner');
  W.ensureWeek('2026-10-29');
  let items = shoppingList('2026-10-29').items;
  const nud = () => items.find((x) => x.food === 'Nudeln');
  assert.equal(nud().stock, null);
  assert.equal(nud().text, '160 g Spaghetti');
  P.addLoose('Nudeln', 100, 'g');
  items = shoppingList('2026-10-29').items;
  assert.equal(nud().stock, 'part');
  assert.equal(nud().text, '60 g Spaghetti');
  P.addLoose('Nudeln', 100, 'g');
  items = shoppingList('2026-10-29').items;
  assert.equal(nud().stock, 'full');
  assert.equal(nud().needG, 0);
});

test('Gegessen und Entfernen mit Wiederherstellen', () => {
  fresh();
  const x = P.addLoose('Joghurt', 500, 'g');
  const used = P.eat(x.id, 150);
  assert.equal(P.pantryById(x.id).qty, 350);
  P.giveBack(used);
  assert.equal(P.pantryById(x.id).qty, 500);
  const gone = P.removeItem(x.id);
  assert.equal(P.pantry().length, 0);
  P.restoreItem(gone);
  assert.equal(P.pantry().length, 1);
  P.setQty(x.id, 0);
  assert.equal(P.clearEmpty(), 1);
});
