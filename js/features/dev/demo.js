// Beispieldaten für die Entwicklung: ein Monat Journal aus echten BLS-Lebensmitteln, auf dem Gerät erzeugt.
// Erfunden, nicht aus echten Logs. Einträge tragen demo: true und lassen sich gezielt wieder entfernen.
// Zufall mit festem Startwert, damit Tests und Screenshots reproduzierbar sind.
import { addDays } from '../../core/format.js';
import { searchFoods } from '../food/foods.js';
import { portionOptions } from '../food/portions.js';
import { makeEntry } from '../journal/journal.js';

// Mahlzeiten-Vorlagen: [Suchbegriff, Gramm oder null = erste Standardportion]
const TEMPLATES = {
  breakfast: [
    [['haferflocken', 60], ['vollmilch frisch', 200], ['banane roh', null]],
    [['vollkornbrot', 100], ['gouda', 50], ['butter', 10]],
    [['joghurt mild 3,5', 150], ['müsli basismischung', 50], ['apfel roh', null]],
    [['brötchen weizen', 60], ['konfitüre', 25], ['butter', 10]],
    [['hühnerei roh', 100], ['vollkornbrot', 50], ['tomate roh', null]]
  ],
  lunch: [
    [['teigwaren eifrei roh', 100], ['tomatensauce', 150], ['parmesan', 15]],
    [['reis parboiled roh', 80], ['hähnchenbrust roh', 150], ['broccoli roh', 200]],
    [['kartoffel geschält roh', 250], ['speisequark 20', 150], ['leinöl', 10]],
    [['linse reif', 70], ['karotte roh', 100], ['speisezwiebel roh', 50]],
    [['lachs roh', 150], ['kartoffel geschält roh', 200], ['spinat roh', 150]]
  ],
  dinner: [
    [['vollkornbrot', 100], ['putenbrust geräuchert', 45], ['gurke roh', 100]],
    [['kopfsalat roh', 80], ['hühnerei roh', 100], ['olivenöl', 10]],
    [['tortilla', 60], ['kidneybohne konserve', 120], ['paprika roh', 100]],
    [['vollkornbrot', 100], ['körniger frischkäse 20', 100], ['radieschen roh', 60]]
  ],
  snack: [
    [['apfel roh', null]],
    [['walnuss', 30]],
    [['vollmilchschokolade', 25]],
    [['banane roh', null], ['mandel', 20]],
    [['joghurt mild 3,5', 150]]
  ]
};

/** Kleiner Zufallsgenerator mit Startwert (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rand, list) => list[Math.floor(rand() * list.length)];

/** Ein Lebensmittel zu einem Suchbegriff (erster Treffer) oder null. Ergebnisse werden zwischengespeichert. */
function finder(foods) {
  const cache = new Map();
  return (q) => {
    if (!cache.has(q)) cache.set(q, searchFoods(q, { foods, limit: 1 })[0] || null);
    return cache.get(q);
  };
}

export const DEMO_GOAL = 2150;

/**
 * Erzeugt Beispiel-Einträge für `days` Tage bis einschließlich `today`.
 * Jeder volle Tag wird auf ein Ziel um DEMO_GOAL kcal skaliert (Streuung ca. ±12 %), damit Tage leicht darüber
 * und darunter vorkommen; heute nur bis zum Mittagessen. Ab und zu fehlt der Snack.
 * Gibt { 'JJJJ-MM-TT': [Eintrag, …] } zurück; Einträge haben demo: true.
 */
export function generateDemo({ today, days = 30, foods, seed = 2026, goal = DEMO_GOAL }) {
  const rand = rng(seed);
  const find = finder(foods);
  const out = {};
  for (let i = days - 1; i >= 0; i--) {
    const iso = addDays(today, -i);
    const list = [];
    const meals = i === 0 ? ['breakfast', 'lunch'] : ['breakfast', 'lunch', 'dinner', 'snack'];
    for (const meal of meals) {
      if (meal === 'snack' && rand() < 0.25) continue;
      const tpl = pick(rand, TEMPLATES[meal]);
      const scale = meal === 'dinner' && rand() < 0.2 ? 1.4 : 1; // gelegentlich größeres Abendessen
      for (const [q, grams] of tpl) {
        const food = find(q);
        if (!food) continue;
        const base = grams ?? (portionOptions(food, foods)[0]?.grams || 100);
        const g = Math.max(5, Math.round((base * scale * (0.8 + rand() * 0.4)) / 5) * 5); // ±20 %, auf 5 g
        list.push({ ...makeEntry(food, g, meal), demo: true });
      }
    }
    // Auf den Tageszielwert skalieren (heute: Anteil für Frühstück + Mittag)
    const total = list.reduce((a, e) => a + (e.k * e.grams) / 100, 0);
    const target = goal * (0.88 + rand() * 0.24) * (i === 0 ? 0.55 : 1);
    const f = total > 0 ? Math.min(2.2, Math.max(0.7, target / total)) : 1;
    for (const e of list) e.grams = Math.max(5, Math.round((e.grams * f) / 5) * 5);
    if (list.length) out[iso] = list;
  }
  return out;
}

