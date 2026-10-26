// Alkohol-Tracker: Einträge, Vorlagen, verknüpfte kcal im Journal. Nach js/alcohol.js im Calorie-Tracker 2.3.1
// (ST0PTV, MIT; Getränkevorlagen dort aus dem BLS 4.0 umgerechnet). Rechnung in alcohol-model.js.
// Standard: an (Nutzerentscheidung 2026-10-26); die Karte unter „Heute“ erscheint erst mit einem Eintrag.
// Alkohol zählt nicht zum Wasserzähler. Die kcal kommen als verknüpfter Eintrag in die Snacks.
import * as store from '../../core/store.js';
import { uuid } from '../../core/util.js';
import { addDays } from '../../core/format.js';
import { getProfile, currentWeight } from '../../core/profile.js';
import { entriesOf, setLinkedEntry, entryMin, entryTotals } from '../journal/journal.js';
import { absHours } from './caffeine-model.js';
import { isLiq } from '../food/foods.js';
import { alcGrams, alcR } from './alcohol-model.js';

store.define('alcohol', { enabled: true, beta: 0.15, log: {} });
// log: { 'JJJJ-MM-TT': [{ id, min, ml, vol, kcal, n, fed, demo? }] }

export const alcSettings = () => store.get('alcohol');
const changed = () => { if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('tt-journal')); };
export function setAlcSettings(patch) { store.update('alcohol', (a) => Object.assign(a, patch)); changed(); }

export const ALC_CATS = [['beer', 'Bier'], ['wine', 'Wein'], ['spirit', 'Schnaps'], ['cocktail', 'Cocktail'], ['custom', 'Eigene']];
// vol: Vol-% (aus BLS-Alkoholgehalt g/100 g umgerechnet, Spirituosen Nennwert); k100: kcal/100 ml (BLS 4.0) – wie im Calorie-Tracker
export const ALC_DRINKS = [
  { c: 'beer', n: 'Pils', ml: 330, vol: 4.9, k100: 38 },
  { c: 'beer', n: 'Pils', ml: 500, vol: 4.9, k100: 38 },
  { c: 'beer', n: 'Weizenbier', ml: 500, vol: 5.3, k100: 42 },
  { c: 'beer', n: 'Radler', ml: 500, vol: 2.5, k100: 38 },
  { c: 'beer', n: 'Pils alkoholfrei', ml: 500, vol: 0.3, k100: 18 },
  { c: 'wine', n: 'Rotwein trocken', ml: 200, vol: 11.7, k100: 70 },
  { c: 'wine', n: 'Weißwein trocken', ml: 200, vol: 11.0, k100: 64 },
  { c: 'wine', n: 'Sekt trocken', ml: 100, vol: 11.7, k100: 75 },
  { c: 'wine', n: 'Apfelwein', ml: 300, vol: 4.8, k100: 44 },
  { c: 'spirit', n: 'Schnaps/Wodka', ml: 20, vol: 40, k100: 225 },
  { c: 'spirit', n: 'Schnaps/Wodka', ml: 40, vol: 40, k100: 225 },
  { c: 'cocktail', n: 'Gin Tonic', ml: 300, vol: 6.1, k100: 55 },
  { c: 'cocktail', n: 'Cuba Libre', ml: 300, vol: 5.3, k100: 52 },
  { c: 'cocktail', n: 'Caipirinha', ml: 200, vol: 12.2, k100: 92 },
  { c: 'cocktail', n: 'Hugo', ml: 200, vol: 4.9, k100: 38 }
];
export const alcMl = (ml) => (ml >= 100 ? `${(ml / 1000).toLocaleString('de-DE')} l` : `${ml / 10} cl`);

export const alcEntries = (iso) => (alcSettings().log[iso] || []).slice().sort((a, b) => a.min - b.min);

/** Parameter fürs Modell an einem Tag: Gewicht (aktuell bis iso), r aus Geschlecht/Größe, Abbau. */
export function alcParams(iso) {
  const p = getProfile();
  const kg = currentWeight(iso);
  return { kg, r: alcR({ sex: p.sex, kg, cm: p.heightCm }), beta: alcSettings().beta || 0.15 };
}

/** Getränke vom Vortag bis zum Folgetag als absolute Zeitpunkte. */
export function alcDoses(iso, from = -1, to = 1) {
  const out = [];
  for (let o = from; o <= to; o++) {
    const d = addDays(iso, o);
    for (const e of alcEntries(d)) out.push({ t: absHours(d, e.min), g: alcGrams(e.ml, e.vol), fed: !!e.fed, id: e.id });
  }
  return out.sort((a, b) => a.t - b.t);
}

export const alcGramsOf = (iso) => alcEntries(iso).reduce((s, e) => s + alcGrams(e.ml, e.vol), 0);

