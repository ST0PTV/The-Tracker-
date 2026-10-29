// Rezepte: eigener Zustand, Auswahl passender Rezepte, Nährwerte pro Portion, „Gekocht“ ins Journal.
// Auswahl und Lernen aus Ablehnungen nach dem Rezeptbuch, app.js (suitable, likeScore, rejectPenalty, timeMode,
// ideasFor, macroScore, mealBudget; Copyright (c) 2026 JuliaKelp, MIT-Lizenz). Geändert: Ernährungsform, Allergene und
// Ziele kommen aus core/profile.js; Vorrat, Mangel-Bonus und Vorkoch-Tipps folgen in späteren Schritten (0.2.5, 0.3.0);
// keine Stempel/XP (Level-System bis nach Phase 5 draußen). Speicher nur über core/store.js (Schlüssel tt_recipes).
import * as store from '../../core/store.js';
import { getGoals, getDiet, setDiet, getWeightGoal, currentWeight } from '../../core/profile.js';
import { isoDate } from '../../core/format.js';
import { entriesOf, sumEntries, addEntry, removeEntry, restoreEntry } from '../journal/journal.js';
import { RECIPES, TASTE_FOODS } from './recipe-data.js';
import { findFood, allergensOfText, parseIngredient, nutrientsOfText, gramsOfText, addNutrients, emptyNutrients, scaleIngredient, gramsOf, nutrientsFor } from './ingredients.js';

store.define('recipes', {
  started: false,       // kurzer Start (Ernährung, Geschmack, Mahlzeiten) erledigt
  taste: {},            // { Lebensmittel: 'like' | 'no' }
  mealCount: 3, skip: 'breakfast',
  times: { breakfast: 5, lunch: 15, dinner: 30 },
  portions: 1,
  favorites: {}, rejected: {}, notes: {}, cooking: {}, // cooking: { id: [erledigte Schritte] }
  own: []               // eigene Rezepte
});

// Mahlzeiten der App ↔ Rezeptbuch
export const MEAL_OF = { fruehstueck: 'breakfast', mittag: 'lunch', abend: 'dinner', snack: 'snack' };
export const MAIN_MEALS = [['breakfast', 'Frühstück', 0.25], ['lunch', 'Mittagessen', 0.35], ['dinner', 'Abendessen', 0.4]];
export const MEAL_SHORT = { breakfast: 'Frühstück', lunch: 'Mittag', dinner: 'Abend', snack: 'Snack' };
export const TIME_OPTIONS = [5, 10, 15, 30, 45];
export const KCAL_FALLBACK = 2000;
// Rezept-Ernährungsform → erlaubt bei Profil-Form
const DIET_ALLOWS = { vegan: ['vegan'], vegetarian: ['vegan', 'vegetarisch'], all: ['vegan', 'vegetarisch', 'fisch', 'fleisch'] };
// Allergene der Rezepte → LMIV-Codes im Profil
// Rezept-Allergen → Profil-Codes (LMIV Anhang II, 14 Hauptallergene). „nuesse“ fasst wie im Rezeptbuch Schalenfrüchte
// und Erdnuss zusammen; deshalb sperrt jedes der beiden Häkchen alle Nuss-Rezepte.
export const ALLERGEN_CODES = { gluten: ['gl'], laktose: ['mi'], ei: ['ei'], nuesse: ['nu', 'er'], soja: ['so'], fisch: ['fi'],
  krebstiere: ['kr'], weichtiere: ['we'], sellerie: ['se'], senf: ['sf'], sesam: ['sa'], sulfite: ['su'], lupine: ['lu'] };
export const ALLERGEN_NAMES = { gl: 'Gluten', mi: 'Milch/Laktose', ei: 'Ei', nu: 'Schalenfrüchte', er: 'Erdnuss', so: 'Soja', fi: 'Fisch', kr: 'Krebstiere', we: 'Weichtiere', se: 'Sellerie', sf: 'Senf', sa: 'Sesam', su: 'Sulfite', lu: 'Lupine' };
export const DIET_FORMS = [['all', 'Alles'], ['vegetarian', 'Vegetarisch'], ['vegan', 'Vegan']];
export const DIET_LABEL = { vegan: 'vegan', vegetarisch: 'vegetarisch', fisch: 'mit Fisch', fleisch: 'mit Fleisch' };
// Lebensmittel, die bei einer Ernährungsform oder Allergie nicht abgefragt werden
const HIDE_FOR_DIET = { vegan: ['Eier', 'Käse', 'Feta', 'Joghurt', 'Quark', 'Hähnchen', 'Lachs', 'Thunfisch'], vegetarian: ['Hähnchen', 'Lachs', 'Thunfisch'], all: [] };
const HIDE_FOR_ALLERGY = { ei: ['Eier'], mi: ['Käse', 'Feta', 'Joghurt', 'Quark'], fi: ['Lachs', 'Thunfisch'], so: ['Tofu'] };
const changed = () => { if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('tt-recipes')); };

