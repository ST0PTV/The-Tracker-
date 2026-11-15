// Backup der ganzen App (0.5.0): alle eigenen Daten (tt_…) als eine JSON-Datei sichern und wiederherstellen.
// Eigenes Format von The Tracker, ohne Kompatibilität zu den Ursprungs-Apps (Nutzerwunsch 2026-11-15).
// Grenzen und Prüfungen nach dem Vorbild von Workout-Tracker/js/backup.js 3.14 (MIT, ST0PTV): Dateigröße, Länge jedes
// Textes, nur bekannte Keys, Prüfung vor jeder Änderung, alles oder nichts beim Schreiben.
// Nicht im Backup: PIN (lock) – sie bleibt auf dem Gerät; beschädigte Reste (broken_…); interne Merker (schema).
import * as store from './store.js';
import { VERSION } from './version.js';

export const APP_ID = 'the-tracker';
export const FORMAT = 1;
export const MAX_BYTES = 20 * 1024 * 1024;
export const MAX_TEXT = 5000;

// Keys des Trainingsbereichs: werden erst beim Öffnen des Tabs angemeldet (js/features/training/store.js),
// gehören aber ins Backup. tests/backup.test.js prüft, dass die Liste mit dem Trainingsbereich übereinstimmt.
export const LAZY_KEYS = ['training_exercises', 'training_groups', 'training_plans', 'training_sessions', 'training_routines', 'training_settings'];

const SKIP = (k) => k === 'lock' || k === 'schema' || k.startsWith('broken_');
const KEY_RE = /^[a-z][a-z0-9_]{0,63}$/;
const allowed = () => new Set([...store.keys(), ...LAZY_KEYS].filter((k) => !SKIP(k)));

/** Inhalt der Sicherung: { app, format, version, exportedAt, data: { key: Wert } }. */
export function buildBackup(now = new Date()) {
  const ok = allowed();
  const data = {};
  for (const [k, raw] of Object.entries(store.ownRaw(SKIP))) {
    if (!ok.has(k)) continue;
    try { data[k] = JSON.parse(raw); } catch { /* beschädigt: weglassen */ }
  }
  return { app: APP_ID, format: FORMAT, version: VERSION, exportedAt: now.toISOString(), data };
}

export const fileName = (now = new Date()) => {
  const p = (n) => String(n).padStart(2, '0');
  return `the-tracker-backup-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
};

// Längster Text bzw. Key in einem Wert (iterativ, keine Rekursionstiefe).
function tooLong(value) {
  const stack = [value];
  while (stack.length) {
    const v = stack.pop();
    if (typeof v === 'string') { if (v.length > MAX_TEXT) return true; continue; }
    if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) { if (k.length > MAX_TEXT) return true; stack.push(x); }
    }
  }
  return false;
}

// Gleiche Grundform wie der Standardwert (Liste bleibt Liste, Objekt bleibt Objekt).
const sameShape = (v, fallback) => {
  if (Array.isArray(fallback)) return Array.isArray(v);
  if (fallback && typeof fallback === 'object') return !!v && typeof v === 'object' && !Array.isArray(v);
  return v === null || ['string', 'number', 'boolean'].includes(typeof v);
};

/**
 * Prüft den Text einer Sicherungsdatei, ändert nichts.
 * → { ok: true, backup, summary } oder { ok: false, error: 'Text für die Meldung' }
 */
export function parseBackup(text) {
  if (typeof text !== 'string' || !text.trim()) return { ok: false, error: 'Die Datei ist leer.' };
  if (text.length > MAX_BYTES) return { ok: false, error: 'Die Datei ist größer als 20 MB.' };
  let b;
  try { b = JSON.parse(text); } catch { return { ok: false, error: 'Die Datei ist keine gültige Sicherung (kein JSON).' }; }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return { ok: false, error: 'Die Datei ist keine gültige Sicherung.' };
  if (b.app !== APP_ID) return { ok: false, error: 'Das ist keine Sicherung von The Tracker.' };
  if (!Number.isInteger(b.format) || b.format < 1) return { ok: false, error: 'Unbekanntes Format der Sicherung.' };
  if (b.format > FORMAT) return { ok: false, error: 'Die Sicherung stammt aus einer neueren Version. Bitte die App aktualisieren.' };
  if (!b.data || typeof b.data !== 'object' || Array.isArray(b.data)) return { ok: false, error: 'Die Sicherung enthält keine Daten.' };
  if (tooLong(b)) return { ok: false, error: `Ein Text in der Datei ist länger als ${MAX_TEXT} Zeichen.` };
  const ok = allowed();
  const data = {};
  for (const [k, v] of Object.entries(b.data)) {
    if (!KEY_RE.test(k) || !ok.has(k)) return { ok: false, error: `Unbekannter Bereich in der Sicherung: „${k.slice(0, 40)}“.` };
    const fallback = LAZY_KEYS.includes(k) ? (k === 'training_settings' ? {} : []) : store.defaultOf(k);
    if (!sameShape(v, fallback)) return { ok: false, error: `Der Bereich „${k}“ hat eine falsche Form.` };
    data[k] = v;
  }
  if (Array.isArray(data.training_sessions) || Array.isArray(data.training_plans)) {
    for (const k of ['training_exercises', 'training_groups', 'training_plans', 'training_sessions', 'training_routines']) {
      const list = data[k] || [];
      const ids = list.map((x) => x && x.id);
      if (ids.some((id) => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) return { ok: false, error: `Im Bereich „${k}“ fehlen Kennungen oder sind doppelt.` };
    }
  }
  return { ok: true, backup: { ...b, data }, summary: summarize(b, data) };
}

/** Kurze Übersicht für die Bestätigung. */
export function summarize(b, data = b.data) {
  const days = data.days && typeof data.days === 'object' ? Object.values(data.days).filter((x) => Array.isArray(x) && x.length).length : 0;
  const cyc = data.zyklus && data.zyklus.days && typeof data.zyklus.days === 'object' ? Object.keys(data.zyklus.days).length : 0;
  return {
    exportedAt: typeof b.exportedAt === 'string' ? b.exportedAt : null,
    version: typeof b.version === 'string' ? b.version.slice(0, 20) : '',
    days,
    trainings: Array.isArray(data.training_sessions) ? data.training_sessions.length : 0,
    plans: Array.isArray(data.training_plans) ? data.training_plans.length : 0,
    weights: data.weight && typeof data.weight === 'object' ? Object.keys(data.weight).length : 0,
    cycleDays: cyc,
    ownFoods: Array.isArray(data.custom) ? data.custom.length : 0,
    ownRecipes: data.recipes && Array.isArray(data.recipes.own) ? data.recipes.own.length : 0
  };
}

/** Ersetzt alle Daten durch die geprüfte Sicherung. PIN bleibt. true = geschafft, false = alter Stand bleibt. */
export function applyBackup(backup) {
  return store.replaceOwn(backup.data, (k) => k === 'lock');
}
