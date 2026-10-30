// Prüft die Rezeptdaten: alte (Rezeptbuch) und neue (ab 0.2.4). Strenger für die neuen, weil sie hier entstehen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers.js';
import { prepareIngredients, parseIngredient, findFood, nutrientsOfText, allergensOfText, FOODS } from '../js/features/recipes/ingredients.js';
import { RECIPES, TASTE_FOODS } from '../js/features/recipes/recipe-data.js';
import { RECIPES_2 } from '../js/features/recipes/recipe-data-2.js';

const bls = JSON.parse(readFileSync(new URL('../data/bls.json', import.meta.url)));
const byId = new Map(bls.foods.map((f) => ['bls:' + f.id, f]));
assert.equal(prepareIngredients((id) => byId.get(id) || null), true, 'alle BLS-Codes vorhanden');

const ALL = [...RECIPES, ...RECIPES_2];
const MEALS = ['fruehstueck', 'mittag', 'abend', 'snack'];
const DIETS = ['vegan', 'vegetarisch', 'fisch', 'fleisch'];
const BOOK_ALLERGENS = ['gluten', 'laktose', 'ei', 'soja', 'nuesse', 'fisch'];
// kcal pro Portion, grob plausibel je Mahlzeit (Schätzung aus dem BLS)
const RANGE = { fruehstueck: [200, 700], mittag: [350, 900], abend: [350, 900], snack: [60, 350] };
const kcalOf = (r) => r.ingredients.reduce((s, l) => s + nutrientsOfText(l).kcal, 0);
const dietOf = (r) => {
  const tags = r.ingredients.filter((l) => parseIngredient(l).amount !== null).map((l) => findFood(parseIngredient(l).name.replace(/[()]/g, ' '))?.diet);
  return tags.includes('fleisch') ? 'fleisch' : tags.includes('fisch') ? 'fisch' : tags.includes('tierisch') ? 'vegetarisch' : 'vegan';
};

test('Rezeptdaten: IDs eindeutig, Pflichtfelder, gültige Mahlzeiten und Ernährungsform', () => {
  const ids = ALL.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length, `doppelte IDs: ${ids.filter((x, i) => ids.indexOf(x) !== i)}`);
  for (const r of ALL) {
    assert.ok(r.name && r.ingredients.length && r.steps.length && r.tint, r.id);
    assert.ok(r.meals.length && r.meals.every((m) => MEALS.includes(m)), `${r.id}: Mahlzeiten`);
    assert.ok(DIETS.includes(r.diet), `${r.id}: Ernährungsform`);
    assert.ok(r.time > 0 && r.time <= 60, `${r.id}: Zeit ${r.time}`);
  }
  for (const r of RECIPES_2) assert.ok(r.foods.every((f) => TASTE_FOODS.includes(f)), `${r.id}: foods nur aus der Geschmacksabfrage`);
});

test('Neue Rezepte (ab 0.2.4): jede Zutat mit Menge erkannt, kcal plausibel und nahe am Startwert', () => {
  assert.ok(RECIPES_2.length >= 100, `${RECIPES_2.length} neue Rezepte`);
  for (const r of RECIPES_2) {
    for (const line of r.ingredients) {
      const p = parseIngredient(line);
      if (p.amount !== null) assert.ok(findFood(p.name.replace(/[()]/g, ' ')), `${r.id}: „${line}“ nicht erkannt`);
    }
    const k = kcalOf(r);
    for (const m of r.meals) {
      const [lo, hi] = RANGE[m];
      if (m === 'snack' && r.meals.length > 1) continue; // Frühstück, das auch als größerer Snack taugt
      assert.ok(k >= lo && k <= hi, `${r.id}: ${Math.round(k)} kcal außerhalb ${lo}–${hi} (${m})`);
    }
    assert.ok(Math.abs(k - r.kcal) <= Math.max(30, r.kcal * 0.15), `${r.id}: Startwert ${r.kcal} vs. gerechnet ${Math.round(k)}`);
    assert.ok(r.steps.length >= 1 && r.steps.length <= 6, `${r.id}: ${r.steps.length} Schritte`);
    assert.ok(r.time <= 60 && (r.time <= 45 || r.mealprep), `${r.id}: über 45 Minuten nur zum Vorkochen`);
  }
});

test('Neue Rezepte: Ernährungsform und Allergene passen zu den Zutaten, kein Fisch und keine Meeresfrüchte', () => {
  for (const r of RECIPES_2) {
    assert.equal(r.diet, dietOf(r), `${r.id}: Ernährungsform`);
    assert.notEqual(r.diet, 'fisch', `${r.id}: kein Fisch`);
    // Rezeptdaten nennen Nüsse als „nuesse“; die Ableitung trennt seit 0.3.0 Schalenfrüchte und Erdnuss
    const derived = new Set(r.ingredients.flatMap(allergensOfText).map((a) => (a === 'schalen' || a === 'erdnuss' ? 'nuesse' : a)));
    assert.ok(!derived.has('fisch') && !derived.has('krebstiere') && !derived.has('weichtiere'), `${r.id}: keine Meeresfrüchte`);
    assert.ok(r.allergens.every((a) => BOOK_ALLERGENS.includes(a) && derived.has(a)), `${r.id}: angegebene Allergene ${r.allergens}`);
    assert.deepEqual([...derived].filter((a) => BOOK_ALLERGENS.includes(a)).sort(), [...r.allergens].sort(), `${r.id}: Allergene vollständig`);
  }
});

test('Zutaten: jede Lebensmittel-Zeile in FOODS hat einen BLS-Code oder einen festen Wert', () => {
  for (const f of FOODS) assert.ok(f.kcal != null, `${f.name}: kein Wert`);
});

test('Mischung: genug Auswahl je Mahlzeit und Ernährungsform', () => {
  const count = (meal, diets) => ALL.filter((r) => r.meals.includes(meal) && diets.includes(r.diet)).length;
  for (const meal of MEALS) {
    assert.ok(count(meal, ['vegan']) >= 10, `${meal}: vegan ${count(meal, ['vegan'])}`);
    assert.ok(count(meal, ['vegan', 'vegetarisch']) >= 25, `${meal}: vegetarisch ${count(meal, ['vegan', 'vegetarisch'])}`);
  }
  assert.ok(count('mittag', ['fleisch']) >= 20 && count('abend', ['fleisch']) >= 25, 'genug Fleischgerichte');
});
