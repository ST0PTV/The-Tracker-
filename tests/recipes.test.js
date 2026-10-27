import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MemoryStorage } from './helpers.js';
import { prepareIngredients, parseIngredient, scaleIngredient, nutrientsOfText, gramsOfText, findFood } from '../js/features/recipes/ingredients.js';
import { RECIPES } from '../js/features/recipes/recipe-data.js';
import * as R from '../js/features/recipes/recipes.js';
import { setDiet, setGoal } from '../js/core/profile.js';
import { entriesOf } from '../js/features/journal/journal.js';

const bls = JSON.parse(readFileSync(new URL('../data/bls.json', import.meta.url)));
const byId = new Map(bls.foods.map((f) => ['bls:' + f.id, f]));
const near = (a, b, eps = 1e-6, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} ${a} ≠ ${b}`);
const fresh = () => { globalThis.localStorage = new MemoryStorage({ 'rezeptbuch-v1': '{"fremd":1}', 'ct.v1': '{"fremd":1}' }); R.clearNutrientCache(); };

test('Zutaten: alle BLS-Codes der Rezepte stehen in data/bls.json', () => {
  assert.equal(prepareIngredients((id) => byId.get(id) || null), true);
});

test('Zutatenzeilen lesen und skalieren (Brüche, Einheiten, Plural)', () => {
  assert.deepEqual({ ...parseIngredient('½ Dose Kichererbsen'), unitWord: undefined }, { amount: 0.5, unit: 'dose', unitWord: undefined, name: 'Kichererbsen' });
  assert.equal(parseIngredient('Salz, Pfeffer').amount, null);
  assert.equal(scaleIngredient('½ Dose Kichererbsen', 3), '1 ½ Dosen Kichererbsen');
  assert.equal(scaleIngredient('80 g Nudeln', 2), '160 g Nudeln');
  assert.equal(scaleIngredient('1 Zwiebel', 2), '2 Zwiebeln');
  assert.equal(scaleIngredient('Salz, Pfeffer', 2), 'Salz, Pfeffer');
});

test('Nährwerte einer Zeile = BLS je 100 g × Gramm / 100; Stück und EL über Gramm je Einheit', () => {
  prepareIngredients((id) => byId.get(id) || null);
  const oat = byId.get('bls:C133000'); // Hafer Flocken
  near(nutrientsOfText('50 g Haferflocken').kcal, Math.round(oat.k) * 0.5, 1e-9, 'kcal');
  near(nutrientsOfText('50 g Haferflocken').protein, oat.p * 0.5, 1e-9, 'Eiweiß');
  const onion = findFood('Zwiebel');
  assert.equal(gramsOfText('1 Zwiebel'), onion.piece);           // 80 g
  assert.equal(gramsOfText('2 EL Haferflocken'), 2 * findFood('Haferflocken').el); // 2 × 8 g
  assert.equal(nutrientsOfText('Salz, Pfeffer').kcal, 0);
});

test('Rezept-Nährwerte = Summe der Zeilen; kcal auf 10 gerundet', () => {
  fresh(); prepareIngredients((id) => byId.get(id) || null);
  const r = RECIPES.find((x) => x.id === 'linsen-bolognese');
  const sum = r.ingredients.reduce((s, l) => s + nutrientsOfText(l).kcal, 0);
  near(R.recipeNutrients(r).kcal, sum, 1e-9);
  assert.equal(R.kcalOfRecipe(r), Math.round(sum / 10) * 10);
});

test('Auswahl: Ernährungsform, Allergene, „mag ich nicht“, Ablehnung', () => {
  fresh(); prepareIngredients((id) => byId.get(id) || null);
  const meat = RECIPES.find((r) => r.diet === 'fleisch'), fish = RECIPES.find((r) => r.diet === 'fisch'), vegan = RECIPES.find((r) => r.diet === 'vegan' && !r.allergens.length);
  assert.ok(R.suitable(meat) && R.suitable(fish));
  setDiet({ form: 'vegetarian' });
  assert.ok(!R.suitable(meat) && !R.suitable(fish) && R.suitable(vegan));
  setDiet({ form: 'all', allergens: ['gl'] });
  assert.ok(RECIPES.filter((r) => r.allergens.includes('gluten')).every((r) => !R.suitable(r)), 'Gluten aus');
  setDiet({ allergens: [] });
  R.setTaste('Linsen', 'no');
  assert.ok(!R.suitable(RECIPES.find((x) => x.id === 'linsen-bolognese')), 'Linsen mag ich nicht');
  R.setTaste('Linsen', 'no'); // zweites Antippen hebt auf
  assert.ok(R.suitable(RECIPES.find((x) => x.id === 'linsen-bolognese')));
  R.reject(vegan.id);
  assert.ok(!R.suitable(vegan) && R.catalogue().every((r) => r.id !== vegan.id));
  R.unreject(vegan.id);
  assert.ok(R.suitable(vegan));
  assert.equal(localStorage.getItem('rezeptbuch-v1'), '{"fremd":1}', 'fremder Speicher unverändert');
});

test('Vorschläge: nur passende Mahlzeit und Zeit, Favorit und Geschmack vorne', () => {
  fresh(); prepareIngredients((id) => byId.get(id) || null);
  setGoal({ goal: 2000, preset: 'dge', from: '2026-01-01' });
  const iso = '2026-10-27';
  const ideas = R.ideasFor('dinner', iso);
  assert.ok(ideas.length > 5);
  assert.ok(ideas.every((x) => x.recipe.meals.includes('abend') && x.mode));
  R.setRs({ times: { breakfast: 5, lunch: 15, dinner: 10 } });
  assert.ok(R.ideasFor('dinner', iso).every((x) => x.recipe.time <= 10 || x.mode !== 'fits'), 'Zeitrahmen');
  R.setRs({ times: { breakfast: 5, lunch: 15, dinner: 30 } });
  const last = R.ideasFor('dinner', iso).at(-1).recipe;
  R.toggleFav(last.id); R.setTaste((last.foods || [])[0] || 'x', 'like');
  const idx = R.ideasFor('dinner', iso).findIndex((x) => x.recipe.id === last.id);
  assert.ok(idx < R.ideasFor('dinner', iso).length - 1, `Favorit rückt vor (Platz ${idx})`);
  // Rahmen: Abendessen 40 % von 2.000 kcal
  assert.equal(R.mealBudget('dinner', iso), 800);
  R.setRs({ mealCount: 2 });
  assert.equal(R.mealBudget('dinner', iso), 700); assert.equal(R.mealBudget('snack', iso), 300);
});

test('Gekocht → Journal: 1 Portion mit Nährwerten je 100 g aus der Portion; Rückgängig', () => {
  fresh(); prepareIngredients((id) => byId.get(id) || null);
  const r = RECIPES.find((x) => x.id === 'linsen-bolognese');
  R.toggleStep(r.id, 0);
  const food = R.recipeFood(r), g = Math.round(R.portionGrams(r)), n = R.recipeNutrients(r);
  assert.equal(food.id, 'rcp:linsen-bolognese'); assert.equal(food.serving, g);
  assert.equal(food.k, Math.round((n.kcal * 1000) / g) / 10); // eine Nachkommastelle
  const iso = '2026-10-27';
  const e = R.cookRecipe(r, 'dinner', 1, iso);
  assert.equal(entriesOf(iso).length, 1); assert.equal(e.meal, 'dinner'); assert.equal(e.grams, g);
  near((e.k * e.grams) / 100, n.kcal, (0.05 * g) / 100, 'kcal des Eintrags = Rezept (Rundung je 100 g ± 0,05)');
  assert.ok(!R.rs().cooking[r.id], 'Schritte zurückgesetzt');
  R.undoCook(iso, e);
  assert.equal(entriesOf(iso).length, 0);
});

test('Eigenes Rezept: Rechnung, unbekannte Zutat mit kcal/100 g, Ernährungsform und Allergene abgeleitet', () => {
  fresh(); prepareIngredients((id) => byId.get(id) || null);
  const form = { name: 'Testsuppe', portions: 2, time: 20, meals: ['dinner'], steps: 'Kochen.\n\nEssen.',
    rows: [{ amount: '300', unit: 'g', name: 'Kartoffeln' }, { amount: '1', unit: 'stueck', name: 'Zwiebel' }, { amount: '100', unit: 'ml', name: 'Sahne' }, { amount: '50', unit: 'g', name: 'Wundergewürz' }] };
  let a = R.analyzeOwn(form);
  assert.equal(a.unknown.length, 1); assert.equal(a.diet, 'vegetarisch'); assert.deepEqual(a.allergens, ['laktose']);
  const kNoUnknown = a.total;
  form.rows[3].kcal100 = '200';
  a = R.analyzeOwn(form);
  near(a.total, kNoUnknown + 100, 1e-9, '+ 50 g × 200 kcal/100 g');
  near(a.perPortion, a.total / 2, 1e-9);
  const r = R.saveOwn(form);
  assert.ok(r.own && r.steps.length === 2 && r.meals.includes('abend'));
  assert.equal(R.recipeById(r.id).name, 'Testsuppe');
  assert.ok(R.catalogue().some((x) => x.id === r.id), 'eigene Rezepte im Katalog');
  const gone = R.removeOwn(r.id); assert.equal(R.recipeById(r.id), null);
  R.restoreOwn(gone); assert.ok(R.recipeById(r.id));
  assert.throws(() => R.saveOwn({ ...form, name: ' ' }), /Namen/);
  assert.throws(() => R.saveOwn({ ...form, rows: [] }), /Zutat/);
});