export const rs = () => store.get('recipes');
export function setRs(patch) { store.update('recipes', (s) => Object.assign(s, patch)); changed(); }
const upd = (fn) => { store.update('recipes', fn); changed(); };

// ---------- Rezepte und Nährwerte ----------
const nutCache = new Map();
/** Nährwerte einer Portion (aus den Zutatenzeilen; eigene Rezepte: gespeicherte Werte). */
export function recipeNutrients(r) {
  if (r.nutrients) return r.nutrients;
  if (nutCache.has(r.id)) return nutCache.get(r.id);
  const n = r.ingredients.reduce((sum, line) => addNutrients(sum, nutrientsOfText(line)), emptyNutrients());
  nutCache.set(r.id, n);
  return n;
}
const algCache = new Map();
/** Allergene eines Rezepts: Angabe im Rezept plus Ableitung aus den Zutatenzeilen (eigene Rezepte: gespeichert). */
export function allergensOf(r) {
  if (r.own) return r.allergens || [];
  if (algCache.has(r.id)) return algCache.get(r.id);
  const a = [...new Set([...(r.allergens || []), ...(r.ingredients || []).flatMap(allergensOfText)])];
  algCache.set(r.id, a);
  return a;
}
export const clearNutrientCache = () => { nutCache.clear(); algCache.clear(); };
export const kcalOfRecipe = (r) => Math.round(recipeNutrients(r).kcal / 10) * 10;
export const allRecipes = () => [...rs().own, ...RECIPES];
export const recipeById = (id) => allRecipes().find((r) => r.id === id) || null;
export const isFav = (r) => !!rs().favorites[r.id];

/** Gewicht einer Portion in g (ml wie g). */
export function portionGrams(r) {
  if (r.own && r.rows) return r.rows.reduce((s, row) => s + gramsOf(row, findFood(row.name)), 0) / (r.portions || 1);
  return (r.ingredients || []).reduce((s, line) => s + gramsOfText(line), 0);
}

/** Zutatenzeilen für n Portionen. */
export function scaledIngredients(r, n) {
  if (r.own && r.rows) {
    const f = n / (r.portions || 1);
    return r.rows.map((row) => {
      const a = Number(String(row.amount).replace(',', '.')) * f;
      const amount = row.unit === 'g' || row.unit === 'ml' ? (a >= 20 ? Math.round(a / 5) * 5 : Math.round(a)) : Math.round(a * 4) / 4;
      const unit = { g: 'g', ml: 'ml', stueck: 'Stück', el: 'EL', tl: 'TL' }[row.unit] || '';
      return `${String(amount).replace('.', ',')} ${unit} ${row.name.trim()}`.replace(/\s+/g, ' ');
    });
  }
  return r.ingredients.map((x) => scaleIngredient(x, n));
}

// ---------- Profil: Ernährungsform, Allergene, Ziele ----------
export const dietForm = () => (DIET_ALLOWS[getDiet().form] ? getDiet().form : 'all');
export const allergenCodes = () => (Array.isArray(getDiet().allergens) ? getDiet().allergens : []);
export function blockedAllergens() {
  const codes = allergenCodes();
  return Object.keys(ALLERGEN_CODES).filter((a) => ALLERGEN_CODES[a].some((c) => codes.includes(c)));
}
export const setDietForm = (form) => setDiet({ form });
export function toggleAllergen(code) {
  const a = allergenCodes();
  setDiet({ allergens: a.includes(code) ? a.filter((x) => x !== code) : a.concat(code) });
}
/** Tagesziel (kcal) oder Startwert 2.000 ohne Ziel. */
export const kcalGoal = (iso = isoDate()) => getGoals(iso)?.goal || KCAL_FALLBACK;
export const hasGoal = (iso = isoDate()) => !!getGoals(iso)?.goal;

