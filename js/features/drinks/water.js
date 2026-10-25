// Wasserzähler: eigene Einträge, Getränke aus dem Koffein-Tracker und flüssige Journal-Einträge mit „zählt zum Wasser“.
// Aus Rezeptbuch/tracker/js/app.js (waterAdd, waterRows; Kalorien-Tracker von ST0PTV, angepasst von JuliaKelp; MIT).
// Standardziel 1,5 l Getränke pro Tag (Richtwert der DGE); EFSA (2010): angemessene Gesamtwasserzufuhr 2,5 l (Männer)
// bzw. 2,0 l (Frauen) inklusive Wasser aus Lebensmitteln. Annahme 1 ml ≈ 1 g für Getränke aus dem Journal.
import * as store from '../../core/store.js';
import { uuid } from '../../core/util.js';
import { isoDate } from '../../core/format.js';
import { entriesOf } from '../journal/journal.js';

store.define('water', { enabled: true, goal: 1500, step: 250, log: {}, foods: {} });
// log: { 'JJJJ-MM-TT': [{ id, ml, min }] }   foods: { Lebensmittel-ID: true|false } (zählt zum Wasser, gemerkt)

export const waterSettings = () => store.get('water');
const changed = () => { if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('tt-journal')); };

export function setWaterSettings(patch) {
  store.update('water', (w) => Object.assign(w, patch));
  changed();
}

/** Eigene Wasser-Einträge eines Tages. */
export const waterEntries = (iso) => waterSettings().log[iso] || [];

/** ml eintragen; min = Minuten seit 0 Uhr (heute: jetzt). Gibt den Eintrag zurück. */
export function addWater(iso, ml, { min = null, demo = false } = {}) {
  if (!(ml >= 10 && ml <= 3000)) throw new Error('Bitte 10–3.000 ml eingeben.');
  const now = new Date();
  const e = { id: uuid(), ml: Math.round(ml), min: min ?? (iso === isoDate(now) ? now.getHours() * 60 + now.getMinutes() : null) };
  if (demo) e.demo = true;
  store.update('water', (w) => { (w.log[iso] = w.log[iso] || []).push(e); });
  changed();
  return e;
}

export function removeWater(iso, id) {
  const gone = waterEntries(iso).find((x) => x.id === id) || null;
  store.update('water', (w) => {
    w.log[iso] = (w.log[iso] || []).filter((x) => x.id !== id);
    if (!w.log[iso].length) delete w.log[iso];
  });
  changed();
  return gone;
}

export function restoreWater(iso, e) {
  if (!e || waterEntries(iso).some((x) => x.id === e.id)) return;
  store.update('water', (w) => { (w.log[iso] = w.log[iso] || []).push(e); });
  changed();
}

/** Gemerkt: zählt dieses Lebensmittel zum Wasser? (null = noch nie gewählt) */
export const waterFoodDefault = (id) => (id in waterSettings().foods ? !!waterSettings().foods[id] : null);
export function rememberWaterFood(id, on) {
  store.update('water', (w) => { w.foods[id] = !!on; });
}

/**
 * Alle Zeilen, die zum Wasser zählen: eigene (w), aus dem Koffein-Tracker (c) und aus dem Journal (f).
 * caffeineRows: Liste [{ id, min, n, ml }] von Koffein-Getränken mit „zählt mit“ (kommt von außen, keine Abhängigkeit).
 */
export function waterRows(iso, caffeineRows = []) {
  const rows = waterEntries(iso).map((x) => ({ kind: 'w', id: x.id, min: x.min, n: 'Wasser', ml: x.ml }));
  for (const c of caffeineRows) rows.push({ kind: 'c', id: c.id, min: c.min, n: c.n, ml: c.ml, src: 'aus Koffein' });
  for (const e of entriesOf(iso)) {
    if (e.water && e.liq && e.grams > 0) rows.push({ kind: 'f', id: e.id, min: e.t ? Number(e.t.slice(0, 2)) * 60 + Number(e.t.slice(3, 5)) : null, n: e.n, ml: e.grams, src: 'aus dem Journal' });
  }
  return rows.sort((a, b) => (a.min ?? -1) - (b.min ?? -1));
}

export const waterTotal = (rows) => rows.reduce((a, r) => a + (r.ml || 0), 0);

// ---------- Beispieldaten ----------
export function removeDemoWater() {
  store.update('water', (w) => {
    for (const iso of Object.keys(w.log)) {
      w.log[iso] = w.log[iso].filter((x) => !x.demo);
      if (!w.log[iso].length) delete w.log[iso];
    }
  });
  changed();
}

/** Beispieldaten in einem Zug schreiben ({ iso: [{ ml, min }] }); ersetzt alte Beispiel-Einträge. */
export function loadDemoWater(map) {
  removeDemoWater();
  store.update('water', (w) => {
    for (const [iso, list] of Object.entries(map)) w.log[iso] = (w.log[iso] || []).concat(list.map((x) => ({ id: uuid(), ml: x.ml, min: x.min, demo: true })));
  });
  changed();
}
