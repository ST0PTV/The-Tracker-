// Lebensmittel teilen (0.5.1): eigene Lebensmittel, eigene Rezepte je 100 g, gescannte Produkte und Favoriten als eine
// Datei – zum Weitergeben an andere Personen oder ein zweites Gerät. Eigenes Format von The Tracker (Nutzerwunsch
// 2026-11-15: keine Kompatibilität zu den Ursprungs-Apps). Idee nach „Lebensmittel teilen“ im Calorie-Tracker (app.js,
// ST0PTV, MIT). Laden fügt nur hinzu: Vorhandenes (gleiche ID, gleicher Barcode oder gleicher Name mit gleichen kcal)
// bleibt unverändert. Grenzen wie beim Backup (core/backup.js): Dateigröße, Textlänge, nur bekannte Felder.
import { makeCustom, customFoods, saveCustom } from './custom.js';
import { scannedFoods, offCache, addScanned, validCode } from './off.js';
import { favs, toggleFav, isFav } from '../journal/journal.js';
import { VERSION } from '../../core/version.js';
import { norm } from '../../core/format.js';

export const FOODS_KIND = 'foods';
export const FOODS_FORMAT = 1;
export const FOODS_MAX_BYTES = 5 * 1024 * 1024;
export const FOODS_MAX_ITEMS = 2000;
const MAX_TEXT = 200;

const PART_NUM = ['k', 'p', 'c', 'f', 'fi', 'su', 'fs'];
const NUM = ['k', 'p', 'c', 'f', 'fi', 'su', 'fs', 'serving', 'pq', 'sliceG', 'cf'];

/** Inhalt der Datei. */
export function buildFoods(now = new Date()) {
  return {
    app: 'the-tracker', kind: FOODS_KIND, format: FOODS_FORMAT, version: VERSION, exportedAt: now.toISOString(),
    custom: customFoods().map((x) => { const y = { ...x }; delete y.created; delete y.updated; delete y.filled; return y; }),
    scanned: scannedFoods().map((x) => { const y = { ...x }; delete y.scannedAt; return y; }),
    favs: favs().map((x) => x.id)
  };
}

