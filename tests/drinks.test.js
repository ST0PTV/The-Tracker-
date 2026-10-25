import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorage } from './helpers.js';
import { level, one, keOf, clearTime, bedWake, hmToMin, minToHm, absHours } from '../js/features/drinks/caffeine-model.js';
import { caffGuess, caffPer100, saveCaffeine, removeCaffeine, caffRows, caffSum, caffWaterRows, journalCaffeine,
  loadDemoCaffeine, removeDemoCaffeine, caffEntries } from '../js/features/drinks/caffeine.js';
import { addWater, removeWater, restoreWater, waterRows, waterTotal, loadDemoWater, removeDemoWater, waterEntries } from '../js/features/drinks/water.js';
import { addEntry, entriesOf } from '../js/features/journal/journal.js';
import { generateDemoDrinks } from '../js/features/dev/demo.js';

const FOREIGN = { 'ct.v1': '{"fremd":1}', wt_data: 'x', 'rezeptbuch-tracker': 'y' };
const fresh = () => { globalThis.localStorage = new MemoryStorage({ ...FOREIGN }); };
const foreignOk = () => { for (const [k, v] of Object.entries(FOREIGN)) assert.equal(localStorage.getItem(k), v); };
const D = '2026-10-25';

test('Modell: Maximum nach ca. 30–40 min, Halbwertszeit danach', () => {
  const ke = keOf(5);
  let best = 0, tMax = 0;
  for (let t = 0; t < 3; t += 1 / 60) { const v = one(100, 0, t, ke); if (v > best) { best = v; tMax = t; } }
  assert.ok(tMax > 0.4 && tMax < 0.7, `Maximum nach ${tMax * 60} min`);
  assert.ok(best > 90 && best < 100);
  const ratio = one(100, 0, 10, ke) / one(100, 0, 5, ke);
  assert.ok(Math.abs(ratio - 0.5) < 0.01, 'nach Aufnahme halbiert sich die Menge je Halbwertszeit');
  assert.equal(one(100, 2, 1, ke), 0, 'vor der Einnahme nichts');
});

test('Modell: Dosen addieren sich, „über X min“ verteilt die Dosis', () => {
  const ke = keOf(5);
  const a = level([{ t: 0, mg: 100, dur: 0 }], 3, ke);
  const b = level([{ t: 0, mg: 100, dur: 0 }, { t: 1, mg: 100, dur: 0 }], 3, ke);
  assert.ok(Math.abs(b - (a + one(100, 1, 3, ke))) < 1e-9);
  const sip = level([{ t: 0, mg: 100, dur: 0.5 }], 0.25, ke);
  assert.ok(sip < level([{ t: 0, mg: 100, dur: 0 }], 0.25, ke), 'langsam getrunken: anfangs weniger');
  assert.ok(Math.abs(level([{ t: 0, mg: 100, dur: 0.5 }], 20, ke) - a * Math.pow(0.5, 17 / 5)) < 1, 'später fast gleich');
});

test('Modell: Zeit bis unter die Schwelle, Bettzeit am Folgetag', () => {
  const ke = keOf(5);
  const t = clearTime([{ t: 0, mg: 200, dur: 0 }], 0, 50, ke);
  // 200 → 50 mg sind zwei Halbwertszeiten ≈ 10 h (+ Aufnahme)
  assert.ok(t > 10 && t < 10.5, `unter 50 mg nach ${t} h`);
  assert.equal(clearTime([], 3, 50, ke), 3);
  const bw = bedWake(D, '00:30', '07:00');
  assert.equal(bw.bed, absHours(D, 24 * 60 + 30), 'Bettzeit nach Mitternacht zählt zum Folgetag');
  assert.ok(bw.wake > bw.bed && bw.wake - bw.bed === 6.5);
  assert.equal(hmToMin('07:45'), 465);
  assert.equal(minToHm(465), '07:45');
});

test('Koffein-Vorschlag nach Name, keine Schätzung bei koffeinfrei', () => {
  assert.equal(caffGuess({ n: 'Cola', liq: true }).v, 10);
  assert.equal(caffGuess({ n: 'Kaffee entkoffeiniert', liq: true }), null);
  assert.equal(caffGuess({ n: 'Kaffeebohnen', liq: false }), null, 'nur Flüssigkeiten');
  assert.equal(caffGuess({ n: 'Orangensaft', liq: true }), null);
});

