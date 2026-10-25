// Journal: Einträge pro Tag und Mahlzeit, Favoriten, zuletzt verwendet. Einzige Stelle, die diese Daten speichert.
// Datenform wie im Kalorien-Tracker (Rezeptbuch/tracker/js/app.js, ST0PTV/JuliaKelp, MIT): Ein Eintrag hält eine
// Kopie der Nährwerte je 100 g, damit spätere Änderungen an einem Lebensmittel alte Tage nicht verändern.
import * as store from '../../core/store.js';
import { uuid } from '../../core/util.js';
import { NUTRIENTS, nutrientsOf, per, isLiq } from '../food/foods.js';

export const MEALS = [
  { id: 'breakfast', label: 'Frühstück' },
  { id: 'lunch', label: 'Mittagessen' },
  { id: 'dinner', label: 'Abendessen' },
  { id: 'snack', label: 'Snacks' }
];
export const mealLabel = (id) => (MEALS.find((m) => m.id === id) || MEALS[3]).label;

store.define('days', {});       // { 'JJJJ-MM-TT': [Eintrag, …] }
store.define('favs', []);       // Kopien von Lebensmitteln (neueste zuerst)
store.define('recent', []);     // Kopien mit lastGrams (neueste zuerst, max. 60)
store.define('journal_prefs', { heroMode: 'left' }); // 'left' = übrig, 'eaten' = gegessen

const RECENT_MAX = 60;
const MAX_GRAMS = 5000;

function changed() {
  if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('tt-journal'));
}

// ---------- Rechnen (rein, ohne Speicher) ----------

export const entryTotals = (e) => per(e, e.grams);

export function sumEntries(list) {
  const t = Object.fromEntries(NUTRIENTS.map((n) => [n, 0]));
  for (const e of list || []) {
    const x = entryTotals(e);
    for (const n of NUTRIENTS) t[n] += x[n];
  }
  return t;
}

/** Kurzform eines Lebensmittels für Favoriten und „Zuletzt“. */
export function foodSnap(food) {
  return { src: food.src, id: food.ref || food.id, n: food.n, brand: food.brand || '', serving: food.serving || null, liq: isLiq(food), ...nutrientsOf(food) };
}

/** Neuer Eintrag aus einem Lebensmittel. Wirft bei unsinniger Menge oder Mahlzeit. */
export function makeEntry(food, grams, meal) {
  if (!(grams > 0 && grams <= MAX_GRAMS)) throw new Error(`Menge muss zwischen 0 und ${MAX_GRAMS} liegen.`);
  if (!MEALS.some((m) => m.id === meal)) throw new Error(`Unbekannte Mahlzeit: ${meal}`);
  return { id: uuid(), meal, grams, ref: food.ref || food.id, src: food.src, n: food.n, brand: food.brand || '', liq: isLiq(food), ...nutrientsOf(food) };
}

// ---------- Zugriff ----------

export const entriesOf = (iso) => store.get('days')[iso] || [];
export const dayTotals = (iso) => sumEntries(entriesOf(iso));
export const prefs = () => store.get('journal_prefs');
export const setPrefs = (patch) => { store.update('journal_prefs', (p) => Object.assign(p, patch)); changed(); };

function writeDay(iso, fn) {
  const ok = store.update('days', (days) => {
    const next = fn((days[iso] || []).slice());
    if (next.length) days[iso] = next; else delete days[iso];
  });
  changed();
  return ok;
}

/** Trägt ein Lebensmittel ein und merkt es unter „Zuletzt“ mit der Menge. Gibt den Eintrag zurück. */
export function addEntry(iso, food, grams, meal) {
  const entry = makeEntry(food, grams, meal);
  writeDay(iso, (list) => list.concat([entry]));
  const id = entry.ref;
  store.update('recent', (r) => [{ ...foodSnap(food), lastGrams: grams }].concat(r.filter((x) => x.id !== id)).slice(0, RECENT_MAX));
  return entry;
}

/** Ändert Menge oder Mahlzeit eines Eintrags. */
export function updateEntry(iso, id, { grams, meal }) {
  if (grams != null && !(grams > 0 && grams <= MAX_GRAMS)) throw new Error('Ungültige Menge.');
  if (meal != null && !MEALS.some((m) => m.id === meal)) throw new Error('Ungültige Mahlzeit.');
  return writeDay(iso, (list) => list.map((e) => (e.id === id ? { ...e, ...(grams != null ? { grams } : {}), ...(meal ? { meal } : {}) } : e)));
}

/** Löscht einen Eintrag; gibt ihn zurück (für „Rückgängig“). */
export function removeEntry(iso, id) {
  const gone = entriesOf(iso).find((e) => e.id === id) || null;
  if (gone) writeDay(iso, (list) => list.filter((e) => e.id !== id));
  return gone;
}

/** Stellt einen gelöschten Eintrag an seiner Stelle am Ende wieder her. */
export function restoreEntry(iso, entry) {
  if (entry && !entriesOf(iso).some((e) => e.id === entry.id)) writeDay(iso, (list) => list.concat([entry]));
}

/** Übernimmt Einträge eines anderen Tages (optional nur eine Mahlzeit) als neue Einträge. Gibt die Anzahl zurück. */
export function copyEntries(fromIso, toIso, meal = null) {
  const src = entriesOf(fromIso).filter((e) => !meal || e.meal === meal);
  if (!src.length) return 0;
  writeDay(toIso, (list) => list.concat(src.map((e) => ({ ...e, id: uuid() }))));
  return src.length;
}

// ---------- Favoriten und Zuletzt ----------

export const favs = () => store.get('favs');
export const recent = () => store.get('recent');
export const isFav = (id) => favs().some((x) => x.id === id);
export const lastGrams = (id) => (recent().find((x) => x.id === id) || {}).lastGrams || null;

/** Favorit an/aus; gibt den neuen Zustand zurück. */
export function toggleFav(food) {
  const id = food.ref || food.id;
  const on = !isFav(id);
  store.update('favs', (f) => (on ? [foodSnap(food)].concat(f) : f.filter((x) => x.id !== id)));
  changed();
  return on;
}

// ---------- Beispieldaten (Entwicklung) ----------

/** Anzahl der Beispiel-Einträge (demo: true) über alle Tage. */
export function demoCount() {
  return Object.values(store.get('days')).reduce((a, list) => a + list.filter((e) => e.demo).length, 0);
}

/** Entfernt alle Beispiel-Einträge; echte Einträge bleiben. Gibt die Anzahl zurück. */
export function removeDemo() {
  let n = 0;
  store.update('days', (days) => {
    for (const iso of Object.keys(days)) {
      const keep = days[iso].filter((e) => !e.demo);
      n += days[iso].length - keep.length;
      if (keep.length) days[iso] = keep; else delete days[iso];
    }
  });
  changed();
  return n;
}

/** Ersetzt vorhandene Beispiel-Einträge durch neue ({ iso: [Eintrag] }); echte Einträge bleiben. */
export function loadDemo(map) {
  removeDemo();
  let n = 0;
  const ok = store.update('days', (days) => {
    for (const [iso, list] of Object.entries(map)) {
      days[iso] = (days[iso] || []).concat(list.map((e) => ({ ...e, demo: true })));
      n += list.length;
    }
  });
  changed();
  return ok ? n : 0;
}