/**
 * Beispiel-Getränke: Wasser (4–7 Einträge à 250–500 ml) und Kaffee/Tee (1–3 pro Tag, letzter mal früh, mal spät),
 * damit Wasser-Karte, Koffein-Kurve und Heatmap etwas zeigen. Heute nur bis zum Vormittag. Erfunden.
 */
export function generateDemoDrinks({ today, days = 30, seed = 2027 }) {
  const rand = rng(seed);
  const water = {}, caff = {};
  const DRINKS = [['Filterkaffee 200 ml', 90, 200, 15], ['Espresso 30 ml', 60, 30, 0], ['Schwarztee 200 ml', 50, 200, 15], ['Energy Drink 250 ml', 80, 250, 30]];
  for (let i = days - 1; i >= 0; i--) {
    const iso = addDays(today, -i);
    const until = i === 0 ? 11 * 60 : 22 * 60;
    const w = [];
    for (let k = 0, n = 4 + Math.floor(rand() * 4); k < n; k++) {
      const min = Math.round((7 * 60 + rand() * (until - 7 * 60)) / 5) * 5;
      if (min <= until) w.push({ ml: [250, 250, 330, 500][Math.floor(rand() * 4)], min });
    }
    const c = [];
    for (let k = 0, n = 1 + Math.floor(rand() * 3); k < n; k++) {
      const [name, mg, ml, dur] = DRINKS[k === 0 ? 0 : Math.floor(rand() * DRINKS.length)];
      const min = k === 0 ? 7 * 60 + Math.round(rand() * 6) * 10 : Math.round((10 * 60 + rand() * 8.5 * 60) / 10) * 10; // bis ca. 18:30
      if (min <= until) c.push({ min, mg, n: name, dur, ml });
    }
    if (w.length) water[iso] = w;
    if (c.length) caff[iso] = c;
  }
  return { water, caff };
}

/**
 * Beispiel-Gewichte: an ~5 von 7 Tagen gewogen, langsamer Trend (−0,25 kg/Woche) plus Tagesschwankung ±0,6 kg.
 * Erfunden; nur für die Entwicklung. Gibt { iso: kg } zurück.
 */
export function generateDemoWeights({ today, days = 30, seed = 2028, start = 76.4 }) {
  const rand = rng(seed);
  const out = {};
  for (let i = days - 1; i >= 0; i--) {
    if (i > 0 && rand() < 0.28) continue;
    const trend = start - ((days - 1 - i) * 0.25) / 7;
    out[addDays(today, -i)] = Math.round((trend + (rand() - 0.5) * 1.2) * 10) / 10;
  }
  return out;
}

/**
 * Beispiel-Alkohol: an Freitagen und Samstagen 1–3 Getränke am Abend (mit Essen), nie heute. Erfunden.
 * Gibt { iso: [{ min, ml, vol, kcal, n, fed }] } zurück.
 */
export function generateDemoAlcohol({ today, days = 30, seed = 2029 }) {
  const rand = rng(seed);
  const out = {};
  const DR = [['Pils 500 ml', 500, 4.9, 190], ['Rotwein trocken 200 ml', 200, 11.7, 140], ['Weizenbier 500 ml', 500, 5.3, 210]];
  for (let i = days - 1; i >= 1; i--) {
    const iso = addDays(today, -i);
    const wd = new Date(iso + 'T12:00:00').getDay();
    if (wd !== 5 && wd !== 6) continue;
    if (rand() < 0.35) continue;
    const n = 1 + Math.floor(rand() * 3);
    out[iso] = Array.from({ length: n }, (_, k) => {
      const [name, ml, vol, kcal] = DR[Math.floor(rand() * DR.length)];
      return { min: 19 * 60 + k * 75 + Math.round(rand() * 3) * 10, ml, vol, kcal, n: name, fed: true };
    });
  }
  return out;
}

/**
 * Beispiel-Zyklen (0.3.2): vier abgeschlossene Zyklen (29, 27, 31, 28 Tage) und der laufende seit 9 Tagen.
 * Blutung je 5 Tage (Mittel, Stark, Mittel, Leicht, Schmier), Schmerz und Krämpfe an den ersten Tagen.
 * Erfunden, nicht aus echten Daten. Gibt { 'JJJJ-MM-TT': Eintrag } mit demo: true zurück.
 */
export function generateDemoCycle({ today, lengths = [29, 27, 31, 28], dayNo = 10 }) {
  const out = {};
  const starts = [addDays(today, -(dayNo - 1))];
  for (const len of [...lengths].reverse()) starts.unshift(addDays(starts[0], -len));
  const BLEED = [3, 4, 3, 2, 1];
  starts.forEach((s, ci) => {
    BLEED.forEach((b, i) => {
      const iso = addDays(s, i);
      if (iso > today) return;
      const e = { bleed: b, demo: true };
      if (i === 0) { e.pain = ci === starts.length - 2 ? 'Stark' : 'Mittel'; e.body = ['Unterleibskrämpfe']; }
      if (i === 1) { e.pain = 'Leicht'; e.body = ['Unterleibskrämpfe', 'Rückenschmerzen']; e.mood = ['Müde']; }
      out[iso] = e;
    });
  });
  return out;
}