/** Hat man in den 3 h vor min etwas gegessen (≥ 100 kcal, kein Getränk, kein verknüpfter Eintrag)? */
export function alcFedAuto(iso, min) {
  return entriesOf(iso).some((e) => !e.link && !isLiq(e) && entryTotals(e).k >= 100 && entryMin(e) <= min && entryMin(e) >= min - 180);
}

function syncJournal(iso, e) {
  const link = 'alc:' + e.id;
  if (!(e.kcal > 0)) { setLinkedEntry(iso, link, null); return; }
  const base = e.ml > 0 ? e.ml : 100;
  setLinkedEntry(iso, link, { meal: 'snack', grams: base, ref: link, src: 'alc', n: e.n, brand: '', liq: true,
    t: `${String(Math.floor(e.min / 60)).padStart(2, '0')}:${String(e.min % 60).padStart(2, '0')}`,
    k: (e.kcal * 100) / base, p: 0, c: 0, f: 0, fi: 0, su: 0, fs: 0 });
}

/** Prüft und speichert ein Getränk (neu oder geändert); ohne kcal-Angabe ≈ 7 kcal je g Alkohol. */
export function saveAlcohol(iso, { id = null, min, ml, vol, kcal = null, n = '', fed = false, demo = false }) {
  if (!(ml > 0 && ml <= 3000)) throw new Error('Bitte eine Menge zwischen 1 und 3000 ml eingeben.');
  if (!(vol >= 0 && vol <= 80)) throw new Error('Bitte den Alkoholgehalt in Vol-% (0–80) eingeben.');
  if (!(min >= 0 && min < 1440)) throw new Error('Bitte eine Uhrzeit wählen.');
  if (kcal != null && !(kcal >= 0 && kcal <= 3000)) throw new Error('Bitte kcal prüfen.');
  const e = { id: id || uuid(), min: Math.round(min), ml, vol, kcal: kcal != null ? kcal : Math.round(alcGrams(ml, vol) * 7), n: String(n).trim() || 'Alkohol', fed: !!fed };
  if (demo) e.demo = true;
  store.update('alcohol', (a) => { a.log[iso] = (a.log[iso] || []).filter((x) => x.id !== e.id).concat([e]); });
  if (!demo) syncJournal(iso, e);
  changed();
  return e;
}

export function removeAlcohol(iso, id) {
  const gone = (alcSettings().log[iso] || []).find((x) => x.id === id) || null;
  store.update('alcohol', (a) => {
    a.log[iso] = (a.log[iso] || []).filter((x) => x.id !== id);
    if (!a.log[iso].length) delete a.log[iso];
  });
  setLinkedEntry(iso, 'alc:' + id, null);
  changed();
  return gone;
}

/** Erstes Getränk des Tages? (Dann zeigt die App einmal den Warnhinweis.) */
export const isFirstOfDay = (iso) => (alcSettings().log[iso] || []).length === 1;

// ---------- Beispieldaten (ohne kcal-Einträge im Journal) ----------
export function removeDemoAlcohol() {
  store.update('alcohol', (a) => {
    for (const iso of Object.keys(a.log)) {
      a.log[iso] = a.log[iso].filter((e) => !e.demo);
      if (!a.log[iso].length) delete a.log[iso];
    }
  });
  changed();
}
export function loadDemoAlcohol(map) {
  removeDemoAlcohol();
  store.update('alcohol', (a) => {
    for (const [iso, list] of Object.entries(map)) a.log[iso] = (a.log[iso] || []).concat(list.map((x) => ({ id: uuid(), ...x, demo: true })));
  });
  changed();
}

// Quellen wie im Calorie-Tracker angegeben (dort mit DOI; hier nicht neu geprüft → „Unverified 0.1.7“)
export const ALC_REFS = [
  ['Widmark EMP (1932). Die theoretischen Grundlagen und die praktische Verwendbarkeit der gerichtlich-medizinischen Alkoholbestimmung.', null],
  ['Jones AW (2010). Evidence-based survey of the elimination rates of ethanol from blood with applications in forensic casework. Forensic Sci Int 200(1–3):1–20.', 'https://doi.org/10.1016/j.forsciint.2010.02.021'],
  ['Maudens KE et al. (2014). The influence of the body mass index on the volume of distribution of ethanol. Forensic Sci Int 243:74–78.', 'https://doi.org/10.1016/j.forsciint.2014.04.036'],
  ['Fraser AG et al. (1995). Inter-individual and intra-individual variability of ethanol concentration-time profiles: comparison of ethanol ingestion before or after an evening meal. Br J Clin Pharmacol 40(4):387–392.', 'https://doi.org/10.1111/j.1365-2125.1995.tb04561.x'],
  ['DGE (2024). Positionspapier Alkohol (Pressemitteilung vom 15.08.2024).', null]
];
