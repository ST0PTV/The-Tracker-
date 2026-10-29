// Journal: Einträge pro Tag und Mahlzeit, Favoriten, zuletzt verwendet. Einzige Stelle, die diese Daten speichert.
// Datenform wie im Kalorien-Tracker (Rezeptbuch/tracker/js/app.js, ST0PTV/JuliaKelp, MIT): Ein Eintrag hält eine
// Kopie der Nährwerte je 100 g, damit spätere Änderungen an einem Lebensmittel alte Tage nicht verändern.
import * as store from '../../core/store.js';
import { uuid, nowISO } from '../../core/util.js';
import { NUTRIENTS, nutrientsOf, per, isLiq } from '../food/foods.js';

export const MEALS = [
  { id: 'breakfast', label: 'Frühstück' },
  { id: 'lunch', label: 'Mittagessen' },
  { id: 'dinner', label: 'Abendessen' },
  { id: 'snack', label: 'Snacks' }
];
// Standard-Uhrzeit je Mahlzeit, wenn ein Eintrag keine eigene hat (grobe Annahme; „Unverified 0.1.4“)
export const MEAL_MIN = { breakfast: 8 * 60, lunch: 12 * 60 + 30, dinner: 18 * 60 + 30, snack: 15 * 60 + 30 };
/** Minuten seit 0 Uhr eines Eintrags: eigene Uhrzeit (t, "HH:MM") oder Standard der Mahlzeit. */
export function entryMin(e) {
  if (e.t && /^\d{2}:\d{2}$/.test(e.t)) return Number(e.t.slice(0, 2)) * 60 + Number(e.t.slice(3, 5));
  return MEAL_MIN[e.meal] ?? 720;
}
/** Mahlzeit passend zur Uhrzeit (für Vorauswahl im „+“-Menü und verknüpfte Einträge). */
export const mealByMin = (min) => (min < 10 * 60 + 30 ? 'breakfast' : min < 14 * 60 + 30 ? 'lunch' : min < 17 * 60 + 30 ? 'snack' : 'dinner');
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

/* Zusatzfelder eines Eintrags (optional):
   water: true  – Flüssigkeit zählt zum Wasserzähler
   cf: Zahl     – Koffein in mg pro 100 g/ml (der Koffein-Tracker rechnet daraus; Ausnahme: verknüpfte Einträge)
   t: 'HH:MM'   – abweichende Uhrzeit (für Koffein)
   link: Text   – Eintrag gehört zu einem anderen Tracker (z. B. 'caff:<id>'); wird dort angelegt und gelöscht
   at: ISO-Zeit – wann der Eintrag erfasst wurde (UTC, ab 0.2.5). Einmal beim Anlegen gesetzt, bleibt bei Ändern,
                  Rückgängig und Wiederherstellen; eine Kopie auf einen anderen Tag ist ein neuer Eintrag mit neuem at.
                  Ältere Einträge haben kein at („Zeit unbekannt“) – es wird nichts nachgetragen. Vorbereitung für das
                  Level-System (Nachtragen zählt dort nur bis 7 Tage; Drive: Ideas - Level System Integration). */
const EXTRA = ['water', 'cf', 't'];
function extras(o = {}) {
  const x = {};
  if (o.water) x.water = true;
  if (o.cf > 0 && o.cf <= 1000) x.cf = Math.round(o.cf * 10) / 10;
  if (/^\d{2}:\d{2}$/.test(o.t || '')) x.t = o.t;
  return x;
}