export const foodsFileName = (now = new Date()) => {
  const p = (n) => String(n).padStart(2, '0');
  return `the-tracker-lebensmittel-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
};

const txt = (v) => (v == null ? '' : String(v).slice(0, MAX_TEXT));
const numOk = (v) => v == null || (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100000);

/** Gescanntes Produkt aus der Datei: nur bekannte Felder, Zahlen geprüft. null bei Fehler. */
function cleanScanned(x) {
  if (!x || typeof x !== 'object') return null;
  const code = validCode(x.barcode);
  if (!code || !(x.k >= 0 && x.k <= 900)) return null;
  for (const k of NUM) if (!numOk(x[k])) return null;
  const y = { src: 'off', id: 'off:' + code, barcode: code, n: txt(x.n) || 'Produkt ' + code, brand: txt(x.brand) };
  for (const k of NUM) if (x[k] != null) y[k] = x[k];
  for (const k of ['p', 'c', 'f', 'fi', 'su']) if (y[k] == null) y[k] = 0;
  y.liq = !!x.liq;
  if (x.d === 0 || x.d === 1 || x.d === 2) y.d = x.d;
  if (Array.isArray(x.a)) y.a = x.a.filter((a) => /^[a-z]{2}$/.test(a)).slice(0, 20);
  if (Array.isArray(x.sw)) y.sw = x.sw.map(txt).slice(0, 20);
  if (Array.isArray(x.miss)) y.miss = x.miss.filter((m) => ['p', 'c', 'f', 'fi', 'su'].includes(m));
  return y;
}

/** Eigenes Lebensmittel aus der Datei über makeCustom (gleiche Prüfungen wie beim Abtippen). null bei Fehler. */
function cleanCustom(x) {
  if (!x || typeof x !== 'object' || !/^custom:[\w-]{1,64}$/.test(String(x.id || ''))) return null;
  for (const k of NUM) if (!numOk(x[k])) return null;
  try {
    const f = makeCustom({ ...x, n: txt(x.n), brand: txt(x.brand), barcode: x.barcode ? validCode(x.barcode) || null : null }, x.id);
    // Eigene Rezepte (food/recipe-food.js): Zutaten und Gewichte mitnehmen, nur Namen und Zahlen
    if (x.ns === 'rezept' && Array.isArray(x.parts)) {
      f.ns = 'rezept';
      f.parts = x.parts.slice(0, 60).filter((q) => q && typeof q === 'object' && numOk(q.g) && q.g > 0 && PART_NUM.every((k) => numOk(q[k])))
        .map((q) => ({ id: txt(q.id), n: txt(q.n), g: q.g, ...Object.fromEntries(PART_NUM.filter((k) => q[k] != null).map((k) => [k, q[k]])) }));
      if (numOk(x.total) && x.total > 0) f.total = x.total;
      if (Number.isInteger(x.portions) && x.portions >= 1 && x.portions <= 50) f.portions = x.portions;
    }
    return f;
  } catch { return null; }
}

/**
 * Prüft den Text einer Datei. Gibt { custom, scanned, favs, skipped } oder wirft mit Text für die Oberfläche.
 * Nichts wird gespeichert.
 */
export function parseFoods(text) {
  if (typeof text !== 'string' || text.length > FOODS_MAX_BYTES) throw new Error('Die Datei ist zu groß (höchstens 5 MB).');
  let d;
  try { d = JSON.parse(text); } catch { throw new Error('Die Datei ist kein gültiges JSON.'); }
  if (!d || d.app !== 'the-tracker' || d.kind !== FOODS_KIND) throw new Error('Das ist keine Lebensmittel-Datei von The Tracker.');
  if (d.format !== FOODS_FORMAT) throw new Error('Dieses Dateiformat kennt die App noch nicht. Bitte die App aktualisieren.');
  const arr = (v) => (Array.isArray(v) ? v : []);
  if (arr(d.custom).length + arr(d.scanned).length > FOODS_MAX_ITEMS) throw new Error(`Höchstens ${FOODS_MAX_ITEMS} Lebensmittel pro Datei.`);
  const custom = arr(d.custom).map(cleanCustom);
  const scanned = arr(d.scanned).map(cleanScanned);
  const skipped = custom.filter((x) => !x).length + scanned.filter((x) => !x).length;
  return {
    custom: custom.filter(Boolean), scanned: scanned.filter(Boolean),
    favs: arr(d.favs).filter((id) => typeof id === 'string' && /^(bls|off|custom):[\w-]{1,64}$/.test(id)).slice(0, FOODS_MAX_ITEMS),
    skipped
  };
}

const sameKey = (x) => `${norm(x.n)}|${Math.round(x.k)}`;

/** Was beim Laden neu wäre: { custom: [...], scanned: [...], favs: [...] } (ohne Vorhandenes). */
export function newFoods(parsed) {
  const ownIds = new Set(customFoods().map((x) => x.id));
  const ownKeys = new Set(customFoods().map(sameKey));
  const ownCodes = new Set(customFoods().map((x) => x.barcode).filter(Boolean));
  const cache = offCache();
  const seen = new Set();
  const custom = parsed.custom.filter((x) => {
    const k = sameKey(x);
    if (ownIds.has(x.id) || ownKeys.has(k) || seen.has(k) || (x.barcode && ownCodes.has(x.barcode))) return false;
    seen.add(k); return true;
  });
  const scanned = parsed.scanned.filter((x) => !cache[x.barcode] && !ownCodes.has(x.barcode));
  return { custom, scanned, favs: parsed.favs };
}

/** Übernimmt neue Lebensmittel. Favoriten nur für Lebensmittel, die danach da sind. Gibt die Anzahlen zurück. */
export function applyFoods(parsed, findFood) {
  const n = newFoods(parsed);
  for (const x of n.custom) saveCustom(x);
  for (const x of n.scanned) addScanned(x);
  let fav = 0;
  for (const id of n.favs) {
    if (isFav(id)) continue;
    const f = findFood(id);
    if (f) { toggleFav(f); fav++; }
  }
  return { custom: n.custom.length, scanned: n.scanned.length, favs: fav, skipped: parsed.skipped };
}
