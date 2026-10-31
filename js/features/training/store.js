// Brücke: Speicher des Trainingsbereichs. Die übernommenen Module rufen get/set mit den Workout-Tracker-Namen
// (exercises, plans, …) auf; gespeichert wird über den Kern unter "tt_training_<name>". Nie "wt_…".
// Der Zyklus kommt nicht hierher: Er gehört dem Zyklus-Bereich von The Tracker (Entscheidung 2026-10-31).
import * as core from '../../core/store.js';
import { clone } from '../../core/util.js';
import { DEFAULT_SETTINGS } from './model.js';
import { getProfile } from '../../core/profile.js';

// 0.3.2: Figur standardmäßig „wie im Profil“ (figure: 'auto'); eigene Wahl 'male' | 'female' bleibt möglich.
const DEFAULTS = { exercises: [], groups: [], plans: [], sessions: [], routines: [], settings: { ...DEFAULT_SETTINGS, figure: 'auto' } };
export const COLLECTIONS = ['exercises', 'groups', 'plans', 'sessions', 'routines'];
export const KEYS = Object.keys(DEFAULTS);
const coreKey = (key) => `training_${key}`;
for (const key of KEYS) core.define(coreKey(key), DEFAULTS[key]);

function known(key) {
  if (!(key in DEFAULTS)) throw new Error(`Unbekannter Speicher-Key: ${key}`);
}

// Figur aus dem Profil: „Frau“ → weibliche Figur, sonst männliche (Logik der Muskelkarte ist gleich).
export const figureFromProfile = () => (getProfile().sex === 'f' ? 'female' : 'male');

export function get(key) {
  known(key);
  const value = core.get(coreKey(key));
  if (key !== 'settings') return value;
  const s = { ...clone(DEFAULT_SETTINGS), ...value };
  // Die übernommenen Module lesen settings.figure als 'male' | 'female'; die Wahl selbst steht in figureChoice.
  s.figureChoice = s.figure === 'male' || s.figure === 'female' ? s.figure : 'auto';
  s.figure = s.figureChoice === 'auto' ? figureFromProfile() : s.figureChoice;
  return s;
}

export function set(key, value) {
  known(key);
  if (key === 'settings' && value && 'figureChoice' in value) {
    const { figureChoice, ...rest } = value;
    value = { ...rest, figure: figureChoice };
  }
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
