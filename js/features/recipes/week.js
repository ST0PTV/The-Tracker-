// Wochenplan: 7 Tage ab heute, je Mahlzeit ein Gericht. Leere Plätze füllt die App mit passenden Rezepten,
// übernommen wird per Tipp. Mengenfaktoren passen jeden Tag an den kcal-Rahmen aus dem Tagesziel an.
// Nach dem Rezeptbuch, app.js (ensureWeek, weekCandidates, dayFactors, slotFactor, acceptedSlots, canSwap;
// Copyright (c) 2026 JuliaKelp, MIT-Lizenz). Geändert: Auswahl über recipes.ideasFor (Profil-Ziele, Allergene,
// Ablehnungen), kein Vorrat- und Mangel-Bonus (0.2.5 / 0.3.0), Speicher nur über core/store.js (Schlüssel tt_week).
import * as store from '../../core/store.js';
import { isoDate, addDays } from '../../core/format.js';
import { ideasFor, mainMeals, mealBudget, kcalOfRecipe, recipeById, suitable, timeMode, rs, MEAL_OF } from './recipes.js';

store.define('week', {
  meals: null,     // geplante Mahlzeiten; null = wie im Profil (Ich → Ernährung & Rezepte)
  portions: null,  // Portionen für den Einkauf; null = wie im Profil
  fit: true,       // Mengen an das Tagesziel anpassen
  seed: 0,         // „Rest neu mischen“ zählt hoch
  slots: {},       // { 'JJJJ-MM-TT|meal': { id, ok } }
  bought: {}       // Einkauf: { Schlüssel: true }
});

export const PLAN_MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];
// Mengen bleiben zwischen 0,6× und 1,6× des Rezepts; der Tag darf etwa 5 % vom Rahmen abweichen (Rezeptbuch).
export const FIT_MIN = 0.6;
export const FIT_MAX = 1.6;

const changed = () => { if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('tt-recipes')); };
export const wk = () => store.get('week');
const upd = (fn) => { store.update('week', fn); changed(); };

export const weekDays = (today = isoDate()) => [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(today, i));
export const slotKey = (day, meal) => `${day}|${meal}`;
const recipeMeals = (r) => (r.meals || []).map((m) => MEAL_OF[m] || m);

/** Geplante Mahlzeiten in fester Reihenfolge. */
export function planMeals() {
  const w = wk();
  const list = Array.isArray(w.meals) ? w.meals : mainMeals().map(([id]) => id);
  return PLAN_MEALS.filter((m) => list.includes(m));
}
export const weekPortions = () => wk().portions || rs().portions || 1;

function hashStr(s) { let x = 0; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return Math.abs(x); }