/** Hauptmahlzeiten laut Einstellung (bei 2 Mahlzeiten fällt eine aus). */
export function mainMeals() {
  const s = rs();
  return s.mealCount === 2 ? MAIN_MEALS.filter(([id]) => id !== s.skip) : MAIN_MEALS;
}
/** kcal-Rahmen einer Mahlzeit: Anteil am Tagesziel (bei 2 Mahlzeiten je 35 %, Snacks je 15 %; sonst Snack 10 %). */
export function mealBudget(meal, iso = isoDate()) {
  const s = rs(), kcal = kcalGoal(iso);
  if (s.mealCount === 2) return kcal * (meal === 'snack' ? 0.15 : 0.35);
  if (meal === 'snack') return kcal * 0.1;
  return kcal * ((MAIN_MEALS.find(([id]) => id === meal) || MAIN_MEALS[1])[2]);
}
/** Noch frei heute (kcal); null ohne Tagesziel. */
export function kcalLeft(iso = isoDate()) {
  const g = getGoals(iso)?.goal;
  return g ? g - sumEntries(entriesOf(iso)).k : null;
}

// ---------- Auswahl ----------
const textOf = (r) => ((r.foods || []).join(' ') + ' ' + (r.ingredients || []).join(' ') + ' ' + r.name).toLowerCase();

/** Passt ein Rezept zu Ernährungsform, Allergenen, „mag ich nicht“ und ist es nicht abgelehnt? */
export function suitable(r) {
  const s = rs();
  if (s.rejected[r.id]) return false;
  if (!DIET_ALLOWS[dietForm()].includes(r.diet)) return false;
  const blocked = blockedAllergens();
  if (allergensOf(r).some((a) => blocked.includes(a))) return false;
  const text = textOf(r);
  for (const [food, v] of Object.entries(s.taste)) if (v === 'no' && text.includes(food.toLowerCase())) return false;
  return true;
}
export function likeScore(r) {
  const text = textOf(r);
  return Object.entries(rs().taste).filter(([, v]) => v === 'like').filter(([food]) => text.includes(food.toLowerCase())).length;
}

// Aus abgelehnten Rezepten lernen: ähnliche Rezepte (gleiche Hauptzutaten oder Wörter im Namen) rutschen nach hinten
const COMMON_FOODS = new Set(['Öl', 'Zwiebel', 'Knoblauch', 'Gewürze', 'Butter', 'Gemüsebrühe', 'Zitrone']);
const NAME_FILLER = new Set(['mit', 'und', 'auf', 'aus', 'im', 'in', 'vom', 'dem', 'der', 'die', 'das', 'ein', 'eine', 'kleiner', 'kleines', 'kleine', 'schnelle', 'vegane', 'veganes', 'veganer', 'brot']);
const keyCache = new Map();
function recipeKeys(r) {
  if (keyCache.has(r.id)) return keyCache.get(r.id);
  const foods = new Set();
  for (const line of r.ingredients || []) {
    const p = parseIngredient(line);
    if (p.amount === null) continue;
    const f = findFood(p.name.replace(/[()]/g, ' '));
    if (f && !COMMON_FOODS.has(f.name)) foods.add(f.name);
  }
  const words = new Set(String(r.name).toLowerCase().split(/[\s\-–,]+/).filter((w) => w.length > 2 && !NAME_FILLER.has(w)));
  const keys = { foods, words };
  keyCache.set(r.id, keys);
  return keys;
}
function overlap(a, b) {
  if (!a.size || !b.size) return 0;
  let both = 0; for (const x of a) if (b.has(x)) both++;
  return both / (a.size + b.size - both);
}
const rejectedRecipes = () => Object.keys(rs().rejected).map(recipeById).filter(Boolean);
/** Abzug für Vorschläge: ab 50 % Ähnlichkeit zu einem abgelehnten Rezept so viel, dass es praktisch nicht mehr kommt. */
export function rejectPenalty(r) {
  const rej = rejectedRecipes();
  if (!rej.length) return 0;
  const k = recipeKeys(r);
  let sim = 0;
  for (const x of rej) if (x.id !== r.id) { const xk = recipeKeys(x); sim = Math.max(sim, overlap(k.foods, xk.foods), overlap(k.words, xk.words)); }
  const count = {};
  for (const x of rej) for (const f of recipeKeys(x).foods) count[f] = (count[f] || 0) + 1;
  const learned = Object.keys(count).filter((f) => count[f] >= 2);
  return (sim >= 0.5 ? 20 : sim * 10) + 2 * learned.filter((f) => k.foods.has(f)).length;
}

