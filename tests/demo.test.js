import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MemoryStorage } from './helpers.js';
import { fromBls } from '../js/features/food/foods.js';
import { generateDemo, rng, DEMO_GOAL } from '../js/features/dev/demo.js';
import { addEntry, loadDemo, removeDemo, demoCount, entriesOf, sumEntries } from '../js/features/journal/journal.js';

const foods = JSON.parse(readFileSync(new URL('../data/bls.json', import.meta.url))).foods.map(fromBls);

test('Beispieldaten: 30 Tage, markiert, reproduzierbar, realistische Tagesmengen', () => {
  const a = generateDemo({ today: '2026-10-25', foods });
  const b = generateDemo({ today: '2026-10-25', foods });
  const days = Object.keys(a);
  assert.equal(days.length, 30);
  assert.deepEqual([days[0], days.at(-1)], ['2026-09-26', '2026-10-25']);
  assert.deepEqual(Object.values(a).flat().map((e) => [e.n, e.grams]), Object.values(b).flat().map((e) => [e.n, e.grams]));
  assert.ok(Object.values(a).flat().every((e) => e.demo && e.ref.startsWith('bls:') && e.grams > 0));
  for (const iso of days.slice(0, -1)) {
    const k = sumEntries(a[iso]).k;
    assert.ok(k > DEMO_GOAL * 0.75 && k < DEMO_GOAL * 1.25, `${iso}: ${Math.round(k)} kcal`);
  }
  assert.ok(a['2026-10-25'].every((e) => ['breakfast', 'lunch'].includes(e.meal)), 'heute nur bis mittags');
});

test('Laden ersetzt alte Beispieldaten, Entfernen lässt echte Einträge stehen', () => {
  globalThis.localStorage = new MemoryStorage({ 'ct.v1': '{"fremd":1}' });
  const real = addEntry('2026-10-24', foods[0], 50, 'snack');
  const demo = generateDemo({ today: '2026-10-25', foods, days: 3 });
  const n = loadDemo(demo);
  assert.equal(loadDemo(demo), n, 'zweimal laden verdoppelt nichts');
  assert.equal(demoCount(), n);
  assert.equal(removeDemo(), n);
  assert.deepEqual(entriesOf('2026-10-24').map((e) => e.id), [real.id]);
  assert.equal(demoCount(), 0);
  assert.equal(localStorage.getItem('ct.v1'), '{"fremd":1}');
});

test('Zufall mit Startwert ist reproduzierbar', () => {
  const r1 = rng(7), r2 = rng(7);
  assert.deepEqual([r1(), r1(), r1()], [r2(), r2(), r2()]);
});
