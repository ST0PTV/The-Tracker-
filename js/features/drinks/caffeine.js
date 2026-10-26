// Koffein-Tracker – Daten: eigene Getränke-Einträge, Koffein aus Journal-Einträgen, Einstellungen, Richtwerte.
// Aus Rezeptbuch/tracker/js/caffeine.js (Getränkeliste, Einträge) und Calorie-Tracker/js/caffeine.js (Koffein aus dem
// Journal, Vorschläge nach dem Namen); beide MIT (ST0PTV, JuliaKelp). Rechnen: caffeine-model.js.
//
// Abweichung von den Ursprungs-Apps: Koffein aus Journal-Einträgen wird nicht als Kopie gespeichert, sondern beim
// Rechnen aus den Einträgen gelesen (Feld cf = mg pro 100 g/ml). So können Journal und Koffein nicht auseinanderlaufen.
import * as store from '../../core/store.js';
import { getSleep, adoptSleep } from '../../core/profile.js';
import { uuid } from '../../core/util.js';
import { entriesOf, setLinkedEntry, entryMin } from '../journal/journal.js';
import { isLiq } from '../food/foods.js';
import { absHours, hmToMin } from './caffeine-model.js';

store.define('caffeine', { enabled: true, bed: '23:00', wake: '07:00', halfLife: 5, threshold: 50, limit: 400, log: {}, foods: {} });
// log: { 'JJJJ-MM-TT': [{ id, min, mg, n, dur (min), ml, kcal, tr (kcal ins Journal, ml zum Wasser) }] }
// foods: { Lebensmittel-ID: mg pro 100 g/ml } – eigener Wert, gemerkt

// Bett- und Aufstehzeit stehen seit 0.1.8 im Profil („Schlaf & Körper“); alte Werte hier werden einmal übernommen.
export const caffSettings = () => {
  const c = store.get('caffeine');
  adoptSleep(c.bed, c.wake);
  return { ...c, ...getSleep() };
};
const changed = () => { if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('tt-journal')); };
export function setCaffSettings(patch) { store.update('caffeine', (c) => Object.assign(c, patch)); changed(); }

// Richtwerte für den Koffeingehalt. s: 'bfr' = aus BfR-Angaben abgeleitet, 'typ' = üblicher Wert (nicht belegt).
// ml = Portion; k100 = kcal pro 100 ml (kq: 'bls' = BLS 4.0, 'web' = nur eine Quelle, nicht gegengeprüft).
export const CAFF_CATS = [['coffee', 'Kaffee'], ['energy', 'Energy'], ['tea', 'Tee'], ['cola', 'Cola'], ['custom', 'Eigene']];
export const CAFF_DRINKS = [
  { c: 'coffee', n: 'Filterkaffee', size: '200 ml', ml: 200, k100: 1, kq: 'bls', mg: 90, s: 'bfr' },
  { c: 'coffee', n: 'Espresso', size: '30 ml', ml: 30, k100: 2, kq: 'bls', mg: 60, s: 'typ' },
  { c: 'coffee', n: 'Doppelter Espresso', size: '60 ml', ml: 60, k100: 2, kq: 'bls', mg: 120, s: 'typ' },
  { c: 'energy', n: 'Energy Drink', size: '250 ml', ml: 250, k100: 45, kq: 'web', mg: 80, s: 'bfr' },
  { c: 'energy', n: 'Energy Drink', size: '330 ml', ml: 330, k100: 45, kq: 'web', mg: 105, s: 'bfr' },
  { c: 'energy', n: 'Energy Drink', size: '500 ml', ml: 500, k100: 45, kq: 'web', mg: 160, s: 'bfr' },
  { c: 'tea', n: 'Schwarztee', size: '200 ml', ml: 200, k100: 0, kq: 'bls', mg: 50, s: 'bfr' },
  { c: 'tea', n: 'Grüntee', size: '200 ml', ml: 200, k100: 0, kq: 'bls', mg: 30, s: 'typ' },
  { c: 'cola', n: 'Cola', size: '330 ml', ml: 330, k100: 41, kq: 'bls', mg: 33, s: 'bfr' },
  { c: 'cola', n: 'Cola', size: '500 ml', ml: 500, k100: 41, kq: 'bls', mg: 50, s: 'bfr' }
];
export const drinkKcal = (d) => Math.round((d.ml * d.k100) / 100);

