// Eigene Lebensmittel (Werte pro 100 g/ml, z. B. von der Packung oder vom Foto). Einzige Stelle, die tt_custom speichert.
// Nach saveOwnFood/removeOwnFood im Kalorien-Tracker (Rezeptbuch/tracker/js/app.js, ST0PTV/JuliaKelp, MIT).
import * as store from '../../core/store.js';
import { uuid } from '../../core/util.js';

store.define('custom', []);

export const customFoods = () => store.get('custom');
export const customById = (id) => customFoods().find((x) => x.id === id) || null;

function changed() {
  if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('tt-foods'));
}

/** Prüft und normalisiert Eingaben. Wirft mit Text für die Oberfläche. */
export function makeCustom(v, id = null) {
  const n = String(v.n || '').trim();
  if (!n) throw new Error('Bitte einen Namen eingeben.');
  if (!(v.k >= 0 && v.k <= 900)) throw new Error('kcal pro 100 g muss zwischen 0 und 900 liegen.');
  for (const [key, label] of [['p', 'Eiweiß'], ['c', 'Kohlenhydrate'], ['f', 'Fett'], ['fi', 'Ballaststoffe'], ['su', 'Zucker']]) {
    if (v[key] != null && !(v[key] >= 0 && v[key] <= 100)) throw new Error(`${label} pro 100 g muss zwischen 0 und 100 liegen.`);
  }
  if (v.su != null && v.c != null && v.su > v.c + 0.05) throw new Error('Zucker kann nicht mehr sein als Kohlenhydrate.');
  const food = {
    src: 'custom', id: id || 'custom:' + uuid(), n, brand: String(v.brand || '').trim(), k: v.k,
    p: v.p || 0, c: v.c || 0, f: v.f || 0, fi: v.fi || 0, su: v.su || 0, fs: v.fs ?? null,
    serving: v.serving || null, barcode: v.barcode || null, liq: !!v.liq,
    ns: v.ns || 'hand' // Herkunft der Zahlen: hand | foto | off-edit
  };
  const miss = ['p', 'c', 'f', 'fi', 'su'].filter((key) => v[key] == null);
  if (miss.length) food.miss = miss; // leere Felder = keine Angabe (zählen als 0)
  for (const key of ['d', 'a', 'sw', 'sf', 'sa']) if (v[key] != null) food[key] = v[key];
  return food;
}

export function saveCustom(food) {
  store.update('custom', (list) => {
    const i = list.findIndex((x) => x.id === food.id);
    if (i >= 0) list[i] = food; else list.push(food);
  });
  changed();
  return food;
}

export function removeCustom(id) {
  store.update('custom', (list) => list.filter((x) => x.id !== id));
  changed();
}
