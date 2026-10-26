import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorage } from './helpers.js';
import { alcGrams, alcR, bmiOf, alcSeries, alcLevelAt, alcSober, alcPeak, alcFmt } from '../js/features/drinks/alcohol-model.js';
import { saveAlcohol, removeAlcohol, alcEntries, alcFedAuto, alcParams, isFirstOfDay, loadDemoAlcohol, removeDemoAlcohol, alcSettings } from '../js/features/drinks/alcohol.js';
import { addEntry, entriesOf, addQuick, updateQuick, quickFood, dayTotals, recent, entryMin, mealByMin } from '../js/features/journal/journal.js';
import { setProfile, logWeight, todayISO } from '../js/core/profile.js';
import { generateDemoAlcohol } from '../js/features/dev/demo.js';
import { waterRows } from '../js/features/drinks/water.js';
import { addDays } from '../js/core/format.js';

const FOREIGN = { 'ct.v1': '{"alcohol":{"log":{}}}', wt_x: '1' };
const fresh = () => { globalThis.localStorage = new MemoryStorage({ ...FOREIGN }); };
const foreignOk = () => { for (const [k, v] of Object.entries(FOREIGN)) assert.equal(localStorage.getItem(k), v); };
const P = { kg: 70, r: 0.7, beta: 0.15 };
const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg}: ${a} statt ${b} (±${eps})`);

test('Gramm Alkohol und Verteilungsfaktor', () => {
  near(alcGrams(500, 4.9), 19.33, 0.01, '500 ml · 4,9 % · 0,789 g/ml');
  assert.equal(alcR({ sex: 'm' }), 0.7);
  assert.equal(alcR({ sex: 'f' }), 0.6);
  assert.equal(alcR({}), 0.65, 'ohne Geschlecht Mittel');
  const b = bmiOf(80, 180); // 24,69
  near(alcR({ sex: 'm', kg: 80, cm: 180 }), 0.8202 - 0.009 * b, 1e-9, 'Maudens 2014, Männer');
  near(alcR({ sex: 'f', kg: 60, cm: 165 }), 0.7772 - 0.0099 * bmiOf(60, 165), 1e-9, 'Maudens 2014, Frauen');
  assert.equal(alcR({ sex: 'm', kg: 160, cm: 170 }), 0.4, 'begrenzt auf 0,4');
});

test('Widmark: Abbau 0,15 ‰/h nach der Aufnahme, Zeit bis 0,0 ‰', () => {
  const d = [{ t: 0, g: 40, fed: false }];
  // aufgenommen 90 % von 40 g, verteilt auf 0,7 · 70 kg = 49 kg → höchstens 0,735 ‰ ohne Abbau
  const pk = alcPeak(d, 0, 6, P);
  // c(t) = A·(1 − e^(−4t)) − 0,15·t mit A = 0,9·40/49; Maximum bei e^(−4t) = 0,15/(4A) → t = 0,744 h, c = 0,586 ‰
  const A = (0.9 * 40) / 49, tMax = -Math.log(0.15 / (4 * A)) / 4;
  near(pk[1], A * (1 - Math.exp(-4 * tMax)) - 0.15 * tMax, 0.002, 'Gipfel');
  near(pk[0], tMax, 1 / 12, 'Zeit des Gipfels');
  near(alcLevelAt(d, 3, P) - alcLevelAt(d, 4, P), 0.15, 1e-3, 'je Stunde 0,15 ‰ weniger');
  // c(t) ≈ 0,7347 − 0,15·t → 0,01 ‰ bei t = 4,83 h. Geprüft wird alle 5 min: letzter Punkt ≥ 0,01 ‰ ist 4:45,
  // dazu 5 min → 4 h 50 min
  near(alcSober(d, 0, P), 58 / 12, 1e-9, 'wieder 0,0 ‰');
  assert.equal(alcSober([], 0, P), null);
  assert.ok(alcSeries(d, 0, 2, { ...P, kg: null }).every(([, c]) => c === 0), 'ohne Gewicht keine Schätzung');
  const fed = alcPeak([{ t: 0, g: 40, fed: true }], 0, 6, P);
  assert.ok(fed[1] < pk[1] && fed[0] > pk[0], 'mit Essen niedriger und später');
  assert.equal(alcFmt(0.5), '0,50');
});

test('Getränk speichern: verknüpfte kcal in den Snacks, nicht im Wasser, Löschen räumt auf', () => {
  fresh();
  const T = todayISO();
  setProfile({ sex: 'm' });
  logWeight(T, 80);
  const e = saveAlcohol(T, { min: 20 * 60, ml: 500, vol: 4.9, kcal: 190, n: 'Pils 500 ml' });
  const link = entriesOf(T).filter((x) => x.link === 'alc:' + e.id);
  assert.equal(link.length, 1);
  assert.equal(link[0].meal, 'snack');
  assert.equal(Math.round((link[0].k * link[0].grams) / 100), 190);
  assert.equal(link[0].t, '20:00');
  assert.equal(waterRows(T).length, 0, 'Alkohol zählt nicht zum Wasser');
  assert.ok(isFirstOfDay(T));
  const e2 = saveAlcohol(T, { min: 21 * 60, ml: 200, vol: 11.7, n: 'Rotwein' });
  assert.equal(e2.kcal, Math.round(alcGrams(200, 11.7) * 7), 'ohne kcal ≈ 7 kcal je g Alkohol');
  assert.equal(isFirstOfDay(T), false);
  assert.deepEqual(alcEntries(T).map((x) => x.min), [1200, 1260]);
  assert.equal(alcParams(T).kg, 80);
  removeAlcohol(T, e.id);
  assert.equal(entriesOf(T).filter((x) => x.link === 'alc:' + e.id).length, 0);
  assert.throws(() => saveAlcohol(T, { min: 60, ml: 0, vol: 5 }), /Menge/);
  assert.throws(() => saveAlcohol(T, { min: 60, ml: 100, vol: 90 }), /Vol-%/);
  assert.throws(() => saveAlcohol(T, { min: 1500, ml: 100, vol: 5 }), /Uhrzeit/);
  assert.equal(alcSettings().enabled, true, 'standardmäßig an');
  foreignOk();
});

test('Mit Essen: Mahlzeit ≥ 100 kcal in den 3 Stunden davor', () => {
  fresh();
  const T = todayISO();
  const brot = { src: 'bls', id: 'bls:B1', n: 'Brot', k: 250, p: 8, c: 45, f: 3, fi: 6, su: 2, fs: 0, liq: false };
  const saft = { src: 'bls', id: 'bls:S1', n: 'Saft', k: 45, p: 0, c: 10, f: 0, fi: 0, su: 10, fs: 0, liq: true };
  addEntry(T, saft, 500, 'dinner', { t: '19:00' });
  assert.equal(alcFedAuto(T, 20 * 60), false, 'Getränke zählen nicht');
  addEntry(T, brot, 80, 'lunch'); // 200 kcal um 12:30 (Standardzeit)
  assert.equal(alcFedAuto(T, 14 * 60), true);
  assert.equal(alcFedAuto(T, 15 * 60 + 31), false, 'mehr als 3 h danach');
  assert.equal(alcFedAuto(T, 12 * 60), false, 'Essen erst danach');
});

test('Schnell – nur kcal; Uhrzeit eines Eintrags; Mahlzeit nach Uhrzeit', () => {
  fresh();
  const T = todayISO();
  const q = addQuick(T, 250, 'snack', 'Kuchen');
  assert.equal(Math.round(dayTotals(T).k), 250);
  assert.equal(dayTotals(T).p, 0, 'ohne Makros');
  assert.equal(recent().length, 0, 'nicht unter „Zuletzt“');
  updateQuick(T, q.id, { kcal: 300, name: '', meal: 'lunch' });
  assert.equal(entriesOf(T)[0].n, 'Schnell eingetragen');
  assert.equal(entriesOf(T)[0].meal, 'lunch');
  assert.equal(Math.round(dayTotals(T).k), 300);
  assert.throws(() => quickFood(0), /kcal/);
  assert.equal(entryMin({ t: '07:45', meal: 'lunch' }), 465);
  assert.equal(entryMin({ meal: 'dinner' }), 18 * 60 + 30);
  assert.deepEqual([9 * 60, 13 * 60, 16 * 60, 20 * 60].map(mealByMin), ['breakfast', 'lunch', 'snack', 'dinner']);
});

test('Beispiel-Alkohol: nur Freitag/Samstag, nie heute, ohne Journal-Einträge', () => {
  fresh();
  const T = '2026-10-26';
  const m = generateDemoAlcohol({ today: T, days: 30 });
  assert.ok(Object.keys(m).length >= 2);
  for (const iso of Object.keys(m)) {
    assert.ok([5, 6].includes(new Date(iso + 'T12:00:00').getDay()), iso);
    assert.notEqual(iso, T);
    for (const x of m[iso]) assert.ok(!/,/.test(x.n), 'Name ohne Komma (Mahlzeit-Zusammenfassung kürzt am Komma)');
  }
  const own = saveAlcohol(addDays(T, -1), { min: 1200, ml: 330, vol: 4.9, n: 'Eigenes' });
  loadDemoAlcohol(m);
  assert.equal(Object.values(JSON.parse(localStorage.getItem('tt_days') || '{}')).flat().filter((e) => e.link && e.link !== 'alc:' + own.id).length, 0);
  removeDemoAlcohol();
  assert.deepEqual(Object.values(alcSettings().log).flat().map((x) => x.id), [own.id]);
  foreignOk();
});
