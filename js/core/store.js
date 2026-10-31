// Speicherschicht: einzige Stelle, die localStorage anfasst.
// Alle Keys tragen das Präfix "tt_". Wichtig: Die App läuft unter derselben Origin (st0ptv.github.io) wie
// Calorie-Tracker ("ct.v1") und Workout-Tracker ("wt_…"). Fremde Keys werden hier nie gelesen oder geschrieben.
// Aufbau nach dem Vorbild von Workout-Tracker/js/store.js (MIT, ST0PTV).
import { clone } from './util.js';

export const PREFIX = 'tt_';
export const SCHEMA_VERSION = 1;

// Jeder Bereich meldet seine Keys mit Standardwert an (define), bevor er sie liest oder schreibt.
const DEFAULTS = {};

export function define(key, fallback) {
  if (!/^[a-z][a-z0-9_]*$/.test(key)) throw new Error(`Ungültiger Speicher-Key: ${key}`);
  if (key in DEFAULTS) throw new Error(`Speicher-Key doppelt angemeldet: ${key}`);
  DEFAULTS[key] = clone(fallback);
}

export function keys() {
  return Object.keys(DEFAULTS);
}

function storage() {
  return globalThis.localStorage;
}

// Ein Wert mit falscher Form oder kaputtes JSON gilt als beschädigt: Es gilt der Standardwert,
// der Rohtext wird einmalig unter tt_broken_<key> aufgehoben, damit nichts still verloren geht.
const shapeOk = (value, fallback) => {
  if (Array.isArray(fallback)) return Array.isArray(value);
  if (fallback && typeof fallback === 'object') return !!value && typeof value === 'object' && !Array.isArray(value);
  return true;
};

function keepBroken(key, raw) {
  try {
    if (storage().getItem(PREFIX + 'broken_' + key) === null) storage().setItem(PREFIX + 'broken_' + key, raw);
  } catch { /* Speicher voll: egal */ }
}

function read(key, fallback) {
  let raw = null;
  try {
    raw = storage().getItem(PREFIX + key);
    if (raw === null) return clone(fallback);
    const value = JSON.parse(raw);
    if (shapeOk(value, fallback)) return value;
  } catch { /* kaputtes JSON: unten behandelt */ }
  if (raw !== null) keepBroken(key, raw);
  return clone(fallback);
}

// Jeder Schreibversuch meldet sein Ergebnis an die Beobachter (Banner „Nicht gespeichert“).
const writeListeners = new Set();
export function onWriteResult(fn) {
  writeListeners.add(fn);
  return () => writeListeners.delete(fn);
}

function write(key, value) {
  let ok = true;
  try {
    storage().setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    ok = false; // z. B. Speicher voll oder privater Modus
  }
  for (const fn of writeListeners) { try { fn(ok, key); } catch { /* Beobachter darf das Speichern nicht stören */ } }
  return ok;
}

function known(key) {
  if (!(key in DEFAULTS)) throw new Error(`Unbekannter Speicher-Key: ${key}`);
}

// Beim App-Start: neue Installation markieren. Migrationen kommen, sobald sich das Schema ändert.
export function init() {
  const stored = read('schema', null);
  if (stored === null) write('schema', SCHEMA_VERSION);
  return { ok: stored === null || stored === SCHEMA_VERSION, schema: stored ?? SCHEMA_VERSION };
}

export function get(key) {
  known(key);
  const fallback = DEFAULTS[key];
  const value = read(key, fallback);
  // Objekte mit Standardwerten auffüllen, damit neue Felder ohne Migration einen Wert haben.
  if (fallback && typeof fallback === 'object' && !Array.isArray(fallback)) return { ...clone(fallback), ...value };
  return value;
}

export function set(key, value) {
  known(key);
  return write(key, value);
}

// Ändert einen Wert über eine Funktion: update('profile', (p) => { p.x = 1; }).
export function update(key, fn) {
  const value = get(key);
  const out = fn(value);
  return set(key, out === undefined ? value : out);
}

export function snapshot() {
  const out = {};
  for (const key of keys()) out[key] = get(key);
  return out;
}

// Ersetzt alle Daten (Backup-Import). Bei einem Schreibfehler wird der vorherige Stand wiederhergestellt.
export function replaceAll(data) {
  const before = {};
  for (const key of keys()) before[key] = read(key, DEFAULTS[key]);
  for (const key of keys()) {
    const value = key in data ? data[key] : DEFAULTS[key];
    if (!write(key, value)) {
      for (const k of keys()) write(k, before[k]);
      return false;
    }
  }
  write('schema', SCHEMA_VERSION);
  return true;
}

// Grobe Größe der eigenen Daten in KB (UTF-16 ≈ 2 Byte pro Zeichen). Fremde Keys zählen nicht mit.
export function usageKB() {
  let chars = 0;
  try {
    const ls = storage();
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k && k.startsWith(PREFIX)) chars += k.length + (ls.getItem(k) || '').length;
    }
  } catch {
    return 0;
  }
  return Math.round((chars * 2) / 102.4) / 10;
}

// Löscht alle eigenen Daten (alle Keys mit Präfix tt_, auch von Bereichen, die noch nicht geladen sind, z. B. Training).
// Fremde Keys derselben Origin bleiben. Für „PIN vergessen“.
export function wipeAll() {
  const ls = storage();
  const own = [];
  for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k && k.startsWith(PREFIX)) own.push(k); }
  for (const k of own) ls.removeItem(k);
  write('schema', SCHEMA_VERSION);
}
