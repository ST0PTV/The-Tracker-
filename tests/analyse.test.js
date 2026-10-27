import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weightTrend, regression, expenditure, goalState, daysBack, INS_ALPHA, INS_KCAL_KG } from '../js/features/analyse/insights.js';
import { microDay, microAvg, MICRO_META } from '../js/features/analyse/micro.js';
import { stomachEvents, halfLife, remain, stomachAt, emptyAt, sexFactor } from '../js/features/analyse/stomach.js';
import { addDays } from '../js/core/format.js';

const near = (a, b, eps = 1e-9, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} ${a} ≠ ${b}`);

test('Gewichtstrend: EWMA mit a = 0,1, Tage ohne Wiegen behalten den Trend', () => {
  const tr = weightTrend([{ iso: '2026-10-01', kg: 80 }, { iso: '2026-10-03', kg: 78 }], '2026-10-04');
  assert.equal(tr.length, 4);
  // Start = erster Wert; 03.10.: 80 + 0,1 · (78 − 80) = 79,8; 04.10. ohne Wiegen bleibt 79,8
  near(tr[0].t, 80); near(tr[1].t, 80); near(tr[2].t, 80 + INS_ALPHA * (78 - 80)); near(tr[3].t, tr[2].t);
  assert.equal(tr[3].w, null);
  assert.deepEqual(weightTrend([]), []);
  assert.equal(weightTrend([{ iso: 'x', kg: 80 }, { iso: '2026-10-01', kg: 10 }]).length, 0, 'ungültige Werte fallen weg');
});

test('Ausgleichsgerade: exakte Gerade hat Steigung und Fehler 0', () => {
  const r = regression([[0, 80], [1, 79.9], [2, 79.8], [3, 79.7]]);
  near(r.slope, -0.1, 1e-12); near(r.se, 0, 1e-9); assert.equal(r.n, 4);
  assert.equal(regression([[0, 1], [1, 2]]), null, 'unter 3 Punkten keine Gerade');
  assert.equal(regression([[1, 1], [1, 2], [1, 3]]), null, 'alle x gleich');
});

test('Energiebedarf: Ø Aufnahme − Steigung × 7.700; zu wenig Daten → ok false', () => {
  const today = '2026-10-29', start = addDays(today, -28);
  // jeden Tag 2.000 kcal, Gewicht fällt 0,05 kg/Tag (an jedem 2. Tag gewogen)
  const log = []; for (let i = 0; i < 28; i += 2) log.push({ iso: addDays(start, i), kg: 80 - 0.05 * i });
  const e = expenditure({ today, kcalOf: () => 2000, loggedOf: () => true, log });
  assert.equal(e.ok, true); assert.equal(e.logged, 28); assert.equal(e.weighs, 14);
  near(e.tdee, 2000 - (-0.05) * INS_KCAL_KG, 1e-6, 'Bedarf'); // 2.385 kcal
  near(e.slopeWeek, -0.35, 1e-9); near(e.lo, e.tdee, 1e-6); near(e.hi, e.tdee, 1e-6);
  const few = expenditure({ today, kcalOf: () => 2000, loggedOf: (d) => d >= addDays(today, -10), log });
  assert.equal(few.ok, false); assert.equal(few.logged, 10);
  const noW = expenditure({ today, kcalOf: () => 2000, loggedOf: () => true, log: log.slice(0, 3) });
  assert.equal(noW.ok, false);
});

test('Zielbereich ±10 %', () => {
  assert.equal(goalState(2150, 2000), 'ok'); assert.equal(goalState(1800, 2000), 'ok');
  assert.equal(goalState(2201, 2000), 'over'); assert.equal(goalState(1799, 2000), 'low');
  assert.equal(goalState(1500, null), null);
  assert.deepEqual(daysBack('2026-10-03', 3), ['2026-10-01', '2026-10-02', '2026-10-03']);
});

test('Mikronährstoffe: Summe je Tag, Abdeckung über kcal, verknüpfte Einträge zählen nicht', () => {
  const foods = { 'bls:A': { fe: 5, ca: 100 }, 'bls:B': { fe: 1 } };
  const lookup = (id) => foods[id] || null;
  const day = [
    { id: 'bls:A', grams: 50, k: 300 },              // 150 kcal, Fe 2,5 mg, Ca 50 mg
    { ref: 'bls:B', grams: 200, k: 100 },            // 200 kcal, Fe 2 mg
    { id: 'off:123', grams: 100, k: 150 },           // 150 kcal ohne Werte
    { id: 'x', grams: 100, k: 40, link: 'alc:1' }     // zählt nicht
  ];
  const r = microDay(day, lookup);
  near(r.vals.fe, 2.5 + 2); near(r.vals.ca, 50); near(r.kcalAll, 500); near(r.kcalKnown, 350);
  const avg = microAvg([day, [], [{ id: 'bls:A', grams: 100, k: 300 }]], lookup);
  assert.equal(avg.n, 2, 'Tage ohne Essen zählen nicht');
  const fe = avg.rows.find((x) => x.k === 'fe');
  near(fe.v, (4.5 + 5) / 2); assert.equal(fe.pct, Math.round(((4.5 + 5) / 2 / MICRO_META.fe[2]) * 100));
  assert.equal(avg.cov, Math.round(((350 + 300) / (500 + 300)) * 100));
});

test('Magen-Modell: Normalwerte nach 1/2/4 h, Ereignisse zusammengefasst, Getränke schnell', () => {
  const ev = { h: 8, kcal: 250, f: 0, liq: false };
  // T½ = 1,75 h ohne Geschlecht → Rest 2^(−(t/1,75)²)
  near(halfLife(ev), 1.75, 1e-12);
  const share = (t) => remain(ev, 8 + t) / 250;
  near(share(1), Math.pow(2, -Math.pow(1 / 1.75, 2)), 1e-12);
  assert.ok(share(1) >= 0.37 && share(1) <= 0.9, `1 h: ${share(1)}`);
  assert.ok(share(2) >= 0.3 && share(2) <= 0.6, `2 h: ${share(2)}`);
  assert.ok(share(4) <= 0.1, `4 h: ${share(4)}`);
  assert.equal(remain(ev, 7), 0, 'vor dem Essen nichts im Magen');
  near(emptyAt(ev), 8 + Math.sqrt(Math.log2(10)) * 1.75, 1e-12);
  near(remain(ev, emptyAt(ev)) / 250, 0.1, 1e-12, '90 % entleert');
  // Geschlecht und Fett verlängern, Grenzen 0,75–4,5 h
  near(halfLife(ev, 'f'), 1.75 * 1.1, 1e-12); near(halfLife(ev, 'm'), 1.75 * 0.9, 1e-12); assert.equal(sexFactor(null), 1);
  near(halfLife({ kcal: 250, f: 250 / 9, liq: false }), 1.75 * 1.5, 1e-12, 'nur Fett: × 1,5');
  assert.equal(halfLife({ kcal: 5000, f: 300, liq: false }), 4.5);
  near(halfLife({ kcal: 200, f: 0, liq: true }, 'f'), 0.4 * 1.1, 1e-12);
  const evs = stomachEvents([
    { meal: 'breakfast', h: 8, kcal: 300, f: 10, liq: false, name: 'Brot' },
    { meal: 'breakfast', h: 8.25, kcal: 50, f: 0, liq: true, name: 'Milch' },
    { meal: 'lunch', h: 12.5, kcal: 600, f: 20, liq: false, name: 'Nudeln' },
    { meal: 'snack', h: 15, kcal: 0, f: 0, liq: true, name: 'Wasser' }
  ]);
  assert.equal(evs.length, 2); assert.equal(evs[0].kcal, 350); assert.equal(evs[0].liq, false); assert.deepEqual(evs[0].names, ['Brot', 'Milch']);
  near(stomachAt(evs, 13), remain(evs[0], 13) + remain(evs[1], 13), 1e-12);
});

test('Trend pro Woche aus Trendpunkten', async () => {
  const { trendPerWeek } = await import('../js/features/analyse/insights.js');
  assert.equal(trendPerWeek([{ d: '2026-10-01', t: 80 }]), null);
  near(trendPerWeek([{ d: '2026-10-01', t: 80 }, { d: '2026-10-08', t: 79.5 }]), -0.5, 1e-12);
  near(trendPerWeek([{ d: '2026-10-01', t: 80 }, { d: '2026-10-15', t: 79 }]), -0.5, 1e-12);
});
