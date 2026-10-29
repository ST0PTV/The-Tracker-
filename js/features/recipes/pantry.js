// Vorrat: was zu Hause ist, mit Menge. Kochen zieht die Zutaten ab, die Einkaufsliste rechnet den Vorrat heraus,
// Vorschläge mit vorhandenen Zutaten kommen zuerst. Einzige Stelle, die tt_vorrat speichert.
// Nach dem Rezeptbuch, vorrat.js (grams, label, step, take, giveBack) und app.js (matchFood, vorratFood, stockOf,
// takeIngredients, vorratEntry, addToVorrat, VR_GROUPS, blsGroup; Copyright (c) 2026 JuliaKelp, MIT-Lizenz).
// Geändert: eigener Speicher statt ct.v1 → pantry, Zeitstempel als ISO-Zeit, keine Snack-Markierung (später), keine
// Mikronährstoff-Hinweise (0.3.0). Rein bis auf den Speicher; mit Node getestet.
import * as store from '../../core/store.js';
import { uuid, nowISO } from '../../core/util.js';
import { FOODS, findFood, parseIngredient, gramsOfText, nutrientsFor } from './ingredients.js';

store.define('vorrat', []); // [Eintrag] – neueste zuerst

/* Eintrag:
   id, n (Name), brand, ref (Lebensmittel-ID: bls:…, off:…, custom:…, rb:<Zutat>), src
   fn   – als welche Rezept-Zutat er zählt (Name aus ingredients.js FOODS) oder '' = keine
   qty  – Menge in der Einheit qu: 'g' | 'ml' | 'stk' | 'pkg'; ug = Gramm je Einheit (bei g/ml 1, sonst null = unbekannt)
   k, p, c, f, fi, su, fs – je 100 g/ml (für „Gegessen“); serving, pq (Packung in g/ml), liq
   grp  – selbst gewählte Gruppe (optional); added – ISO-Zeit des ersten Hinzufügens */
export const UNIT = { g: 'g', ml: 'ml', stk: 'Stück', pkg: 'Pkg.' };
const r2 = (x) => Math.round(x * 100) / 100;
const num = (x) => String(Math.round(x * 10) / 10).replace('.', ',');

const changed = () => { if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('tt-recipes')); };
export const pantry = () => store.get('vorrat');
export const pantryById = (id) => pantry().find((x) => x.id === id) || null;
const upd = (fn) => { const out = { v: undefined }; store.update('vorrat', (list) => { out.v = fn(list); }); changed(); return out.v; };
/** Wird der Vorrat benutzt? (mindestens ein Eintrag, der nicht aufgebraucht ist) */
export const pantryInUse = () => pantry().some((x) => x.qty !== 0);

// ---------- Mengen ----------
/** Vorhandene Menge in Gramm (ml wie g); null, wenn unbekannt. */
export const grams = (x) => (x && x.qty != null && x.ug ? x.qty * x.ug : null);
/** „4 Stück“, „1,5 kg“, „1 Pkg. (≈ 500 g)“ */
export function label(x) {
  if (!x || x.qty == null) return 'Menge offen';
  if ((x.qu === 'g' || x.qu === 'ml') && x.qty >= 1000) return `${num(x.qty / 1000)} ${x.qu === 'g' ? 'kg' : 'l'}`;
  const q = `${num(x.qty)} ${UNIT[x.qu] || ''}`.trim();
  if (x.qu === 'pkg' && x.ug) return `${q} (≈ ${Math.round(x.qty * x.ug)} ${x.liq ? 'ml' : 'g'})`;
  return q;
}
/** Schritt für − und +. */
export const step = (x) => (x.qu === 'g' || x.qu === 'ml' ? (x.qty >= 500 ? 100 : 50) : 1);

