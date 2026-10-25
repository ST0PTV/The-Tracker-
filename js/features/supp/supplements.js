// Supplement-Tracker – Daten: eigene Liste mit Plan (täglich, jeden 2. Tag, Wochentage; Mahlzeit oder Uhrzeit),
// abgehakte Tage. Aus Rezeptbuch/tracker/js/supplements.js (Kalorien-Tracker von ST0PTV, angepasst von JuliaKelp; MIT).
// Startet leer: keine persönlichen Voreinstellungen im öffentlichen Repo. Hinweise sind Information, keine Empfehlung.
import * as store from '../../core/store.js';
import { uuid } from '../../core/util.js';
import { isoDate } from '../../core/format.js';
import { SUPP_CAT_MAP } from './catalog.js';
import { setSupplementCaffeine } from '../drinks/caffeine.js';
import { hmToMin } from '../drinks/caffeine-model.js';

store.define('supp', { enabled: true, remind: true, items: [], log: {} });
// items: [{ id, kind, name, amount, unit, form, mode: daily|every2|days, days: [1..7], slot, time, on, from, anchor }]
// log: { 'JJJJ-MM-TT': [itemId, …] }

export const SUPP_SLOTS = [['breakfast', 'Frühstück'], ['lunch', 'Mittag'], ['dinner', 'Abend'], ['snack', 'Snack'], ['time', 'Uhrzeit']];
export const SUPP_DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export const SUPP_UNITS = ['g', 'mg', 'µg', 'Tabl.', 'Kaps.', 'Tropfen', 'Messl.', 'ml'];
export const SUPP_FORMS = [['powder', 'Pulver'], ['tablet', 'Tablette'], ['softgel', 'Softgel'], ['capsule', 'Kapsel'], ['drops', 'Tropfen'], ['custom', 'Sonstiges']];
const SLOT_MIN = { breakfast: 8 * 60, lunch: 12 * 60 + 30, dinner: 18 * 60 + 30, snack: 15 * 60 + 30 };

export const suppSettings = () => store.get('supp');
const changed = () => { if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('tt-journal')); };
export function setSuppSettings(patch) { store.update('supp', (s) => Object.assign(s, patch)); changed(); }

/** 1 = Montag … 7 = Sonntag */
export const dow = (iso) => ((new Date(iso + 'T12:00:00').getDay() + 6) % 7) + 1;
export function dayDiff(a, b) {
  const p = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((p(b) - p(a)) / 864e5);
}

/** Ist das Supplement an diesem Tag fällig? (rein) */
export function isDue(x, iso) {
  if (!x.on || iso < x.from) return false;
  if (x.mode === 'every2') { const d = dayDiff(x.anchor || x.from, iso); return d >= 0 && d % 2 === 0; }
  if (x.mode === 'days') return (x.days || []).includes(dow(iso));
  return true;
}

export const itemsFor = (iso) => suppSettings().items.filter((x) => isDue(x, iso));
export const isTaken = (iso, id) => (suppSettings().log[iso] || []).includes(id);
export const slotLabel = (x) => (x.slot === 'time' ? x.time : (SUPP_SLOTS.find((s) => s[0] === x.slot) || [0, ''])[1]);

export function summary(x) {
  const w = x.mode === 'daily' ? 'täglich' : x.mode === 'every2' ? 'jeden 2. Tag' : (x.days.length ? x.days.map((d) => SUPP_DAYS[d - 1]).join(' ') : 'keine Tage');
  return `${w} · ${slotLabel(x)} · ${String(x.amount).replace('.', ',')} ${x.unit}`;
}

/** Abhaken an/aus. Koffein-Tabletten (Katalog „caffeine“, Menge in mg) zählen im Koffein-Tracker mit. */
export function setTaken(iso, id, v) {
  store.update('supp', (s) => {
    const l = (s.log[iso] || []).filter((x) => x !== id);
    if (v) l.push(id);
    if (l.length) s.log[iso] = l; else delete s.log[iso];
  });
  const x = suppSettings().items.find((i) => i.id === id);
  if (x && x.kind === 'caffeine' && x.unit === 'mg') {
    const now = new Date();
    const min = iso === isoDate(now) ? now.getHours() * 60 + now.getMinutes() : (x.slot === 'time' ? hmToMin(x.time) : SLOT_MIN[x.slot] ?? 480);
    setSupplementCaffeine(iso, x.id, v ? +x.amount || 0 : 0, x.name, min);
  }
  changed();
}

/** Neues Supplement aus dem Katalog (kind) oder eigenes (kind = 'custom'). */
export function addItem(kind) {
  const t = isoDate();
  const c = SUPP_CAT_MAP[kind];
  const x = { id: 's-' + uuid(), kind: c ? c.kind : 'custom', name: c ? c.name : 'Neues Supplement', amount: c ? c.amount : 1, unit: c ? c.unit : 'Tabl.',
    form: c ? c.form : 'tablet', mode: 'daily', days: [1, 2, 3, 4, 5, 6, 7], slot: 'breakfast', time: '08:00', on: true, from: t, anchor: t };
  store.update('supp', (s) => { s.items.push(x); });
  changed();
  return x;
}

/** Ändert ein Supplement; prüft Name und Menge. */
export function updateItem(id, patch) {
  if ('name' in patch && !String(patch.name).trim()) throw new Error('Bitte einen Namen eingeben.');
  if ('amount' in patch && !(patch.amount > 0 && patch.amount <= 100000)) throw new Error('Bitte eine gültige Menge eingeben.');
  store.update('supp', (s) => {
    const x = s.items.find((i) => i.id === id);
    if (!x) return;
    Object.assign(x, patch);
    if ('name' in patch) x.name = String(patch.name).trim();
    if (patch.on === true || patch.mode === 'every2') { const t = isoDate(); if (patch.on === true) x.from = t; x.anchor = t; }
    if (Array.isArray(x.days)) x.days = [...new Set(x.days)].sort();
  });
  changed();
}

export function removeItem(id) {
  store.update('supp', (s) => { s.items = s.items.filter((i) => i.id !== id); });
  changed();
}

/** Hinweis, wenn die Menge über der BfR-Höchstmenge bzw. dem üblichen Bereich liegt (sonst ''). */
export function overNote(x) {
  const cat = SUPP_CAT_MAP[x.kind];
  if (!cat) return '';
  if (cat.max && x.unit === cat.max[1] && +x.amount > cat.max[0]) return `Deine Menge liegt über der BfR-Höchstmenge für Nahrungsergänzungsmittel (${String(cat.max[0]).replace('.', ',')} ${cat.max[1]}).`;
  if (cat.warnAbove && x.unit === cat.warnAbove[1] && +x.amount > cat.warnAbove[0]) return `Deine Menge liegt über den ${cat.warnAbove[2]}.`;
  return '';
}
