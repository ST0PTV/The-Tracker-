// Brücke: Speicher des Trainingsbereichs. Die übernommenen Module rufen get/set mit den Workout-Tracker-Namen
// (exercises, plans, …) auf; gespeichert wird über den Kern unter "tt_training_<name>". Nie "wt_…".
// Der Zyklus kommt nicht hierher: Er gehört dem Zyklus-Bereich von The Tracker (Entscheidung 2026-10-31).
import * as core from '../../core/store.js';
import { clone } from '../../core/util.js';
import { DEFAULT_SETTINGS } from './model.js';

const DEFAULTS = { exercises: [], groups: [], plans: [], sessions: [], routines: [], settings: DEFAULT_SETTINGS };
export const COLLECTIONS = ['exercises', 'groups', 'plans', 'sessions', 'routines'];
export const KEYS = Object.keys(DEFAULTS);
const coreKey = (key) => `training_${key}`;
for (const key of KEYS) core.define(coreKey(key), DEFAULTS[key]);

function known(key) {
  if (!(key in DEFAULTS)) throw new Error(`Unbekannter Speicher-Key: ${key}`);
}

export function get(key) {
  known(key);
  const value = core.get(coreKey(key));
  return key === 'settings' ? { ...clone(DEFAULT_SETTINGS), ...value } : value;
}

export function set(key, value) {
  known(key);
  return core.set(coreKey(key), value);
}

// Tutorial-Sandbox des Workout-Trackers gibt es hier nicht (Tutorial kommt am Ende für die ganze App).
export const inSandbox = () => false;

// Start: Schema des Kerns prüfen (für Tests und spätere Migrationen).
export const init = () => core.init();

// Alle Trainingsdaten auf einmal (für Prüfungen mit validateData aus model.js).
export function snapshot() {
  return Object.fromEntries(KEYS.map((key) => [key, get(key)]));
}
