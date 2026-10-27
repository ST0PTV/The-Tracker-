// Tageswerte für die Analyse – nur über die Funktionen der Bereiche, nie direkt aus fremdem Speicher.
// Mittelwerte zählen nur Tage mit Essens-Einträgen (Tracker-Getränke mit verknüpftem Eintrag zählen nicht als „getrackt“,
// ihre kcal aber zur Aufnahme – wie im Calorie-Tracker).
import * as store from '../../core/store.js';
import { entriesOf, sumEntries } from '../journal/journal.js';
import { getGoals, weightLog } from '../../core/profile.js';
import { waterSettings, waterRows, waterTotal } from '../drinks/water.js';
import { caffSettings, caffSum, caffDoses, caffWaterRows } from '../drinks/caffeine.js';
import { keOf, level, bedWake } from '../drinks/caffeine-model.js';
import { alcSettings, alcGramsOf } from '../drinks/alcohol.js';
import { isoDate, addDays } from '../../core/format.js';
import { daysBack } from './insights.js';

store.define('analyse', { range: 7 });
export const RANGES = [[7, '7 Tage'], [30, '30 Tage'], [90, '90 Tage']];
export const getRange = () => (RANGES.some(([n]) => n === store.get('analyse').range) ? store.get('analyse').range : 7);
export const setRange = (n) => store.update('analyse', (a) => { a.range = n; });

export const foodEntries = (iso) => entriesOf(iso).filter((e) => !e.link);
export const loggedOf = (iso) => foodEntries(iso).length > 0;
export const kcalOf = (iso) => sumEntries(entriesOf(iso)).k;

/** Alle Werte eines Tages, die die Analyse braucht. */
export function dayRow(iso) {
  const t = sumEntries(entriesOf(iso));
  const g = getGoals(iso);
  const W = waterSettings(), C = caffSettings(), A = alcSettings();
  const row = { d: iso, n: foodEntries(iso).length, k: t.k, p: t.p, c: t.c, f: t.f, fi: t.fi, goal: g?.goal || null, pg: g?.protein || null };
  if (W.enabled) { row.water = waterTotal(waterRows(iso, caffWaterRows(iso))); row.wgoal = W.goal || 1500; }
  if (C.enabled) {
    row.caf = caffSum(iso);
    row.cafBed = row.caf > 0 ? level(caffDoses(iso), bedWake(iso, C.bed, C.wake).bed, keOf(C.halfLife)) : 0;
  }
  if (A.enabled) row.alc = alcGramsOf(iso);
  return row;
}

/** Zeitraum ohne heute: n Tage bis gestern. */
export function rangeDays(n, today = isoDate()) {
  const end = addDays(today, -1);
  return { start: addDays(end, -(n - 1)), end, days: daysBack(end, n).map(dayRow) };
}

export const weights = () => weightLog().map((x) => ({ iso: x.iso, kg: x.kg }));
export const enabled = () => ({ water: waterSettings().enabled, caf: caffSettings().enabled, alc: alcSettings().enabled });
