// Zyklus: Speicher und Zugriff (tt_zyklus). Einzige Stelle, die Zyklusdaten liest oder schreibt.
// Datenform nach state.cycle in zyklus.js im Rezeptbuch (Copyright (c) 2026 JuliaKelp, MIT): days { 'JJJJ-MM-TT': Eintrag },
// Einstellungen daneben. Neu: Kartenstil und Kalenderstil (Nutzerwunsch 2026-10-29), Methoden feiner (model.js).
// Mit der Schein-PIN (core/lock.js) gilt ein eigener, leerer Datenbestand (decoyDays).
import * as store from '../../core/store.js';
import { getProfile, setProfile } from '../../core/profile.js';
import { isDecoy } from '../../core/lock.js';
import { isoDate } from '../../core/format.js';
import * as M from './model.js';

export const TRACK = [['temp', 'Basaltemperatur'], ['cm', 'Zervixschleim'], ['cervix', 'Muttermund'], ['sex', 'Sex'], ['pill', 'Pille'],
  ['tests', 'Tests'], ['body', 'Körper'], ['meds', 'Medikamente'], ['pain', 'Schmerzstärke'], ['mood', 'Stimmung'], ['note', 'Notiz']];
const TRACK_DEFAULT = { temp: true, cm: true, cervix: false, sex: false, pill: true, tests: true, body: true, meds: true, pain: true, mood: false, note: false };

export const DEFAULTS = {
  on: true, fert: true, method: 'none', phase: 'normal', card: 'strip', cal: 'circles',
  track: { ...TRACK_DEFAULT }, medList: [],
  rem: { period: true, pill: true, pillTime: '21:00', temp: false, tempTime: '06:30' },
  days: {}, decoyDays: {}
};
store.define('zyklus', DEFAULTS);

function raw() {
  const c = store.get('zyklus');
  c.track = { ...TRACK_DEFAULT, ...(c.track || {}) };
  c.rem = { ...DEFAULTS.rem, ...(c.rem || {}) };
  if (!c.days || typeof c.days !== 'object') c.days = {};
  if (!c.decoyDays || typeof c.decoyDays !== 'object') c.decoyDays = {};
  if (!Array.isArray(c.medList)) c.medList = [];
  if (!M.METHODS.some(([k]) => k === c.method)) c.method = 'none';
  return c;
}

function changed() { if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('tt-cycle')); }

/** Einstellungen ohne Tage. */
export function cycleSettings() {
  const { days, decoyDays, ...rest } = raw();
  return rest;
}
export function setCycleSettings(patch) {
  const ok = store.update('zyklus', (c) => { Object.assign(c, patch); });
  changed();
  return ok;
}

/** Zyklus verfügbar: im Profil „Hast du deine Regel?“ = Ja (und nicht „Mann“). */
export function cycleAvailable() {
  const p = getProfile();
  return p.cycle === 'yes' && p.sex !== 'm';
}
/** Verfügbar und eingeschaltet (Karte auf „Heute“). */
export const cycleActive = () => cycleAvailable() && raw().on !== false;

const field = () => (isDecoy() ? 'decoyDays' : 'days');
/** Tage des aktuellen Datenbestands (bei Schein-PIN der leere). */
export const cycleDays = () => raw()[field()];
export const dayEntry = (iso) => cycleDays()[iso] || {};

export function setDayField(iso, f, v) {
  if (!M.isIso(iso) || iso > isoDate()) throw new Error('Bitte einen Tag bis heute wählen.');
  const k = field();
  const ok = store.update('zyklus', (c) => { c[k] = M.withField(c[k] || {}, iso, f, v); });
  changed();
  return ok;
}

/** Blutungstage übernehmen (Import, Periodenbeginn von Hand). Gibt die Zahl neuer Tage zurück. */
export function importBleedDays(keys) {
  const k = field();
  let added = 0;
  store.update('zyklus', (c) => { const r = M.importDays(c[k] || {}, keys, isoDate()); c[k] = r.days; added = r.added; });
  changed();
  return added;
}

export function addMed(name) {
  const v = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  if (!v) return null;
  store.update('zyklus', (c) => { c.medList = Array.isArray(c.medList) ? c.medList : []; if (v !== 'Schmerzmittel' && !c.medList.includes(v)) c.medList.push(v); });
  return v;
}
export function removeMed(name) { store.update('zyklus', (c) => { c.medList = (c.medList || []).filter((m) => m !== name); }); }

/** Löscht die Tage des aktuellen Datenbestands (Einstellungen bleiben). */
export function deleteCycleDays() {
  const k = field();
  store.update('zyklus', (c) => { c[k] = {}; });
  changed();
}
/** Löscht beide Datenbestände (PIN vergessen). */
export function wipeCycleDays() {
  store.update('zyklus', (c) => { c.days = {}; c.decoyDays = {}; });
  changed();
}

/** Auswertung des aktuellen Datenbestands. */
export const cycleAnalysis = (today = isoDate()) => M.analyze(cycleDays(), today);
/** Fruchtbare Tage zeigen? (Schalter an, keine hormonelle Methode, Phase normal) */
export function showFertile() { const c = raw(); return !!c.fert && !M.hormonal(c.method) && !M.paused(c.phase); }

// Beispieldaten (Entwicklung, 0.3.2): Einträge mit demo: true im echten Datenbestand (nicht im Schein-Bestand).
// Tage mit echten Einträgen bleiben unberührt. Ist „Hast du deine Regel?“ noch offen und nicht „Mann“ gewählt,
// wird es auf „Ja“ gesetzt und beim Entfernen zurückgesetzt (profile.demoCycle merkt sich das).
export const demoCycleCount = () => Object.values(raw().days).filter((e) => e && e.demo).length;

export function removeDemoCycle() {
  const n = demoCycleCount();
  store.update('zyklus', (c) => { for (const [k, e] of Object.entries(c.days || {})) if (e && e.demo) delete c.days[k]; });
  if (getProfile().demoCycle) setProfile({ cycle: null, demoCycle: null });
  changed();
  return n;
}

/** Lädt Beispiel-Zyklen; gibt { added, visible } zurück (visible: Zyklus danach sichtbar). */
export function loadDemoCycle(map) {
  removeDemoCycle();
  let added = 0;
  store.update('zyklus', (c) => {
    c.days = c.days || {};
    for (const [k, e] of Object.entries(map)) if (!c.days[k]) { c.days[k] = { ...e, demo: true }; added++; }
  });
  const p = getProfile();
  if (p.cycle !== 'yes' && p.sex !== 'm') setProfile({ cycle: 'yes', demoCycle: true });
  changed();
  return { added, visible: cycleAvailable() };
}