// ---------- Zuordnung zu Rezept-Zutaten ----------
/** Rezept-Zutat zu einem Produktnamen, nur bei ganzem Wort („Milchschnitte“ ist keine Milch). */
export function matchFood(name) {
  const n = ' ' + String(name).toLowerCase().replace(/[^a-z0-9äöüß]+/g, ' ') + ' ';
  let best = null, len = 0;
  for (const f of FOODS) {
    if (f.name === 'Gewürze') continue;
    for (const k of [f.name, ...(f.aliases || [])].map((x) => x.toLowerCase())) {
      if (k.length < 3 || k.length <= len) continue;
      if ([k, k + 'n', k + 'e', k + 's', k + 'en'].some((w) => n.includes(` ${w} `))) { best = f; len = k.length; }
    }
  }
  return best;
}
/** Als welche Rezept-Zutat zählt der Eintrag? (fn gesetzt → das, sonst aus dem Namen) */
export const foodOf = (x) => (x.fn !== undefined ? x.fn || null : (matchFood(x.n) || {}).name || null);

// ---------- Gruppen ----------
export const GROUPS = [
  ['fleisch', 'Fleisch & Fleischersatz'], ['milch', 'Milch, Käse & Eier'], ['gemuese', 'Gemüse'], ['obst', 'Obst'],
  ['huelsen', 'Hülsenfrüchte'], ['getreide', 'Brot, Nudeln & Getreide'], ['nuesse', 'Nüsse & Samen'], ['suess', 'Süßes & Snacks'],
  ['getraenke', 'Getränke'], ['wuerzen', 'Öle, Saucen & Gewürze'], ['sonst', 'Sonstiges']
];
const BY_NAME = {
  fleisch: ['Hähnchen', 'Pute', 'Hackfleisch', 'Rinderhack', 'Schweinefilet', 'Schweineschnitzel', 'Schweinegulasch', 'Rindergulasch', 'Kasseler', 'Bratwurst', 'Wiener Würstchen', 'Salami', 'Leberkäse', 'Rindfleisch', 'Schinken', 'Speck', 'Tofu', 'Sojaschnetzel', 'Lachs', 'Thunfisch', 'Garnelen'],
  milch: ['Milch', 'Haferdrink', 'Joghurt', 'Magerquark', 'Frischkäse', 'Feta', 'Käse', 'Mozzarella', 'Parmesan', 'Sahne', 'Schmand', 'Butter', 'Ei', 'Skyr', 'Körniger Frischkäse', 'Ricotta', 'Halloumi', 'Buttermilch', 'Sojajoghurt'],
  huelsen: ['Linsen', 'Kichererbsen', 'Kidneybohnen', 'Hummus', 'Edamame'],
  obst: ['Avocado', 'Banane', 'Apfel', 'Beeren', 'Zitrone', 'Orange', 'Mango', 'Ananas', 'Birne', 'Kiwi', 'Weintrauben', 'Pflaumen', 'Apfelmus'],
  nuesse: ['Nüsse', 'Erdnussbutter', 'Chiasamen', 'Leinsamen', 'Tahin', 'Sesam', 'Kürbiskerne', 'Sonnenblumenkerne', 'Erdnüsse', 'Kokosraspeln'],
  suess: ['Zucker', 'Honig', 'Ahornsirup', 'Schokolade', 'Konfitüre', 'Kakao', 'Datteln', 'Rosinen'],
  wuerzen: ['Öl', 'Kokosmilch light', 'Kokosmilch', 'Pesto', 'Mayonnaise', 'Salsa', 'Gemüsebrühe', 'Sojasauce', 'Gewürze', 'Tomatenmark', 'Oliven', 'Backpulver']
};
/** BLS-Code: erster Buchstabe = Hauptgruppe des Bundeslebensmittelschlüssels. */
function blsGroup(code) {
  const c = String(code || '');
  if (/^H7/.test(c)) return 'huelsen';
  if (/^H86/.test(c)) return 'fleisch';
  if (/^E1/.test(c)) return 'milch';
  return { B: 'getreide', C: 'getreide', E: 'getreide', D: 'suess', F: 'obst', G: 'gemuese', H: 'nuesse', K: 'gemuese', M: 'milch', N: 'getraenke', P: 'getraenke', Q: 'wuerzen', R: 'wuerzen', S: 'suess', T: 'fleisch', U: 'fleisch', V: 'fleisch', W: 'fleisch' }[c[0]] || null;
}
export function groupOf(x) {
  if (x.grp) return x.grp;
  const name = foodOf(x);
  if (name) {
    for (const [g, list] of Object.entries(BY_NAME)) if (list.includes(name)) return g;
    const f = FOODS.find((y) => y.name === name);
    if (f) return f.group === 'gemuese' ? 'gemuese' : f.group === 'saettigung' ? (['Kartoffeln', 'Süßkartoffel'].includes(name) ? 'gemuese' : 'getreide') : 'sonst';
  }
  if (String(x.ref).startsWith('bls:')) return blsGroup(String(x.ref).slice(4)) || 'sonst';
  if (x.liq) return 'getraenke';
  return 'sonst';
}

