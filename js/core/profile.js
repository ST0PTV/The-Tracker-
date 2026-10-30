// Gemeinsames Profil: Tagesziele (kcal, Makros), Körperdaten, Ernährungsform.
// Alle Bereiche lesen Ziele NUR über dieses Modul (Rezepte, Wochenplan, Journal, Analyse).
// Datenform der Ziel-Historie wie im Calorie-Tracker (goalHistory), damit Phase 2 die Logik direkt übernehmen kann.
import * as store from './store.js';

/* Makro-Presets aus dem Calorie-Tracker (README „Makro-Presets: Herleitung“, mit Quellen):
   Eiweiß und Fett = Faktor (g/kg Körpergewicht) × Gewicht; Kohlenhydrate = Rest der kcal.
   Energiefaktoren nach Atwater: 4 kcal/g Eiweiß und KH, 9 kcal/g Fett.
   fatRange = empfohlener Fettanteil in % der Energie, gegen den das Ergebnis geprüft wird. */
export const PRESETS = {
  dge: { label: 'Ausgewogen', pf: 0.8, ff: 1.0, fatRange: [30, 35] },
  muscle: { label: 'Muskelaufbau', pf: 1.6, ff: 1.0, fatRange: [20, 35] },
  cut: { label: 'Fettabbau', pf: 2.2, ff: 0.8, fatRange: [15, 30] },
  custom: { label: 'Eigene', pf: null, ff: null, fatRange: null }
};

// Ballaststoffe: DGE-Richtwert ≥ 30 g/Tag. Freier Zucker: WHO < 10 % der Energie (bedingte Empfehlung < 5 %).
export const FIBER_MIN_G = 30;
export const FREE_SUGAR_MAX_SHARE = 0.10;

/* Untergrenze ohne fachliche Begleitung (aus dem Calorie-Tracker, dort mit Quelle Harvard Health; hier nicht neu
   per Websuche geprüft): Frauen 1.200, Männer 1.500 kcal pro Tag; ohne Angabe gilt 1.200.
   Schwäche: grobe Faustregel, berücksichtigt weder Körpergröße noch Aktivität. */
export const kcalFloor = (sex) => (sex === 'm' ? 1500 : 1200);

export const GOAL_KEYS =['goal', 'preset', 'pf', 'ff', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'weight'];

store.define('profile', {
  sex: null, // 'f' | 'm' | null
  birthYear: null,
  heightCm: null,
  weightKg: null,
  bed: null,  // 'HH:MM' Bettzeit (Koffein-Ziel, Schlaf in den Kurven); null = Standard 23:00
  wake: null, // 'HH:MM' Aufstehen; null = Standard 07:00
  cycle: null // 'yes' | 'no' | null – „Hast du deine Regel?“ (zeigt den Zyklus, ab 0.2.6)
});
store.define('goals', []); // [{ from: 'JJJJ-MM-TT', goal, preset, pf, ff, protein, carbs, fat, fiber, sugar, weight }]
store.define('diet', { form: 'all', allergens: [] }); // form: 'all' | 'vegetarian' | 'vegan'

const r0 = (n) => Math.round(n);

/** Makros in g aus kcal-Ziel, Gewicht und Faktoren. Gibt null zurück, wenn etwas fehlt oder KH negativ würden. */
export function macrosFrom(kcal, weightKg, pf, ff) {
  if (!(kcal > 0) || !(weightKg > 0) || !(pf >= 0) || !(ff >= 0)) return null;
  const protein = pf * weightKg;
  const fat = ff * weightKg;
  const carbs = (kcal - 4 * protein - 9 * fat) / 4;
  if (carbs < 0) return null;
  return { protein: r0(protein), carbs: r0(carbs), fat: r0(fat), fatPct: Math.round(((9 * fat) / kcal) * 100) };
}

/** Prüft den Fettanteil gegen den Bereich des Presets: -1 zu wenig, 0 passt, 1 zu viel, null ohne Bereich. */
export function fatCheck(presetKey, fatPct) {
  const range = PRESETS[presetKey]?.fatRange;
  if (!range || fatPct == null) return null;
  return fatPct < range[0] ? -1 : fatPct > range[1] ? 1 : 0;
}

/** Ballaststoff- und Zuckerziel aus dem kcal-Ziel (freier Zucker in g: kcal × Anteil ÷ 4). */
export function fiberSugarFrom(kcal) {
  if (!(kcal > 0)) return { fiber: FIBER_MIN_G, sugar: null };
  return { fiber: FIBER_MIN_G, sugar: r0((kcal * FREE_SUGAR_MAX_SHARE) / 4) };
}

/** Ziel, das an einem Tag galt (wie goalsFor im Calorie-Tracker). Tage vor dem ersten Eintrag nutzen das erste Ziel. */
export function goalsAt(history, iso) {
  if (!Array.isArray(history) || !history.length) return null;
  let g = history[0];
  for (const e of history) { if (e.from <= iso) g = e; else break; }
  return g;
}

/** Fügt ein Ziel ab einem Datum ein; ein Eintrag am selben Tag wird ersetzt. Gibt eine neue, sortierte Liste zurück. */
export function withGoal(history, entry) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry?.from || '')) throw new Error('Ziel braucht ein Datum (from: JJJJ-MM-TT).');
  const clean = { from: entry.from };
  for (const k of GOAL_KEYS) clean[k] = entry[k] ?? null;
  return (history || []).filter((h) => h.from !== entry.from).concat([clean]).sort((a, b) => a.from.localeCompare(b.from));
}

