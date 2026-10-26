import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorage } from './helpers.js';
import { wgPlan, wgOptions, wgBmrEst, wgMaint, wgDateFor, weeklyTrend, wgDays } from '../js/features/goal/weightgoal.js';
import { enterWeight, applyCalorieGoal } from '../js/features/goal/weight.js';
import { logWeight, removeWeight, weightLog, currentWeight, getProfile, setProfile, setGoal, getGoals, setWeightGoal,
  getWeightGoal, loadDemoWeights, removeDemoWeights, todayISO } from '../js/core/profile.js';
import { generateDemoWeights } from '../js/features/dev/demo.js';
import { addDays } from '../js/core/format.js';

const FOREIGN = { 'ct.v1': '{"wgoal":{"on":true}}', wt_body: '[80]' };
const fresh = () => { globalThis.localStorage = new MemoryStorage({ ...FOREIGN }); };
const foreignOk = () => { for (const [k, v] of Object.entries(FOREIGN)) assert.equal(localStorage.getItem(k), v); };
const T = '2026-10-26';
const ctx = (sex = null, age = null) => ({ sex, age, today: T });
const base = { src: 'watch', maint: 2500, tempo: 'rec' };

test('Plan „Empfohlen“: 0,75 %/Woche, 7.700 kcal/kg', () => {
  // 80 → 72 kg: 0,6 kg/Woche, 94 Tage, −660 kcal/Tag → 1.840 kcal
  const o = wgOptions(80, { ...base, target: 72 }, ctx());
  const rec = o.list.find((x) => x.k === 'rec');
  assert.equal(rec.days, 94);
  assert.equal(Math.round(rec.perDay), -660);
  assert.equal(rec.goal, 1840);
  const p = wgPlan(80, { ...base, target: 72, date: rec.date }, ctx());
  assert.equal(p.goal, 1840);
  assert.equal(p.tooFast, false);
  assert.deepEqual(p.warn, []);
});

test('Zu schnell: gedeckelt auf 1 %/Woche, frühestes Datum genannt', () => {
  const p = wgPlan(80, { ...base, target: 72, date: addDays(T, 30) }, ctx());
  assert.equal(p.tooFast, true);
  assert.equal(p.goal, 1620, '−0,8 kg/Woche = −880 kcal/Tag');
  assert.equal(p.earliest, addDays(T, 70));
  assert.match(p.warn[0], /^Zu schnell/);
  const g = wgPlan(70, { ...base, target: 80, date: addDays(T, 30) }, ctx());
  assert.equal(g.tooFast, true, 'Zunahme höchstens 0,5 %/Woche');
  assert.equal(g.goal, Math.round((2500 + (0.35 * 7700) / 7) / 10) * 10);
});

test('Untergrenze: nie unter 1.200 (Frau/ohne Angabe) bzw. 1.500 kcal (Mann)', () => {
  const o = { src: 'watch', maint: 1800, target: 72, date: addDays(T, 94) };
  const f = wgPlan(80, o, ctx('f'));
  assert.equal(f.goal, 1200);
  assert.equal(f.floorHit, true);
  assert.equal(f.reach, addDays(T, Math.ceil((8 * 7700) / 600)));
  assert.equal(wgPlan(80, o, ctx('m')).goal, 1500);
  assert.equal(wgPlan(80, o, ctx(null)).goal, 1200);
  assert.ok(wgOptions(80, o, ctx('f')).list.find((x) => x.k === 'rec').low, 'Vorschlag unter der Grenze markiert');
});

test('Halten, Zunehmen, Bedarf aus Grundumsatz und Schätzung', () => {
  assert.equal(wgOptions(80, { ...base, target: 80.2 }, ctx()).keep, true);
  assert.equal(wgDateFor(80, { ...base, target: 80.2 }, ctx()), addDays(T, 91));
  const gain = wgOptions(70, { ...base, target: 75 }, ctx()).list.find((x) => x.k === 'rec');
  assert.equal(gain.goal, 2770);
  // DGE-Formel: Frau (0,047·kg − 0,01452·Alter + 3,21) MJ · 239; Mann + 1,009 MJ
  const f = (0.047 * 70 - 0.01452 * 30 + 3.21) * 239;
  assert.equal(wgBmrEst(70, 'f', 30), Math.round(f));
  assert.equal(wgBmrEst(70, 'm', 30), Math.round(f + 1.009 * 239));
  assert.equal(wgBmrEst(70, null, 30), Math.round(f + (1.009 * 239) / 2));
  assert.equal(wgBmrEst(70, 'f', null), null, 'ohne Alter keine Schätzung');
  assert.equal(wgMaint({ src: 'bmr', bmr: 1600, pal: 1.6, sport: true }, 70, ctx()), Math.round(1600 * 1.9));
  assert.equal(wgMaint({ src: 'est', pal: 1.4 }, 70, ctx('f', 30)), Math.round(Math.round(f) * 1.4));
  assert.equal(wgPlan(80, { ...base, target: 72, date: addDays(T, -1) }, ctx()).past, true);
  assert.equal(wgDays('2026-03-28', '2026-03-30'), 2, 'über die Zeitumstellung');
});

