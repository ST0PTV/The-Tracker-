// Lebensmittel: Bundeslebensmittelschlüssel laden, suchen, Nährwerte rechnen, Flüssigkeiten erkennen.
// Aus Rezeptbuch/tracker/js/app.js (Kalorien-Tracker von ST0PTV, ins Rezeptbuch übernommen von JuliaKelp; beide MIT).
// Daten: Max Rubner-Institut (2025), BLS 4.0, CC BY 4.0, verändert (Auszug; freier Zucker, Ernährungsform und
// Allergene abgeleitet) – siehe data/bls.json → meta und „Ich → Quellen & Lizenzen“.
import { norm } from '../../core/format.js';

// k = kcal, p = Eiweiß, c = Kohlenhydrate, f = Fett, fi = Ballaststoffe, su = Zucker, fs = freier Zucker (Teil von su), je 100 g
export const NUTRIENTS = ['k', 'p', 'c', 'f', 'fi', 'su', 'fs'];
// Mineralstoffe und Vitamine je 100 g (nur BLS); werden mitgeführt, angezeigt erst in einem späteren Schritt
export const MICROS = ['fe', 'mg', 'b12', 'zn', 'ca', 'fol', 'vd', 'jod'];

let list = [];
let byId = new Map();
let meta = null;
let state = 'idle'; // idle | loading | ready | failed
let pending = null;

/** Wandelt einen Rohdatensatz aus data/bls.json in ein Lebensmittel der App um. */
export function fromBls(x) {
  const food = { src: 'bls', id: 'bls:' + x.id, n: x.n, k: x.k, p: x.p, c: x.c, f: x.f, fi: x.fi || 0, su: x.su || 0, fs: x.fs };
  if (x.d != null) food.d = x.d; // Ernährungsform (abgeleitet)
  if (x.a) food.a = x.a;         // Allergene (abgeleitet)
  for (const m of MICROS) if (x[m] != null) food[m] = x[m];
  return food;
}

/** Lädt data/bls.json einmal (danach aus dem Speicher). Gibt die Liste zurück; bei Fehler eine leere Liste. */
export function loadFoods(url = 'data/bls.json') {
  if (pending) return pending;
  state = 'loading';
  pending = fetch(url)
    .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
    .then((data) => {
      meta = data.meta || null;
      setFoods((data.foods || []).map(fromBls));
      state = 'ready';
      if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('tt-foods'));
      return list;
    })
    .catch(() => { state = 'failed'; pending = null; return list; });
  return pending;
}

/** Für Tests: Liste direkt setzen. */
export function setFoods(foods) {
  list = foods;
  byId = new Map(list.map((f) => [f.id, f]));
  state = 'ready';
}

export const foodsState = () => state;
export const foodsMeta = () => meta;
export const allFoods = () => list;
export const foodById = (id) => byId.get(id) || null;

/** Freier Zucker je 100 g: gespeicherter Wert (höchstens Gesamtzucker), sonst konservativ = Gesamtzucker. */
export function fsOf(food) {
  return food.fs != null ? Math.min(food.fs, food.su || 0) : (food.su || 0);
}

/** Nährwerte je 100 g als eigenes Objekt (für Einträge, damit sie später unverändert bleiben). */
export function nutrientsOf(food) {
  const o = {};
  for (const n of NUTRIENTS) o[n] = n === 'fs' ? fsOf(food) : (food[n] || 0);
  return o;
}

/** Nährwerte für eine Menge in g (bzw. ml). */
export function per(food, grams) {
  const f = (grams || 0) / 100;
  const o = {};
  for (const n of NUTRIENTS) o[n] = (n === 'fs' ? fsOf(food) : (food[n] || 0)) * f;
  return o;
}

/* Flüssigkeiten werden in ml angezeigt und eingegeben. Gespeichert wird die Menge als Zahl,
   Annahme 1 ml ≈ 1 g (Dichte 1,0; Milch ca. 1,03, Saft ca. 1,04 → Abweichung bis ca. 4 %). */
export function blsLiquid(id, n) {
  if (!id || !String(id).startsWith('bls:')) return false;
  const g = id[4];
  if (g === 'P') return true;
  if (g === 'N') return !/pulver/i.test(n) || /Getränk/.test(n);
  if (g === 'F') return /(saft|nektar(?!in))/i.test(n.split(',')[0]) && !/Konserve|Konzentrat|in Fruchtsaft/.test(n);
  if (g === 'G') return /^Gemüsesaft/.test(n);
  if (g === 'M') return /^(Milch |Vollmilch|H-|Rohmilch|Buttermilch|Ziegenmilch|Schafmilch|Dickmilch|Kefir|Milchmisch|Milchshake)/.test(n) && !/Kondensmilch|pulver|dessert/i.test(n);
  if (g === 'C' || g === 'H') return /drink|^Kokosmilch/i.test(n);
  return false;
}
export const isLiq = (x) => (x.liq != null ? !!x.liq : blsLiquid(x.ref || x.id, x.n || ''));
export const unitOf = (x) => (isLiq(x) ? 'ml' : 'g');

function prep(food) {
  if (!food._n) {
    food._n = norm(food.n + ' ' + (food.brand || ''));
    food._w = food._n.split(/\s+/).filter(Boolean);
    food._c = food._w.join('');
  }
  return food;
}

/**
 * Suche mit Rangfolge wie im Tracker: ganzes Wort vor Wortende (Grundwort, z. B. Voll-milch) vor Wortanfang;
 * Zusammengesetztes („… mit …“) nach hinten; eigene Lebensmittel und Favoriten nach vorn.
 * extra: zusätzliche Lebensmittel (z. B. eigene); favIds: Set mit Favoriten-IDs.
 */
export function searchFoods(q, { foods = list, extra = [], favIds = new Set(), limit = 60 } = {}) {
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const hits = [];
  for (const food of extra.concat(foods)) {
    prep(food);
    let score = food._w.length * 40 + food._n.length;
    let ok = true;
    for (const t of terms) {
      if (food._w.includes(t)) score -= 400;                                      // ganzes Wort
      else if (t.length >= 2 && food._w.some((w) => w.endsWith(t))) score -= 350; // Wortende (Grundwort)
      else if (food._w.some((w) => w.startsWith(t))) score -= 150;               // Wortanfang
      else if (food._n.includes(t)) score += 0;                                   // irgendwo im Wort
      else if (food._c.includes(t)) score -= 450;                                 // ohne Leerzeichen („haferflocken“ → „Hafer Flocken“)
      else { ok = false; break; }
    }
    if (!ok) continue;
    const first = food._w[0], t0 = terms[0];
    if (first === t0 || first.endsWith(t0) || (t0.length > first.length && food._c.startsWith(t0))) score -= 300;
    if (!terms.includes('mit') && food._w.includes('mit')) score += 1500;
    if (food.src !== 'bls') score -= 2000;
    if (favIds.has(food.id)) score -= 3000;
    hits.push([score, food]);
  }
  hits.sort((a, b) => a[0] - b[0]);
  return hits.slice(0, limit).map((h) => h[1]);
}
