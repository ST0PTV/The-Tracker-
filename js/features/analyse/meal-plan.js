// Plan-Vorschlag zum Magen-Modell (0.5.0): Uhrzeiten und Portionsgrößen für den Tag aus Kalorienziel, Schlafzeit und Aufteilung.
// Rechnung nach tlPlan im Calorie-Tracker (js/timeline.js, ST0PTV, MIT): Essfenster von „Aufstehen + first“ bis
// „Bett − gap“, Mahlzeiten gleichmäßig darin verteilt (auf 0,5 h gerundet); Ziel je Mahlzeit = Tagesziel × Anteil;
// Gegessenes zählt, der Rest des Tagesziels wird auf die offenen Mahlzeiten verteilt. Eiweiß 0,4–0,55 g/kg je Mahlzeit.
// Faustregel-Planung, keine belegte „beste“ Verteilung (siehe Info-Text und Drive „Unverified 0.5.0“).
import * as store from '../../core/store.js';

export const ORDER = ['breakfast', 'lunch', 'snack', 'dinner'];
export const PLAN_PRESETS = {
  balanced: { label: 'Ausgeglichen', split: { breakfast: 30, lunch: 30, snack: 15, dinner: 25 } },
  lunch: { label: 'Mittags mehr', split: { breakfast: 20, lunch: 40, snack: 15, dinner: 25 } },
  morning: { label: 'Morgens mehr', split: { breakfast: 40, lunch: 30, snack: 10, dinner: 20 } },
  evening: { label: 'Abends mehr', split: { breakfast: 20, lunch: 30, snack: 10, dinner: 40 } },
  custom: { label: 'Eigene' }
};
export const PLAN_DEFAULTS = { preset: 'balanced', split: { ...PLAN_PRESETS.balanced.split }, first: 1, gap: 3 };
store.define('mealplan', PLAN_DEFAULTS);

export function planSettings() {
  const s = store.get('mealplan');
  const split = { ...PLAN_DEFAULTS.split, ...(s.split || {}) };
  return { preset: PLAN_PRESETS[s.preset] ? s.preset : 'balanced', split, first: clamp(s.first, 0, 4, 1), gap: clamp(s.gap, 0, 6, 3) };
}
const clamp = (v, lo, hi, d) => (typeof v === 'number' && v >= lo && v <= hi ? v : d);

export function setPlanSettings(patch) {
  return store.update('mealplan', (s) => {
    Object.assign(s, patch);
    if (patch.preset && PLAN_PRESETS[patch.preset].split) s.split = { ...PLAN_PRESETS[patch.preset].split };
  });
}
export const splitSum = (split) => ORDER.reduce((a, m) => a + (split[m] || 0), 0);

/**
 * Plan für einen Tag. Stunden als Zahl (Aufstehen 7 → 7, Bett 23 → 23; Bett nach Mitternacht → > 24).
 * eaten: { meal: kcal schon gegessen }. Gibt { start, end, items: [{ meal, h, target, done, eaten, rest }], goal, eatenAll, rest, protein }.
 */
export function planDay({ goal, eaten = {}, wake, bed, split, first, gap, weight = null }) {
  const start = wake + first;
  let end = bed - gap;
  if (end < start + 1) end = start + 1;
  const meals = ORDER.filter((m) => (split[m] || 0) > 0);
  const n = meals.length;
  const eatenAll = ORDER.reduce((s, m) => s + (eaten[m] || 0), 0);
  const openShare = meals.filter((m) => !(eaten[m] > 0)).reduce((s, m) => s + split[m], 0);
  const rest = goal ? Math.max(0, goal - eatenAll) : null;
  const items = meals.map((m, i) => {
    const t = n === 1 ? start : start + ((end - start) * i) / (n - 1);
    const done = (eaten[m] || 0) > 0;
    return { meal: m, h: Math.round(t * 2) / 2, target: goal ? (goal * split[m]) / 100 : null, done, eaten: eaten[m] || 0,
      rest: !done && rest != null && openShare ? (rest * split[m]) / openShare : null };
  });
  return { start, end, items, goal: goal || null, eatenAll, rest, protein: weight ? [0.4 * weight, 0.55 * weight] : null };
}