test('Wochentrend: Mittel 7 Tage gegen die 7 Tage davor', () => {
  const log = [];
  for (let i = 13; i >= 0; i--) log.push({ iso: addDays(T, -i), kg: i >= 7 ? 80 : 79 });
  const t = weeklyTrend(log, T);
  assert.equal(t.avg, 79);
  assert.equal(t.diff, -1);
  assert.equal(weeklyTrend([], T), null);
  assert.equal(weeklyTrend(log.slice(-3), T).diff, null, 'ohne Vorwoche kein Vergleich');
});

test('Gewicht eintragen: Grenzen, Profil nur vom neuesten echten Eintrag', () => {
  fresh();
  const today = todayISO();
  assert.throws(() => logWeight(today, 20), /30 und 300/);
  logWeight(addDays(today, -2), 80.04);
  assert.equal(getProfile().weightKg, 80);
  logWeight(addDays(today, -5), 82);
  assert.equal(getProfile().weightKg, 80, 'älterer Eintrag ändert das Profil nicht');
  assert.equal(currentWeight(addDays(today, -4)), 82);
  loadDemoWeights({ [today]: 70, [addDays(today, -2)]: 60 });
  assert.equal(getProfile().weightKg, 80, 'Beispiele ändern das Profil nicht');
  assert.equal(weightLog().find((e) => e.iso === addDays(today, -2)).kg, 80, 'echte Einträge werden nicht überschrieben');
  removeDemoWeights();
  assert.deepEqual(weightLog().map((e) => e.kg), [82, 80]);
  removeWeight(addDays(today, -5));
  assert.equal(weightLog().length, 1);
  foreignOk();
});

test('Automatisch anpassen: neues Gewicht von heute rechnet das Kalorienziel neu', () => {
  fresh();
  const today = todayISO();
  setProfile({ sex: 'f' });
  setGoal({ from: addDays(today, -10), goal: 2000, preset: 'cut', weight: 80 });
  const date = addDays(today, 94);
  setWeightGoal({ on: true, auto: true, src: 'watch', maint: 2500, target: 72, date, tempo: 'rec' });
  const msg = enterWeight(today, 79);
  const want = wgPlan(79, getWeightGoal(), { sex: 'f', age: null, today }).goal;
  assert.match(msg, /Kalorienziel ab heute/);
  assert.equal(getGoals(today).goal, want);
  assert.equal(getGoals(today).preset, 'cut', 'Makro-Verteilung bleibt');
  assert.equal(getGoals(today).weight, 79);
  assert.equal(getGoals(addDays(today, -1)).goal, 2000, 'frühere Tage unverändert');
  enterWeight(addDays(today, -1), 78);
  assert.equal(getGoals(today).goal, want, 'Eintrag für einen früheren Tag rechnet nicht neu');
  setWeightGoal({ auto: false });
  enterWeight(today, 77);
  assert.equal(getGoals(today).goal, want, 'ohne „automatisch“ bleibt das Ziel');
  applyCalorieGoal(1900, today);
  assert.equal(getGoals(today).goal, 1900);
  assert.equal(getGoals(today).protein, Math.round(2.2 * 77), 'Makros mit aktuellem Gewicht');
  foreignOk();
});

test('Beispiel-Gewichte: reproduzierbar, plausibel', () => {
  const a = generateDemoWeights({ today: T, days: 30 });
  assert.deepEqual(a, generateDemoWeights({ today: T, days: 30 }));
  assert.ok(a[T] != null, 'heute ist ein Wert da');
  const v = Object.values(a);
  assert.ok(v.length >= 15 && v.length <= 30);
  assert.ok(v.every((x) => x > 70 && x < 80));
});