/** Kandidaten für einen Platz, beste zuerst. used zählt, wie oft ein Rezept schon in der Woche steht. */
export function weekCandidates(meal, day, used = {}, seed = wk().seed) {
  return ideasFor(meal, day)
    .map((x) => ({ r: x.recipe, s: x.score - (used[x.recipe.id] || 0) * 5 + (hashStr(`${seed}|${day}|${meal}|${x.recipe.id}`) % 100) / 40 }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.r);
}

const slotOk = (r, meal) => !!r && suitable(r) && recipeMeals(r).includes(meal) && !!timeMode(r, meal);

/** Räumt alte und unpassende Plätze weg und füllt leere Plätze. Gibt den Plan zurück. */
export function ensureWeek(today = isoDate()) {
  const days = weekDays(today), meals = planMeals();
  const w = wk();
  const slots = {};
  const used = {};
  let dirty = false;
  for (const [k, s] of Object.entries(w.slots)) {
    const [d, m] = k.split('|');
    const r = recipeById(s.id);
    // Alte Tage fallen raus; Plätze von abgewählten Mahlzeiten bleiben gespeichert, falls man sie wieder anwählt
    if (d < days[0] || d > days[6] || !r || !suitable(r)) { dirty = true; continue; }
    slots[k] = s;
    if (meals.includes(m)) used[s.id] = (used[s.id] || 0) + 1;
  }
  for (const d of days) for (const m of meals) {
    const k = slotKey(d, m);
    if (slots[k]) continue;
    const r = weekCandidates(m, d, used, w.seed)[0];
    if (!r) continue;
    slots[k] = { id: r.id, ok: false };
    used[r.id] = (used[r.id] || 0) + 1;
    dirty = true;
  }
  if (dirty) store.update('week', (x) => { x.slots = slots; });
  return { days, meals, slots };
}

/** Mengenfaktoren eines Tags: { Schlüssel: Faktor }. Eigene Rezepte mit gespeicherten Werten zählen mit. */
export function dayFactors(day) {
  const w = wk();
  const items = planMeals().map((m) => {
    const k = slotKey(day, m), s = w.slots[k], r = s && recipeById(s.id);
    return r ? { k, r, kcal: kcalOfRecipe(r), budget: mealBudget(m, day), f: 1 } : null;
  }).filter(Boolean);
  const out = {};
  if (w.fit === false) { for (const x of items) out[x.k] = 1; return out; }
  const target = items.reduce((a, x) => a + x.budget, 0);
  const free = items.filter((x) => x.kcal > 0);
  // Erst jedes Gericht auf seinen Platz, dann den Tag als Ganzes nachziehen
  for (const x of free) x.f = Math.min(FIT_MAX, Math.max(FIT_MIN, x.budget / x.kcal));
  for (let i = 0; i < 6; i++) {
    const sum = free.reduce((a, x) => a + x.kcal * x.f, 0);
    if (!sum) break;
    const ratio = target / sum;
    if (Math.abs(ratio - 1) < 0.005) break;
    for (const x of free) x.f = Math.min(FIT_MAX, Math.max(FIT_MIN, x.f * ratio));
  }
  for (const x of free) x.f = Math.round(x.f * 20) / 20;
  for (const x of items) out[x.k] = x.f;
  return out;
}
export const slotFactor = (k) => dayFactors(k.split('|')[0])[k] || 1;

/** Geschätzte kcal eines Tags im Plan (mit Mengenfaktoren); nur übernommene, wenn onlyOk. */
export function dayKcal(day, { onlyOk = false } = {}) {
  const w = wk(), f = dayFactors(day);
  return planMeals().reduce((sum, m) => {
    const s = w.slots[slotKey(day, m)], r = s && recipeById(s.id);
    return r && (!onlyOk || s.ok) ? sum + kcalOfRecipe(r) * (f[slotKey(day, m)] || 1) : sum;
  }, 0);
}

/** Übernommenes Gericht für Tag und Mahlzeit: { recipe, factor } oder null. */
export function plannedFor(day, meal) {
  if (!planMeals().includes(meal)) return null;
  const s = wk().slots[slotKey(day, meal)], r = s && s.ok ? recipeById(s.id) : null;
  return r && suitable(r) ? { recipe: r, factor: slotFactor(slotKey(day, meal)) } : null;
}

/** Alle übernommenen Plätze dieser Woche: [{ key, day, meal, recipe, factor }]. */
export function acceptedSlots(today = isoDate()) {
  const days = weekDays(today), meals = planMeals(), w = wk();
  const out = [];
  for (const d of days) for (const m of meals) {
    const s = w.slots[slotKey(d, m)], r = s && s.ok ? recipeById(s.id) : null;
    if (r && suitable(r)) out.push({ key: slotKey(d, m), day: d, meal: m, recipe: r, factor: slotFactor(slotKey(d, m)) });
  }
  return out;
}

// ---------- Ändern ----------
export function setOk(k, on) { upd((w) => { if (w.slots[k]) w.slots[k].ok = !!on; }); }
export function setAllOk(on, today = isoDate()) {
  const days = weekDays(today), meals = planMeals();
  upd((w) => { for (const [k, s] of Object.entries(w.slots)) { const [d, m] = k.split('|'); if (days.includes(d) && meals.includes(m)) s.ok = !!on; } });
}
/** „Rest neu mischen“: alle nicht übernommenen Plätze neu füllen. */
export function remix(today = isoDate()) {
  upd((w) => { w.seed = (w.seed || 0) + 1; for (const [k, s] of Object.entries(w.slots)) if (!s.ok) delete w.slots[k]; });
  return ensureWeek(today);
}
/** „Andere“: nächstes passendes Rezept, das diese Woche noch nicht vorkommt. Gibt das neue Rezept zurück. */
export function otherFor(k, today = isoDate()) {
  const [d, m] = k.split('|');
  const w = wk(), used = {};
  for (const s of Object.values(w.slots)) used[s.id] = (used[s.id] || 0) + 1;
  const cur = w.slots[k] && w.slots[k].id;
  const list = weekCandidates(m, d, used, w.seed).filter((r) => r.id !== cur);
  const r = list.find((x) => !used[x.id]) || list[0];
  if (!r) return null;
  upd((x) => { x.slots[k] = { id: r.id, ok: false }; });
  void today;
  return r;
}
/** Darf das Gericht von Platz a nach b und umgekehrt? */
export function canSwap(a, b) {
  const w = wk();
  if (!a || !b || a === b || !w.slots[a] || !w.slots[b]) return false;
  return slotOk(recipeById(w.slots[a].id), b.split('|')[1]) && slotOk(recipeById(w.slots[b].id), a.split('|')[1]);
}
export function swap(a, b) {
  if (!canSwap(a, b)) return false;
  upd((w) => { const x = w.slots[a]; w.slots[a] = w.slots[b]; w.slots[b] = x; });
  return true;
}
/** Rezept fest an einen Platz setzen (Einplanen von der Rezeptseite). */
export function planAt(id, day, meal) { upd((w) => { w.slots[slotKey(day, meal)] = { id, ok: true }; }); }
/** Rezept von einem Platz nehmen; der Platz wird beim nächsten Öffnen neu gefüllt. */
export function unplanAt(day, meal) { upd((w) => { delete w.slots[slotKey(day, meal)]; }); }
export function setPlanMeals(list) { upd((w) => { w.meals = PLAN_MEALS.filter((m) => list.includes(m)); }); }
export function togglePlanMeal(m) {
  const cur = planMeals();
  const next = cur.includes(m) ? cur.filter((x) => x !== m) : cur.concat(m);
  if (next.length) setPlanMeals(next);
}
export function setWeekPortions(n) { upd((w) => { w.portions = Math.max(1, Math.min(12, Math.round(n) || 1)); }); }
export function setFit(on) { upd((w) => { w.fit = !!on; }); }
export function toggleBought(key) { upd((w) => { if (w.bought[key]) delete w.bought[key]; else w.bought[key] = true; }); }
export function clearBought() { upd((w) => { w.bought = {}; }); }