// ---------- Hinzufügen und ändern ----------
const NUTR = ['k', 'p', 'c', 'f', 'fi', 'su', 'fs'];
/** Eintrag aus einem Lebensmittel der App (BLS, eigenes, gescanntes). unit: 'g' | 'ml' | 'stk' | 'pkg'. */
export function addFood(food, amount, unit, ug = null) {
  const ref = String(food.ref || food.id);
  const per = unit === 'g' || unit === 'ml' ? 1 : ug || (unit === 'pkg' ? food.pq || null : food.serving || null);
  if (!(amount > 0)) throw new Error('Bitte eine Menge eingeben.');
  return upd((list) => {
    let x = list.find((y) => y.ref === ref);
    if (x && x.qu !== unit) { // andere Einheit: in Gramm umrechnen, wenn möglich, sonst neue Einheit
      const g = grams(x);
      if (g != null && per) { x.qty = r2(g / per); } else { x.qty = 0; }
      x.qu = unit; x.ug = per;
    }
    if (!x) {
      x = { id: uuid(), ref, src: food.src || '', n: food.n, brand: food.brand || '', liq: !!food.liq, serving: food.serving || null, pq: food.pq || null,
        qty: 0, qu: unit, ug: per, added: nowISO() };
      for (const k of NUTR) if (food[k] != null) x[k] = food[k];
      list.unshift(x);
    }
    x.qty = r2((x.qty || 0) + amount);
    return { ...x };
  });
}
/** Lose Rezept-Zutat (Name aus FOODS) mit Menge in g, ml oder Stück. Nährwerte je 100 g aus dem BLS. */
export function addLoose(foodName, amount, unit) {
  const food = FOODS.find((f) => f.name === foodName);
  if (!food) throw new Error('Unbekannte Zutat.');
  const n = nutrientsFor(food, 100);
  const r1 = (x) => Math.round(x * 10) / 10;
  const asFood = { src: 'rb', id: 'rb:' + food.name, n: food.name, brand: '', serving: food.piece || null,
    k: Math.round(n.kcal), p: r1(n.protein), c: r1(n.kh), f: r1(n.fett), fi: r1(n.ballast), su: r1(n.zucker), fs: r1(n.zugesetzt), liq: unit === 'ml' };
  if (unit === 'stk' && !food.piece) throw new Error(`Für ${food.name} gibt es keine Stückgröße. Bitte in Gramm.`);
  const x = addFood(asFood, amount, unit, unit === 'stk' ? food.piece : 1);
  upd((list) => { const y = list.find((z) => z.id === x.id); if (y) y.fn = food.name; });
  return { ...x, fn: food.name };
}
export function setQty(id, qty) { upd((list) => { const x = list.find((y) => y.id === id); if (x) x.qty = Math.max(0, r2(qty)); }); }
export function setFoodOf(id, fn) { upd((list) => { const x = list.find((y) => y.id === id); if (x) x.fn = fn || ''; }); }
export function removeItem(id) { return upd((list) => { const i = list.findIndex((y) => y.id === id); return i >= 0 ? list.splice(i, 1)[0] : null; }); }
export function restoreItem(x) { if (x) upd((list) => { if (!list.some((y) => y.id === x.id)) list.unshift(x); }); }
/** Aufgebrauchte Einträge entfernen. Gibt die Anzahl zurück. */
export function clearEmpty() { return upd((list) => { const n = list.length; const keep = list.filter((x) => x.qty !== 0); list.splice(0, list.length, ...keep); return n - keep.length; }); }

