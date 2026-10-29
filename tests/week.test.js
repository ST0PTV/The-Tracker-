import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MemoryStorage } from './helpers.js';
import { prepareIngredients } from '../js/features/recipes/ingredients.js';
import * as R from '../js/features/recipes/recipes.js';
import * as W from '../js/features/recipes/week.js';
import { shoppingList } from '../js/features/recipes/shopping.js';
import { setDiet, setGoal } from '../js/core/profile.js';

const bls = JSON.parse(readFileSync(new URL('../data/bls.json', import.meta.url)));
const byId = new Map(bls.foods.map((f) => ['bls:' + f.id, f]));
const TODAY = '2026-10-29';
const FOREIGN = { 'rezeptbuch-v1': '{"fremd":1}', 'ct.v1': '{"fremd":1}', wt_x: '1' };
const fresh = () => {
  globalThis.localStorage = new MemoryStorage({ ...FOREIGN });
  R.clearNutrientCache();
  prepareIngredients((id) => byId.get(id) || null);
  setGoal({ goal: 2000, preset: 'dge', from: '2026-01-01' });
};

test('Wochenplan: 7 Tage × Mahlzeiten aus dem Profil gefüllt, passend und mit Abwechslung', () => {
  fresh();
  setDiet({ form: 'vegetarian', allergens: [] });
  const { days, meals, slots } = W.ensureWeek(TODAY);
  assert.deepEqual(days, ['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04']);
  assert.deepEqual(meals, ['breakfast', 'lunch', 'dinner']);
  assert.equal(Object.keys(slots).length, 21);
  const recipes = Object.values(slots).map((s) => R.recipeById(s.id));
  assert.ok(recipes.every((r) => ['vegan', 'vegetarisch'].includes(r.diet)), 'nur vegetarisch/vegan');
  assert.ok(Object.values(slots).every((s) => s.ok === false), 'Vorschläge sind noch nicht übernommen');
  assert.ok(new Set(recipes.map((r) => r.id)).size >= 15, 'kaum Wiederholungen');
  for (const [k, s] of Object.entries(slots)) assert.ok(R.recipeById(s.id).meals.map((m) => R.MEAL_OF[m]).includes(k.split('|')[1]), `${k} passt zur Mahlzeit`);
  // Fremde Keys unberührt
  for (const [k, v] of Object.entries(FOREIGN)) assert.equal(localStorage.getItem(k), v);
});

test('Wochenplan: 2 Mahlzeiten aus dem Profil; eigene Auswahl im Plan; alte Tage fallen weg', () => {
  fresh();
  R.setRs({ mealCount: 2, skip: 'breakfast' });
  assert.deepEqual(W.ensureWeek(TODAY).meals, ['lunch', 'dinner']);
  W.togglePlanMeal('snack');
  assert.deepEqual(W.planMeals(), ['lunch', 'dinner', 'snack']);
  const { slots } = W.ensureWeek(TODAY);
  assert.equal(Object.keys(slots).filter((k) => k.endsWith('|snack')).length, 7);
  W.setOk('2026-10-29|lunch', true);
  const next = W.ensureWeek('2026-10-30');
  assert.ok(!Object.keys(next.slots).some((k) => k.startsWith('2026-10-29')), 'gestern ist weg');
  assert.ok(next.slots['2026-11-05|lunch'], 'neuer Tag gefüllt');
});

test('Mengenfaktoren: zwischen 0,6× und 1,6×, Tag nahe am kcal-Rahmen; ohne Anpassen 1×', () => {
  fresh();
  const { days } = W.ensureWeek(TODAY);
  for (const d of days) {
    const f = W.dayFactors(d);
    for (const x of Object.values(f)) assert.ok(x >= W.FIT_MIN && x <= W.FIT_MAX && Math.abs(x * 20 - Math.round(x * 20)) < 1e-9, `Faktor ${x}`);
    const target = W.planMeals().reduce((a, m) => a + R.mealBudget(m, d), 0);
    const anyCapped = Object.values(f).some((x) => x === W.FIT_MIN || x === W.FIT_MAX);
    if (!anyCapped) assert.ok(Math.abs(W.dayKcal(d) / target - 1) < 0.06, `${d}: ${W.dayKcal(d)} vs ${target}`);
  }
  W.setFit(false);
  assert.ok(Object.values(W.dayFactors(days[0])).every((x) => x === 1));
});

test('Übernehmen, Andere, Tauschen, Rest neu mischen, Einplanen', () => {
  fresh();
  const { slots } = W.ensureWeek(TODAY);
  const a = '2026-10-29|dinner', b = '2026-10-30|dinner';
  W.setOk(a, true);
  assert.equal(W.plannedFor('2026-10-29', 'dinner').recipe.id, slots[a].id);
  assert.equal(W.plannedFor('2026-10-30', 'dinner'), null, 'nicht übernommen = kein Plan');
  const before = W.wk().slots[b].id;
  const other = W.otherFor(b, TODAY);
  assert.ok(other && other.id !== before && W.wk().slots[b].ok === false);
  const [ia, ib] = [W.wk().slots[a].id, W.wk().slots[b].id];
  assert.ok(W.swap(a, b));
  assert.deepEqual([W.wk().slots[a].id, W.wk().slots[b].id], [ib, ia]);
  assert.equal(W.wk().slots[b].ok, true, 'Status wandert mit');
  const kept = W.wk().slots[b].id;
  W.remix(TODAY);
  assert.equal(W.wk().slots[b].id, kept, 'Übernommenes bleibt beim Mischen');
  assert.equal(Object.keys(W.wk().slots).length, 21);
  W.setAllOk(true, TODAY);
  assert.equal(W.acceptedSlots(TODAY).length, 21);
  const lunch = R.ideasFor('lunch', '2026-11-01')[5].recipe;
  W.planAt(lunch.id, '2026-11-01', 'lunch');
  assert.equal(W.plannedFor('2026-11-01', 'lunch').recipe.id, lunch.id, 'Einplanen setzt und übernimmt');
  W.unplanAt('2026-11-01', 'lunch');
  assert.equal(W.plannedFor('2026-11-01', 'lunch'), null);
});

test('Einkauf: Zutaten × Portionen × Faktor zusammengezählt, Grundzutaten getrennt, nur Übernommenes', () => {
  fresh();
  W.setFit(false);
  W.setWeekPortions(2);
  const oats = R.allRecipes().find((r) => r.ingredients.some((l) => /^\d+ g Haferflocken/.test(l)) && r.meals.includes('fruehstueck'));
  assert.ok(oats, 'Rezept mit Haferflocken in g');
  W.planAt(oats.id, '2026-10-29', 'breakfast');
  W.planAt(oats.id, '2026-10-30', 'breakfast');
  W.ensureWeek(TODAY);
  const list = shoppingList(TODAY);
  assert.equal(list.dishes.length, 2);
  const g = Number(oats.ingredients.find((l) => /^\d+ g Haferflocken/.test(l)).match(/^\d+/)[0]);
  const item = list.items.find((x) => x.key === 'Haferflocken|g');
  assert.ok(item, 'Haferflocken in der Liste');
  const want = g * 2 * 2;
  assert.equal(item.text, `${want >= 20 ? Math.round(want / 5) * 5 : want} g Haferflocken`);
  assert.equal(item.uses.length, 2);
  assert.ok(!list.items.some((x) => /^(Gewürze|Öl|Gemüsebrühe)\|/.test(x.key)), 'Grundzutaten nicht in der Liste');
  W.toggleBought(item.key);
  assert.equal(W.wk().bought[item.key], true);
});