/** Heutiges Datum als JJJJ-MM-TT in lokaler Zeit (nicht UTC, sonst springt der Tag nachts um). */
export function todayISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ---------- Zugriff über den Speicher ----------

export const getProfile = () => store.get('profile');

export const SLEEP_DEFAULT = { bed: '23:00', wake: '07:00' };
/** Schlafzeiten aus dem Profil (Standard 23:00–07:00). */
export function getSleep() {
  const p = getProfile();
  return { bed: p.bed || SLEEP_DEFAULT.bed, wake: p.wake || SLEEP_DEFAULT.wake };
}
/** Übernimmt Schlafzeiten einmalig (z. B. aus früheren Koffein-Einstellungen), wenn im Profil noch keine stehen; ohne Ereignis. */
export function adoptSleep(bed, wake) {
  const p = getProfile();
  if (p.bed != null || p.wake != null) return false;
  if ((bed || SLEEP_DEFAULT.bed) === SLEEP_DEFAULT.bed && (wake || SLEEP_DEFAULT.wake) === SLEEP_DEFAULT.wake) return false;
  store.update('profile', (x) => { x.bed = bed || SLEEP_DEFAULT.bed; x.wake = wake || SLEEP_DEFAULT.wake; });
  return true;
}
export const getDiet = () => store.get('diet');
export const getGoals = (iso = todayISO()) => goalsAt(store.get('goals'), iso);
export const goalHistory = () => store.get('goals');

function changed() {
  if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('tt-profile'));
}

export function setProfile(patch) {
  const ok = store.update('profile', (p) => Object.assign(p, patch));
  changed();
  return ok;
}

export function setDiet(patch) {
  const ok = store.update('diet', (d) => Object.assign(d, patch));
  changed();
  return ok;
}

/** Speichert ein Ziel. Fehlen Makros, werden sie aus Preset und Gewicht berechnet. */
export function setGoal({ from = todayISO(), goal, preset = 'dge', pf, ff, weight, ...rest }) {
  const w = weight ?? getProfile().weightKg;
  const P = PRESETS[preset] || PRESETS.dge;
  const f = { pf: pf ?? P.pf, ff: ff ?? P.ff };
  const m = rest.protein != null ? rest : (macrosFrom(goal, w, f.pf, f.ff) || {});
  const fs = fiberSugarFrom(goal);
  const entry = { from, goal, preset, ...f, protein: m.protein, carbs: m.carbs, fat: m.fat,
    fiber: rest.fiber ?? fs.fiber, sugar: rest.sugar ?? fs.sugar, weight: w };
  const ok = store.set('goals', withGoal(store.get('goals'), entry));
  changed();
  return ok;
}

// ---------- Gewicht und Gewichtsziel ----------
// Gewichtsverlauf: { 'JJJJ-MM-TT': { kg, demo? } }, ein Wert pro Tag (der letzte zählt).
// Gewichtsziel (Datenform wie state.wgoal im Calorie-Tracker 2.3.1): Rechnung in js/features/goal/weightgoal.js.
export const WG_DEFAULTS = { on: false, target: null, date: null, maint: null, auto: true, src: 'watch', bmr: null, pal: 1.4, sport: false, tempo: 'rec', card: true };
store.define('weight', {});
store.define('wgoal', { ...WG_DEFAULTS });

/** Verlauf aufsteigend: [{ iso, kg, demo }]. */
export function weightLog() {
  return Object.entries(store.get('weight')).map(([iso, v]) => ({ iso, kg: v.kg, demo: !!v.demo })).sort((a, b) => a.iso.localeCompare(b.iso));
}

/** Aktuelles Gewicht: letzter Eintrag bis iso, sonst das Gewicht im Profil. */
export function currentWeight(iso = todayISO()) {
  const l = weightLog().filter((e) => e.iso <= iso);
  return l.length ? l[l.length - 1].kg : getProfile().weightKg ?? null;
}

/** Gewicht eintragen (30–300 kg). Ein echter Eintrag am neuesten Tag setzt auch das Gewicht im Profil. */
export function logWeight(iso, kg, { demo = false } = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) throw new Error('Bitte ein Datum wählen.');
  if (!(kg >= 30 && kg <= 300)) throw new Error('Bitte ein Gewicht zwischen 30 und 300 kg eingeben.');
  const v = Math.round(kg * 10) / 10;
  store.update('weight', (w) => { w[iso] = demo ? { kg: v, demo: true } : { kg: v }; });
  const real = weightLog().filter((e) => !e.demo);
  if (!demo && real.length && real[real.length - 1].iso === iso) store.update('profile', (p) => { p.weightKg = v; });
  changed();
  return v;
}

export function removeWeight(iso) {
  const gone = store.get('weight')[iso] || null;
  store.update('weight', (w) => { delete w[iso]; });
  changed();
  return gone;
}

/** Beispiel-Gewichte schreiben ({ iso: kg }); echte Einträge bleiben, das Profil-Gewicht bleibt unberührt. */
export function loadDemoWeights(map) {
  removeDemoWeights();
  store.update('weight', (w) => { for (const [iso, kg] of Object.entries(map)) if (!w[iso]) w[iso] = { kg, demo: true }; });
  changed();
}
export function removeDemoWeights() {
  store.update('weight', (w) => { for (const k of Object.keys(w)) if (w[k].demo) delete w[k]; });
  changed();
}

export const getWeightGoal = () => ({ ...WG_DEFAULTS, ...store.get('wgoal') });
export function setWeightGoal(patch) {
  const ok = store.update('wgoal', (o) => Object.assign(o, patch));
  changed();
  return ok;
}