// ---------- Bestand, Abziehen, Zurückgeben ----------
/** Wie viel von einer Rezept-Zutat da ist: g = bekannte Gramm, open = vorhanden, aber Menge in Gramm unbekannt. */
export function stockOf(foodName, list = pantry()) {
  let g = 0, open = false;
  for (const x of list) {
    if (foodOf(x) !== foodName) continue;
    const have = grams(x);
    if (have == null) open = open || x.qty > 0; else g += have;
  }
  return { g, open };
}
/** g Gramm einer Rezept-Zutat abziehen, älteste Einträge zuerst. Gibt [[id, abgezogene Menge in dessen Einheit]] zurück. */
function take(list, foodName, g) {
  const out = [];
  let rest = g;
  const items = list.filter((x) => foodOf(x) === foodName && x.qty > 0 && x.ug).sort((a, b) => String(a.added).localeCompare(String(b.added)));
  for (const x of items) {
    if (rest <= 0.5) break;
    const use = Math.min(x.qty * x.ug, rest);
    const dq = Math.min(x.qty, r2(use / x.ug));
    x.qty = r2(x.qty - dq);
    rest -= use;
    if (dq > 0) out.push([x.id, dq]);
  }
  return out;
}
/**
 * Zieht die Zutaten (Textzeilen, Menge × factor) vom Vorrat ab. Gibt { used, names } zurück; used für „Rückgängig“.
 * Zutaten ohne Menge (Salz, Pfeffer) und unbekannte bleiben unberührt.
 */
export function takeIngredients(lines, factor = 1) {
  return upd((list) => {
    const used = [], names = [];
    for (const line of lines) {
      const p = parseIngredient(line);
      if (p.amount === null) continue;
      const food = findFood(p.name.replace(/[()]/g, ' '));
      const g = gramsOfText(line) * factor;
      if (!food || !g) continue;
      const u = take(list, food.name, g);
      if (u.length) { used.push(...u); names.push(food.name); }
    }
    return { used, names: [...new Set(names)] };
  });
}
export function giveBack(used) {
  if (!used || !used.length) return;
  upd((list) => { for (const [id, dq] of used) { const x = list.find((y) => y.id === id); if (x && x.qty != null) x.qty = r2(x.qty + dq); } });
}
/** Eintrag ganz oder teilweise gegessen: g Gramm abziehen (nur dieser Eintrag). Gibt die abgezogene Menge zurück. */
export function eat(id, g) {
  return upd((list) => {
    const x = list.find((y) => y.id === id);
    if (!x || !x.ug) return [];
    const dq = Math.min(x.qty, r2(g / x.ug));
    x.qty = r2(x.qty - dq);
    return dq > 0 ? [[x.id, dq]] : [];
  });
}

/**
 * Hat der Vorrat alles für ein Rezept (Menge × factor)? { missing: [Zutat], have: [Zutat], all: bool }.
 * „open“ (vorhanden, Menge unbekannt) zählt als da. Grundzutaten (Gewürze, Öl, Brühe) zählen nicht.
 */
const STAPLES = ['Gewürze', 'Öl', 'Gemüsebrühe'];
export function recipeStock(lines, factor = 1, list = pantry()) {
  const need = new Map();
  for (const line of lines) {
    const p = parseIngredient(line);
    if (p.amount === null) continue;
    const food = findFood(p.name.replace(/[()]/g, ' '));
    if (!food || STAPLES.includes(food.name)) continue;
    need.set(food.name, (need.get(food.name) || 0) + gramsOfText(line) * factor);
  }
  const missing = [], have = [];
  for (const [name, g] of need) {
    const s = stockOf(name, list);
    if (s.open || (s.g > 0 && s.g >= g * 0.9)) have.push(name); else missing.push(name);
  }
  return { missing, have, all: need.size > 0 && !missing.length };
}