/** Neuer Eintrag aus einem Lebensmittel. Wirft bei unsinniger Menge oder Mahlzeit. */
export function makeEntry(food, grams, meal, more = {}) {
  if (!(grams > 0 && grams <= MAX_GRAMS)) throw new Error(`Menge muss zwischen 0 und ${MAX_GRAMS} liegen.`);
  if (!MEALS.some((m) => m.id === meal)) throw new Error(`Unbekannte Mahlzeit: ${meal}`);
  return { id: uuid(), meal, grams, ref: food.ref || food.id, src: food.src, n: food.n, brand: food.brand || '', liq: isLiq(food), ...nutrientsOf(food), ...extras(more), at: nowISO() };
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
export function addEntry(iso, food, grams, meal, more = {}) {
  const entry = makeEntry(food, grams, meal, more);
  writeDay(iso, (list) => list.concat([entry]));
  const id = entry.ref;
  store.update('recent', (r) => [{ ...foodSnap(food), lastGrams: grams }].concat(r.filter((x) => x.id !== id)).slice(0, RECENT_MAX));
  return entry;
}

/**
 * „Schnell – nur kcal“ (wie im Calorie-Tracker): Eintrag ohne Lebensmittel, nur Energie. Makros fehlen und erscheinen
 * im Kalorien-Ring grau als Rest. Gespeichert als 100 „g“ mit k = kcal; erscheint nicht unter „Zuletzt“.
 */
export function quickFood(kcal, name = '') {
  if (!(kcal >= 1 && kcal <= 5000)) throw new Error('Bitte zwischen 1 und 5.000 kcal eingeben.');
  return { src: 'quick', id: 'quick', n: String(name).trim() || 'Schnell eingetragen', brand: '', liq: false,
    k: Math.round(kcal), p: 0, c: 0, f: 0, fi: 0, su: 0, fs: 0 };
}
export function addQuick(iso, kcal, meal, name = '') {
  const entry = makeEntry(quickFood(kcal, name), 100, meal);
  writeDay(iso, (list) => list.concat([entry]));
  return entry;
}
export function updateQuick(iso, id, { kcal, name, meal }) {
  const f = quickFood(kcal, name);
  if (!MEALS.some((m) => m.id === meal)) throw new Error('Ungültige Mahlzeit.');
  return writeDay(iso, (list) => list.map((e) => (e.id === id ? { ...e, meal, n: f.n, k: f.k } : e)));
}
export const isQuick = (e) => e.src === 'quick';

/** Ändert Menge, Mahlzeit und (wenn angegeben) Zusatzfelder eines Eintrags. */
export function updateEntry(iso, id, { grams, meal, ...more }) {
  if (grams != null && !(grams > 0 && grams <= MAX_GRAMS)) throw new Error('Ungültige Menge.');
  if (meal != null && !MEALS.some((m) => m.id === meal)) throw new Error('Ungültige Mahlzeit.');
  const touch = EXTRA.filter((k) => k in more);
  return writeDay(iso, (list) => list.map((e) => {
    if (e.id !== id) return e;
    const n = { ...e, ...(grams != null ? { grams } : {}), ...(meal ? { meal } : {}) };
    for (const k of touch) delete n[k];
    return { ...n, ...extras(Object.fromEntries(touch.map((k) => [k, more[k]]))) };
  }));
}

/**
 * Verknüpfter Eintrag eines anderen Trackers (z. B. kcal eines Koffein-Getränks): anlegen, ersetzen oder (entry = null)
 * entfernen. link identifiziert ihn ('caff:<id>'). Zählt nicht unter „Zuletzt“.
 */
export function setLinkedEntry(iso, link, entry) {
  return writeDay(iso, (list) => {
    const rest = list.filter((e) => e.link !== link);
    if (!entry) return rest;
    const old = list.find((e) => e.link === link);
    // Ersetzen ist ein Ändern: Erfassungszeit des alten Eintrags bleibt
    return rest.concat([{ ...entry, id: old ? old.id : uuid(), link, ...(old && old.at ? { at: old.at } : {}) }]);
  });
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
  const src = entriesOf(fromIso).filter((e) => (!meal || e.meal === meal) && !e.link);
  if (!src.length) return 0;
  const at = nowISO();
  writeDay(toIso, (list) => list.concat(src.map((e) => ({ ...e, id: uuid(), at }))));
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