// Vorschläge (mg pro 100 ml) nur für Flüssigkeiten, Werte wie in CAFF_DRINKS (aus dem Calorie-Tracker)
const GUESS = [
  [/red\s?bull|monster|rockstar|relentless|energy|28\s?black|booster/i, 32, 'Energy Drinks (80 mg je 250 ml, BfR)'],
  [/espresso|ristretto/i, 200, 'Espresso (ca. 60 mg je 30 ml, üblicher Wert, nicht belegt)'],
  [/club-?\s?mate|\bmate\b/i, 20, 'Mate-Limonaden (ca. 20 mg/100 ml, üblicher Wert, nicht belegt)'],
  [/kaffee|coffee|cappuccino|latte|cold brew|americano/i, 45, 'Filterkaffee (90 mg je 200 ml, BfR) – Milchkaffee enthält oft weniger'],
  [/(^|[^a-zäöü])(cola|coke|pepsi)/i, 10, 'Cola (33 mg je 330 ml, BfR)'],
  [/schwarztee|schwarzer tee|black tea|earl grey|assam|darjeeling/i, 25, 'Schwarztee (50 mg je 200 ml, BfR)'],
  [/grüntee|grüner tee|green tea|matcha/i, 15, 'Grüntee (ca. 30 mg je 200 ml, üblicher Wert, nicht belegt)']
];
const NO_GUESS = /koffeinfrei|entkoffeiniert|decaf|caffeine.?free|ohne koffein|sahne|weißer|weisser|malzkaffee|getreidekaffee|zichorie|likör|likoer|bohnen|pulver|instant/i;

/** Vorschlag nach dem Namen (nur Flüssigkeiten): { v, src: 'guess', label } oder null. */
export function caffGuess(food) {
  if (!isLiq(food)) return null;
  const s = `${food.n || ''} ${food.brand || ''}`;
  if (NO_GUESS.test(s)) return null;
  const hit = GUESS.find(([re]) => re.test(s));
  return hit ? { v: hit[1], src: 'guess', label: hit[2] } : null;
}

/** Koffein eines Lebensmittels für einen neuen Eintrag: gemerkter Wert → Wert am Lebensmittel → Vorschlag. */
export function caffPer100(food) {
  const id = food.ref || food.id;
  const own = caffSettings().foods[id];
  if (own != null) return { v: own, src: 'own' };
  if (food.cf != null) return { v: food.cf, src: food.src === 'off' ? 'off' : 'food' };
  return caffGuess(food);
}
export function rememberCaffFood(id, v) { store.update('caffeine', (c) => { c.foods[id] = v; }); }

export const CAFF_SRC_HINT = {
  own: 'Von dir für dieses Lebensmittel gespeichert.',
  off: 'Wert von Open Food Facts – bitte mit der Packung abgleichen.',
  food: 'Wert aus deinem Lebensmittel.',
  entry: 'Wert dieses Eintrags.'
};

// ---------- Einträge ----------
export const caffEntries = (iso) => caffSettings().log[iso] || [];


/** Koffein-Zeilen aus dem Journal: [{ id, min, mg, n, dur, fromJournal: true }]. */
export function journalCaffeine(iso) {
  return entriesOf(iso).filter((e) => e.cf > 0 && e.grams > 0 && !e.link).map((e) => ({
    id: e.id, min: entryMin(e), mg: Math.round(((e.cf * e.grams) / 100) * 10) / 10,
    n: e.n.split(',')[0], dur: isLiq(e) ? 15 : 0, fromJournal: true
  }));
}

/** Alle Koffein-Zeilen eines Tages (eigene Getränke und Journal), nach Uhrzeit. */
export const caffRows = (iso) => caffEntries(iso).concat(journalCaffeine(iso)).sort((a, b) => a.min - b.min);
export const caffSum = (iso) => caffRows(iso).reduce((a, e) => a + e.mg, 0);

/** Dosen für das Modell über mehrere Tage (Standard: Vortag bis Folgetag). */
export function caffDoses(iso, from = -1, to = 1) {
  const out = [];
  const [y, m, d] = iso.split('-').map(Number);
  for (let o = from; o <= to; o++) {
    const dt = new Date(y, m - 1, d + o, 12);
    const day = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    for (const e of caffRows(day)) out.push({ t: absHours(day, e.min), mg: e.mg, dur: (e.dur || 0) / 60, id: e.id, n: e.n, date: day, min: e.min });
  }
  return out;
}

/** Getränke mit „zählt mit“ als Zeilen für den Wasserzähler. */
export const caffWaterRows = (iso) => caffEntries(iso).filter((x) => x.tr && x.ml > 0).map((x) => ({ id: x.id, min: x.min, n: x.n, ml: x.ml }));

const MEAL_BY_MIN = (min) => (min < 10 * 60 ? 'breakfast' : min < 14 * 60 ? 'lunch' : min < 17 * 60 ? 'snack' : 'dinner');

// kcal eines Getränks als verknüpfter Journal-Eintrag (zählt nicht doppelt: Wasser und Koffein kommen vom Getränk)
function syncJournal(iso, e) {
  const link = 'caff:' + e.id;
  if (!e.tr || !(e.kcal > 0)) { setLinkedEntry(iso, link, null); return; }
  const base = e.ml > 0 ? e.ml : 100;
  setLinkedEntry(iso, link, { meal: MEAL_BY_MIN(e.min), grams: base, ref: link, src: 'caff', n: e.n, brand: '', liq: true,
    k: (e.kcal * 100) / base, p: 0, c: 0, f: 0, fi: 0, su: 0, fs: 0 });
}