/** Passt das Rezept in die Zeit der Mahlzeit? 'fits', 'prep' (am Vorabend), 'vorkochen' oder null. */
export function timeMode(r, meal) {
  const t = meal === 'snack' ? 10 : rs().times[meal] ?? 30;
  if (r.prep) return (r.serve || 0) <= t ? 'prep' : null;
  if (r.time <= t) return 'fits';
  if (r.mealprep) return 'vorkochen';
  return null;
}

/** Richtung: Gewichtsziel (aktiv) > Preset (Muskelaufbau = zunehmen, Fettabbau = abnehmen) > halten. */
function goalDir(iso) {
  const o = getWeightGoal(), w = currentWeight(iso);
  if (o.on && o.target && w) return o.target > w ? 'gain' : o.target < w ? 'lose' : 'keep';
  const pr = getGoals(iso)?.preset;
  return pr === 'muscle' ? 'gain' : pr === 'cut' ? 'lose' : 'keep';
}
/** Abstand der Makro-Verteilung zu den Tageszielen (0 = passt genau). Beim Abnehmen zählt mehr Eiweiß nicht. */
export function macroScore(r, iso = isoDate()) {
  const n = recipeNutrients(r), g = getGoals(iso);
  if (!n.kcal || !g?.goal || !g.protein || !g.fat) return 0;
  let dp = (n.protein * 4) / n.kcal - (g.protein * 4) / g.goal;
  if (goalDir(iso) === 'lose' && dp > 0) dp = 0;
  return -(Math.abs(dp) + Math.abs((n.fett * 9) / n.kcal - (g.fat * 9) / g.goal) * 0.7) * 12;
}
function hashStr(s) { let x = 0; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return Math.abs(x); }
const recipeMeals = (r) => (r.meals || []).map((m) => MEAL_OF[m] || m);

/** Vorschläge für eine Mahlzeit, beste zuerst: [{ recipe, mode, score }]. */
export function ideasFor(meal, iso = isoDate()) {
  const budget = mealBudget(meal, iso);
  const cooked = new Set(entriesOf(iso).map((e) => String(e.ref || '')).filter((x) => x.startsWith('rcp:')).map((x) => x.slice(4)));
  return allRecipes()
    .filter((r) => recipeMeals(r).includes(meal) && suitable(r))
    .map((r) => ({ recipe: r, mode: timeMode(r, meal) }))
    .filter((x) => x.mode)
    .map((x) => {
      const r = x.recipe;
      let score = likeScore(r) * 3 - Math.abs(kcalOfRecipe(r) - budget) / 80 + macroScore(r, iso);
      if (x.mode === 'vorkochen') score -= 2;
      if (isFav(r)) score += 3;
      if (cooked.has(r.id)) score -= 10;
      score -= rejectPenalty(r);
      score += (hashStr(iso + r.id) % 100) / 60; // jeden Tag etwas Abwechslung
      return { ...x, score };
    })
    .sort((a, b) => b.score - a.score);
}

/** Katalog: passende Rezepte, gefiltert nach Mahlzeit ('all' | Mahlzeit | 'fav') und Suchtext. */
export function catalogue({ filter = 'all', query = '' } = {}) {
  const q = query.trim().toLowerCase();
  const order = ['breakfast', 'lunch', 'dinner', 'snack'];
  const mealIdx = (r) => Math.min(...recipeMeals(r).map((m) => order.indexOf(m)).filter((i) => i >= 0), 9);
  return allRecipes()
    .filter((r) => (filter === 'fav' ? isFav(r) : suitable(r)))
    .filter((r) => filter === 'all' || filter === 'fav' || recipeMeals(r).includes(filter))
    .filter((r) => !q || textOf(r).includes(q))
    .sort((a, b) => (b.own ? 1 : 0) - (a.own ? 1 : 0) || likeScore(b) - likeScore(a) || mealIdx(a) - mealIdx(b) || a.time - b.time);
}

