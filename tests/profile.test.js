import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorage } from './helpers.js';
import { macrosFrom, fatCheck, fiberSugarFrom, goalsAt, withGoal, setGoal, getGoals, setProfile, todayISO } from '../js/core/profile.js';

test('Makros: Eiweiß und Fett aus g/kg, Kohlenhydrate als Rest (Atwater 4/4/9)', () => {
  // 2400 kcal, 80 kg, Muskelaufbau 1,6 / 1,0 → Eiweiß 128 g, Fett 80 g, KH (2400 − 512 − 720) / 4 = 292 g
  assert.deepEqual(macrosFrom(2400, 80, 1.6, 1.0), { protein: 128, carbs: 292, fat: 80, fatPct: 30 });
  assert.equal(macrosFrom(1000, 120, 2.2, 1.0), null, 'negative KH → keine Berechnung');
  assert.equal(macrosFrom(null, 80, 1, 1), null);
});

test('Fettanteil gegen den Bereich des Presets', () => {
  assert.equal(fatCheck('dge', 32), 0);
  assert.equal(fatCheck('dge', 25), -1);
  assert.equal(fatCheck('cut', 31), 1);
  assert.equal(fatCheck('custom', 40), null);
});

test('Ballaststoffe ≥ 30 g, freier Zucker < 10 % der Energie', () => {
  assert.deepEqual(fiberSugarFrom(2000), { fiber: 30, sugar: 50 });
});

test('Ziel-Historie: Ziel gilt ab Datum, frühere Tage nehmen das erste Ziel', () => {
  let h = withGoal([], { from: '2026-10-01', goal: 2000 });
  h = withGoal(h, { from: '2026-10-20', goal: 2200 });
  h = withGoal(h, { from: '2026-10-20', goal: 2300 }); // gleicher Tag ersetzt
  assert.equal(h.length, 2);
  assert.equal(goalsAt(h, '2026-09-01').goal, 2000);
  assert.equal(goalsAt(h, '2026-10-19').goal, 2000);
  assert.equal(goalsAt(h, '2026-10-25').goal, 2300);
  assert.equal(goalsAt([], '2026-10-25'), null);
  assert.throws(() => withGoal([], { goal: 1 }), /Datum/);
});

test('setGoal rechnet Makros aus Preset und Profilgewicht und speichert unter tt_goals', () => {
  globalThis.localStorage = new MemoryStorage();
  setProfile({ weightKg: 70 });
  setGoal({ goal: 2000, preset: 'dge', from: '2026-10-25' });
  const g = getGoals('2026-10-25');
  assert.equal(g.protein, 56);
  assert.equal(g.fat, 70);
  assert.equal(g.carbs, Math.round((2000 - 4 * 56 - 9 * 70) / 4));
  assert.equal(g.sugar, 50);
  assert.ok(localStorage.getItem('tt_goals'));
});

test('todayISO nutzt lokale Zeit', () => {
  assert.equal(todayISO(new Date(2026, 0, 5, 23, 30)), '2026-01-05');
});