/** Prüft und speichert einen Getränke-Eintrag (neu oder geändert). Gibt den Eintrag zurück. */
export function saveCaffeine(iso, { id = null, min, mg, n = 'Koffein', dur = 0, ml = 0, kcal = 0, tr = true, demo = false }) {
  if (!(mg > 0 && mg <= 1000)) throw new Error('Bitte eine Koffein-Menge zwischen 1 und 1.000 mg eingeben.');
  if (!(min >= 0 && min < 1440)) throw new Error('Bitte eine Uhrzeit wählen.');
  if (!(ml >= 0 && ml <= 3000) || !(kcal >= 0 && kcal <= 2000)) throw new Error('Bitte Menge (0–3.000 ml) und kcal (0–2.000) prüfen.');
  const e = { id: id || uuid(), min: Math.round(min), mg: Math.round(mg * 10) / 10, n: String(n).trim() || 'Koffein', dur, ml: ml || 0, kcal: kcal || 0, tr: !!tr };
  if (demo) e.demo = true;
  store.update('caffeine', (c) => {
    const list = (c.log[iso] || []).filter((x) => x.id !== e.id);
    c.log[iso] = list.concat([e]);
  });
  syncJournal(iso, e);
  changed();
  return e;
}

export function removeCaffeine(iso, id) {
  const gone = caffEntries(iso).find((x) => x.id === id) || null;
  store.update('caffeine', (c) => {
    c.log[iso] = (c.log[iso] || []).filter((x) => x.id !== id);
    if (!c.log[iso].length) delete c.log[iso];
  });
  setLinkedEntry(iso, 'caff:' + id, null);
  changed();
  return gone;
}

/** Koffein-Tablette aus dem Supplement-Tracker (id fest je Supplement und Tag). */
export function setSupplementCaffeine(iso, suppId, mg, name, min) {
  const id = 'supp-' + suppId;
  if (!(mg > 0)) { if (caffEntries(iso).some((x) => x.id === id)) removeCaffeine(iso, id); return; }
  saveCaffeine(iso, { id, min, mg, n: name || 'Koffein-Tablette', dur: 0, ml: 0, kcal: 0, tr: false });
}

export function removeDemoCaffeine() {
  const c = caffSettings();
  for (const [iso, list] of Object.entries(c.log)) for (const e of list) if (e.demo && e.kcal > 0 && e.tr) setLinkedEntry(iso, 'caff:' + e.id, null);
  store.update('caffeine', (cc) => {
    for (const iso of Object.keys(cc.log)) {
      cc.log[iso] = cc.log[iso].filter((e) => !e.demo);
      if (!cc.log[iso].length) delete cc.log[iso];
    }
  });
  changed();
}

/** Beispieldaten in einem Zug ({ iso: [{ min, mg, n, dur, ml }] }); ohne kcal, damit keine Journal-Einträge entstehen. */
export function loadDemoCaffeine(map) {
  removeDemoCaffeine();
  store.update('caffeine', (c) => {
    for (const [iso, list] of Object.entries(map)) c.log[iso] = (c.log[iso] || []).concat(list.map((x) => ({ id: uuid(), min: x.min, mg: x.mg, n: x.n, dur: x.dur || 0, ml: x.ml || 0, kcal: 0, tr: true, demo: true })));
  });
  changed();
}

// Quellen (in „Ich → Quellen & Lizenzen“ und im ⓘ); aus dem Rezeptbuch, nicht neu per Websuche geprüft
export const CAFF_REFS = [
  ['EFSA NDA Panel (2015). Scientific Opinion on the safety of caffeine. EFSA Journal 13(5):4102.', 'https://doi.org/10.2903/j.efsa.2015.4102'],
  ['Drake C et al. (2013). Caffeine effects on sleep taken 0, 3, or 6 hours before going to bed. J Clin Sleep Med 9(11):1195–1200.', 'https://doi.org/10.5664/jcsm.3170'],
  ['Seng KY et al. (2009). Population pharmacokinetics of caffeine in healthy male adults. J Clin Pharm Ther 34(1):103–114.', 'https://doi.org/10.1111/j.1365-2710.2008.00976.x'],
  ['Blanchard J (1983). The absolute bioavailability of caffeine in man. Eur J Clin Pharmacol.', null],
  ['Abernethy DR, Todd EL (1985). Impairment of caffeine clearance by chronic use of low-dose oestrogen-containing oral contraceptives.', null],
  ['Bundesregierung (nach BfR/EFSA): „Koffein: Die Dosis macht’s“ – Energy Drink ca. 80 mg je 250 ml, Gleichwerte für Kaffee, Tee und Cola.', 'https://www.bundesregierung.de/breg-de/aktuelles/koffein-die-dosis-machts-1649340']
];