/** „Ich habe …“: Rezepte, die möglichst viele der Lebensmittel enthalten. */
export function haveMatches(terms) {
  const hits = (r) => {
    const text = textOf(r);
    const foods = new Set((r.ingredients || []).map((l) => (findFood(parseIngredient(l).name.replace(/[()]/g, ' ')) || {}).name).filter(Boolean));
    return terms.filter((t) => { if (text.includes(t.toLowerCase())) return true; const f = findFood(t); return f && f.name !== 'Gewürze' && foods.has(f.name); });
  };
  return allRecipes().filter(suitable).map((r) => ({ recipe: r, hit: hits(r) })).filter((x) => x.hit.length)
    .sort((a, b) => b.hit.length - a.hit.length || (isFav(b.recipe) ? 1 : 0) - (isFav(a.recipe) ? 1 : 0) || likeScore(b.recipe) - likeScore(a.recipe) || a.recipe.time - b.recipe.time);
}

// ---------- Geschmack und Einstellungen ----------
export function tasteFoods() {
  const s = rs(), form = dietForm(), codes = allergenCodes();
  const hidden = new Set([...(HIDE_FOR_DIET[form] || []), ...codes.flatMap((a) => HIDE_FOR_ALLERGY[a] || [])]);
  const custom = Object.keys(s.taste).filter((f) => !TASTE_FOODS.includes(f));
  return [...TASTE_FOODS.filter((f) => !hidden.has(f)), ...custom];
}
export function setTaste(food, v) { upd((s) => { if (s.taste[food] === v) delete s.taste[food]; else s.taste[food] = v; }); }
export function addTasteFood(name) { const n = String(name).trim(); if (n) upd((s) => { if (!s.taste[n]) s.taste[n] = 'like'; }); }
export function toggleFav(id) { upd((s) => { if (s.favorites[id]) delete s.favorites[id]; else s.favorites[id] = true; }); }
export function reject(id) { upd((s) => { s.rejected[id] = true; delete s.favorites[id]; }); }
export function unreject(id) { upd((s) => { delete s.rejected[id]; }); }
export function rejectFood(id, food) { upd((s) => { s.taste[food] = 'no'; }); void id; }
export function setNote(id, text) { upd((s) => { const t = String(text).slice(0, 1000); if (t.trim()) s.notes[id] = t; else delete s.notes[id]; }); }
export function toggleStep(id, i) {
  upd((s) => { const d = new Set(s.cooking[id] || []); if (d.has(i)) d.delete(i); else d.add(i); s.cooking[id] = [...d].sort((a, b) => a - b); if (!s.cooking[id].length) delete s.cooking[id]; });
}

// ---------- Gekocht → Journal ----------
const r1 = (x) => Math.round(x * 10) / 10;
/** Lebensmittel für das Journal: Nährwerte je 100 g aus einer Portion; null, wenn zu wenig bekannt ist. */
export function recipeFood(r) {
  const n = recipeNutrients(r), grams = Math.round(portionGrams(r));
  if (!n.kcal || grams < 10) return null;
  const per100 = (x) => r1(((x || 0) * 100) / grams);
  return { src: 'recipe', id: 'rcp:' + r.id, n: r.name, brand: 'Rezept', serving: grams, liq: false,
    k: per100(n.kcal), p: per100(n.protein), c: per100(n.kh), f: per100(n.fett), fi: per100(n.ballast),
    su: per100(n.zucker), fs: per100(Math.min(n.zugesetzt, n.zucker)) };
}
/** Trägt factor Portionen als Mahlzeit ins Journal ein und setzt die abgehakten Schritte zurück. Gibt den Eintrag zurück. */
export function cookRecipe(r, meal, factor = 1, iso = isoDate()) {
  const food = recipeFood(r);
  if (!food) throw new Error('Für dieses Rezept sind zu wenige Nährwerte bekannt.');
  const entry = addEntry(iso, food, Math.round(food.serving * factor), meal);
  upd((s) => { delete s.cooking[r.id]; });
  return entry;
}
export const undoCook = (iso, entry) => removeEntry(iso, entry.id);
export const redoCook = (iso, entry) => restoreEntry(iso, entry);

// ---------- Eigene Rezepte ----------
const OWN_TINTS = ['#F3C9A8', '#F5E1A4', '#DCE8C8', '#DDEAF4', '#F2D4DC', '#E3DCF2', '#F7D2B0'];
export const UNITS = [['g', 'g'], ['ml', 'ml'], ['stueck', 'Stück'], ['el', 'EL'], ['tl', 'TL']];
const num = (v) => Number(String(v ?? '').replace(',', '.'));

