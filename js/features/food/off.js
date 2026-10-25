// Produkt zu einem Barcode: eigenes Lebensmittel, schon gescannt (Speicher) oder neu von Open Food Facts.
// Aus Rezeptbuch/tracker/js/app.js (fetchProduct, offDiet; Kalorien-Tracker von ST0PTV, angepasst von JuliaKelp; MIT).
// Datenschutz: Nur die Barcode-Nummer geht an Open Food Facts. Daten: Open Food Facts, ODbL 1.0 / DbCL 1.0.
import * as store from '../../core/store.js';
import { num } from '../../core/format.js';

store.define('offcache', {}); // { barcode: Lebensmittel }

const OFF_URL = 'https://world.openfoodfacts.org/api/v2/product/';
const OFF_FIELDS = 'code,product_name,product_name_de,brands,nutriments,serving_quantity,serving_size,product_quantity,quantity,allergens_tags,ingredients_analysis_tags,additives_tags';
const CACHE_MAX = 500;

// Süßstoffe und Zuckeraustauschstoffe nach E-Nummer (Open Food Facts: additives_tags)
const SWEETENERS = {
  'en:e420': 'Sorbit', 'en:e421': 'Mannit', 'en:e950': 'Acesulfam', 'en:e951': 'Aspartam', 'en:e952': 'Cyclamat', 'en:e953': 'Isomalt',
  'en:e954': 'Saccharin', 'en:e955': 'Sucralose', 'en:e957': 'Thaumatin', 'en:e959': 'Neohesperidin', 'en:e960': 'Steviol', 'en:e961': 'Neotam',
  'en:e962': 'Aspartam-Acesulfam', 'en:e964': 'Polyglycitol', 'en:e965': 'Maltit', 'en:e966': 'Lactit', 'en:e967': 'Xylit', 'en:e968': 'Erythrit', 'en:e969': 'Advantam'
};
// Allergene nach LMIV Anhang II (ohne Sulfite), Kürzel wie im BLS-Auszug
export const ALLERGENS = [
  ['gl', 'Gluten'], ['mi', 'Milch/Laktose'], ['ei', 'Ei'], ['nu', 'Schalenfrüchte'], ['er', 'Erdnuss'], ['so', 'Soja'],
  ['fi', 'Fisch'], ['kr', 'Krebstiere'], ['we', 'Weichtiere'], ['se', 'Sellerie'], ['sf', 'Senf'], ['sa', 'Sesam'], ['lu', 'Lupine']
];
const OFF_ALLERGEN = {
  'en:gluten': 'gl', 'en:milk': 'mi', 'en:eggs': 'ei', 'en:nuts': 'nu', 'en:peanuts': 'er', 'en:soybeans': 'so', 'en:fish': 'fi',
  'en:crustaceans': 'kr', 'en:molluscs': 'we', 'en:celery': 'se', 'en:mustard': 'sf', 'en:sesame-seeds': 'sa', 'en:lupin': 'lu'
};

/** Ernährungsform (2 vegan, 1 vegetarisch, 0 mit Fleisch/Fisch, null unbekannt) und Allergene aus Open Food Facts. */
export function offDiet(p) {
  const t = p.ingredients_analysis_tags || [];
  const d = t.includes('en:vegan') ? 2 : t.includes('en:vegetarian') ? 1 : t.includes('en:non-vegetarian') ? 0 : null;
  const a = (p.allergens_tags || []).map((x) => OFF_ALLERGEN[x]).filter(Boolean);
  return { d, a: d == null ? null : a };
}

/** Scheibengewicht aus „serving_size“ (z. B. „2 Scheiben (25 g)“), sonst null. */
export function offSliceG(s) {
  if (!s || !/scheibe|slice|tranche|fetta|rebanada/i.test(s)) return null;
  const m = String(s).match(/(\d+(?:[.,]\d+)?)\s*g\b/i); const g = m ? num(m[1]) : null;
  const k = String(s).match(/^\s*(\d+)\s*(?:scheibe|slice|tranche|fetta)/i); const n = k ? +k[1] : 1;
  return g && g > 0 && g < 200 ? Math.round((g / n) * 10) / 10 : null;
}

/** Antwort von Open Food Facts → Lebensmittel der App, oder null, wenn kein Produkt oder kein Brennwert. */
export function mapOffProduct(code, data) {
  const p = data && data.product;
  const nm = p && p.nutriments;
  if (!p || data.status !== 1 || !nm) return null;
  let k = num(nm['energy-kcal_100g']);
  if (k == null && num(nm.energy_100g) != null) k = num(nm.energy_100g) / 4.184; // nur kJ angegeben
  if (k == null) return null;
  return {
    src: 'off', id: 'off:' + code, barcode: code,
    n: (p.product_name_de || p.product_name || '').trim() || 'Produkt ' + code,
    brand: (p.brands || '').split(',')[0].trim(),
    k, p: num(nm.proteins_100g) || 0, c: num(nm.carbohydrates_100g) || 0, f: num(nm.fat_100g) || 0,
    fi: num(nm.fiber_100g) || 0, su: num(nm.sugars_100g) || 0, fs: num(nm['added-sugars_100g']),
    ...offDiet(p),
    serving: num(p.serving_quantity) || null,
    pq: num(p.product_quantity) || null,
    sliceG: offSliceG(p.serving_size),
    liq: /\d\s*(ml|cl|l)\b/i.test(p.quantity || ''),
    sw: [...new Set((p.additives_tags || []).map((a) => SWEETENERS[a.replace(/[a-z]$/, '')]).filter(Boolean))],
    // Was Open Food Facts nicht kennt (statt 0)
    miss: [['p', 'proteins_100g'], ['c', 'carbohydrates_100g'], ['f', 'fat_100g'], ['fi', 'fiber_100g'], ['su', 'sugars_100g']].filter(([, x]) => num(nm[x]) == null).map(([key]) => key)
  };
}

export const offCache = () => store.get('offcache');

/** Schon gescannte Produkte als Liste (für die Suche). */
export const scannedFoods = () => Object.values(offCache());

function remember(food) {
  store.update('offcache', (c) => {
    c[food.barcode] = food;
    const keys = Object.keys(c);
    if (keys.length > CACHE_MAX) for (const k of keys.slice(0, keys.length - CACHE_MAX)) delete c[k];
  });
}

/**
 * Sucht ein Produkt. own: Liste eigener Lebensmittel (Barcode hat Vorrang). fetchFn: für Tests ersetzbar.
 * Ergebnis: { food } | { missing: true } | { offline: true }
 */
export async function fetchProduct(code, { own = [], fetchFn = globalThis.fetch } = {}) {
  const mine = own.find((x) => x.barcode === code);
  if (mine) return { food: mine };
  const cached = offCache()[code];
  if (cached) return { food: cached };
  try {
    const res = await fetchFn(`${OFF_URL}${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`);
    if (res.status === 404) return { missing: true };
    const food = mapOffProduct(code, await res.json());
    if (!food) return { missing: true };
    remember(food);
    return { food };
  } catch {
    return { offline: true };
  }
}

/** Barcode-Eingabe prüfen: 8, 12 oder 13 Ziffern (EAN-8, UPC-A, EAN-13). */
export const validCode = (s) => /^(\d{8}|\d{12}|\d{13})$/.test(String(s || '').replace(/\D/g, '')) && String(s).replace(/\D/g, '');