test('Getränk mit kcal: verknüpfter Journal-Eintrag, Wasser einmal, Löschen räumt auf', () => {
  fresh();
  const e = saveCaffeine(D, { min: 8 * 60, mg: 90, n: 'Latte', ml: 300, kcal: 120, tr: true });
  const linked = entriesOf(D).filter((x) => x.link === 'caff:' + e.id);
  assert.equal(linked.length, 1);
  assert.equal(Math.round(linked[0].k * linked[0].grams / 100), 120);
  assert.equal(journalCaffeine(D).length, 0, 'verknüpfter Eintrag zählt kein zweites Mal Koffein');
  assert.equal(caffSum(D), 90);
  assert.deepEqual(caffWaterRows(D).map((r) => r.ml), [300]);
  assert.equal(waterTotal(waterRows(D, caffWaterRows(D))), 300, 'verknüpfter Eintrag zählt nicht doppelt zum Wasser');
  saveCaffeine(D, { id: e.id, min: 8 * 60, mg: 90, n: 'Latte', ml: 300, kcal: 120, tr: false });
  assert.equal(entriesOf(D).filter((x) => x.link).length, 0, 'ohne „zählt mit“ kein kcal-Eintrag');
  removeCaffeine(D, e.id);
  assert.equal(caffEntries(D).length, 0);
  assert.throws(() => saveCaffeine(D, { min: 60, mg: 0 }), /Koffein-Menge/);
  assert.throws(() => saveCaffeine(D, { min: 1500, mg: 10 }), /Uhrzeit/);
  foreignOk();
});

test('Koffein aus dem Journal wird berechnet (Mahlzeit-Uhrzeit als Standard)', () => {
  fresh();
  const cola = { src: 'off', id: 'off:1', n: 'Cola, Dose', k: 42, p: 0, c: 10.6, f: 0, fi: 0, su: 10.6, fs: 0, liq: true, cf: 10 };
  addEntry(D, cola, 330, 'lunch', { cf: 10, water: true });
  addEntry(D, cola, 200, 'snack', { cf: 10, t: '16:10' });
  const rows = caffRows(D);
  assert.deepEqual(rows.map((r) => [r.min, r.mg]), [[12 * 60 + 30, 33], [16 * 60 + 10, 20]]);
  assert.equal(caffPer100(cola).src, 'off');
  const w = waterRows(D);
  assert.deepEqual(w.map((r) => r.ml), [330], 'nur der Eintrag mit „zählt zum Wasser“');
});

test('Wasser: eintragen, löschen, wiederherstellen, Grenzen', () => {
  fresh();
  const a = addWater(D, 250, { min: 600 });
  addWater(D, 500, { min: 480 });
  assert.deepEqual(waterRows(D).map((r) => r.min), [480, 600], 'nach Uhrzeit sortiert');
  assert.equal(waterTotal(waterRows(D)), 750);
  const gone = removeWater(D, a.id);
  assert.equal(waterTotal(waterRows(D)), 500);
  restoreWater(D, gone); restoreWater(D, gone);
  assert.equal(waterEntries(D).length, 2, 'Rückgängig nur einmal');
  assert.throws(() => addWater(D, 5), /10–3.000/);
  foreignOk();
});

test('Beispiel-Getränke: plausibel, entfernbar ohne eigene Einträge', () => {
  fresh();
  const { water, caff } = generateDemoDrinks({ today: D, days: 30 });
  assert.equal(Object.keys(water).length, 30);
  for (const [iso, l] of Object.entries(water)) {
    const sum = l.reduce((s, x) => s + x.ml, 0);
    assert.ok(sum >= 1000 && sum <= 3500, `${iso}: ${sum} ml`);
  }
  for (const l of Object.values(caff)) {
    const mg = l.reduce((s, x) => s + x.mg, 0);
    assert.ok(mg <= 400, 'nicht über dem EFSA-Richtwert');
    for (const x of l) assert.ok(x.min <= 18 * 60 + 30);
  }
  assert.deepEqual(generateDemoDrinks({ today: D }), generateDemoDrinks({ today: D }), 'reproduzierbar');
  const own = addWater(D, 300, { min: 60 });
  saveCaffeine(D, { min: 60, mg: 30, n: 'Eigener Tee', tr: false });
  loadDemoWater(water); loadDemoCaffeine(caff);
  assert.ok(waterEntries(D).length > 1);
  assert.equal(entriesOf(D).filter((x) => x.link).length, 0, 'Beispiele erzeugen keine kcal-Einträge');
  removeDemoWater(); removeDemoCaffeine();
  assert.deepEqual(waterEntries(D).map((x) => x.id), [own.id]);
  assert.deepEqual(caffEntries(D).map((x) => x.n), ['Eigener Tee']);
  foreignOk();
});