/**
 * Rechnet ein Formular durch: { portions, rows: [{ amount, unit, name, kcal100? }], meals }.
 * Gibt kcal gesamt und pro Portion, Nährwerte gesamt, unbekannte Zutaten, Ernährungsform und Allergene zurück.
 * Unbekannte Zutaten zählen nur mit eigener kcal-Angabe je 100 g (ohne Makros).
 */
export function analyzeOwn(form) {
  const portions = Math.max(1, Math.round(num(form.portions)) || 1);
  const lines = form.rows.filter((row) => String(row.name || '').trim() && num(row.amount) > 0).map((row) => {
    const food = findFood(row.name), grams = gramsOf(row, food);
    const own = row.kcal100 !== undefined && row.kcal100 !== '' && num(row.kcal100) >= 0 ? num(row.kcal100) : null;
    const known = !!food || own != null;
    return { row, food, grams, known, n: known ? nutrientsFor(food, grams, food ? null : own) : null };
  });
  const nutrients = lines.reduce((acc, x) => addNutrients(acc, x.n), emptyNutrients());
  const tags = lines.map((x) => x.food && x.food.diet).filter(Boolean);
  const diet = tags.includes('fleisch') ? 'fleisch' : tags.includes('fisch') ? 'fisch' : tags.includes('tierisch') ? 'vegetarisch' : 'vegan';
  const allergens = [...new Set(lines.flatMap((x) => allergensOfText(x.row.name)))];
  return { portions, lines, nutrients, total: nutrients.kcal, perPortion: nutrients.kcal / portions, unknown: lines.filter((x) => !x.known), diet, allergens };
}
/** Prüft und speichert ein eigenes Rezept (neu oder geändert). Gibt das Rezept zurück. */
export function saveOwn(form) {
  const name = String(form.name || '').trim();
  if (!name) throw new Error('Bitte einen Namen eingeben.');
  const a = analyzeOwn(form);
  if (!a.lines.length) throw new Error('Bitte mindestens eine Zutat mit Menge eintragen.');
  if (!(a.perPortion > 0)) throw new Error('Die Zutaten ergeben noch keine Kalorien. Unbekannte Zutaten brauchen kcal pro 100 g.');
  const time = Math.max(1, Math.min(240, Math.round(num(form.time)) || 20));
  const id = form.id || `eigen-${Date.now().toString(36)}`;
  const toBook = { breakfast: 'fruehstueck', lunch: 'mittag', dinner: 'abend', snack: 'snack' };
  const rows = a.lines.map((x) => ({ amount: String(x.row.amount).trim(), unit: x.row.unit || 'g', name: String(x.row.name).trim(), ...(x.row.kcal100 !== undefined && x.row.kcal100 !== '' ? { kcal100: num(x.row.kcal100) } : {}) }));
  const prev = rs().own.find((r) => r.id === id);
  const r = {
    id, own: true, name, time, serve: 0, prep: false, portions: a.portions,
    meals: (form.meals && form.meals.length ? form.meals : ['lunch', 'dinner']).map((m) => toBook[m] || m),
    nutrients: addNutrients(emptyNutrients(), a.nutrients, 1 / a.portions),
    kcal: Math.round(a.perPortion), diet: a.diet, allergens: a.allergens,
    foods: rows.map((x) => (findFood(x.name) || {}).name || x.name), rows,
    ingredients: [], // eigene Rezepte rechnen über rows
    steps: String(form.steps || '').split('\n').map((s) => s.trim()).filter(Boolean),
    mealprep: a.portions >= 2 || time > 30,
    tint: prev?.tint || OWN_TINTS[rs().own.length % OWN_TINTS.length]
  };
  if (!r.steps.length) r.steps = ['Nach Gefühl zubereiten.'];
  upd((s) => { s.own = [r, ...s.own.filter((x) => x.id !== id)]; });
  return r;
}
export function removeOwn(id) { const gone = rs().own.find((r) => r.id === id) || null; upd((s) => { s.own = s.own.filter((r) => r.id !== id); delete s.favorites[id]; delete s.notes[id]; delete s.cooking[id]; }); return gone; }
export function restoreOwn(r) { if (r) upd((s) => { s.own = [r, ...s.own.filter((x) => x.id !== r.id)]; }); }
