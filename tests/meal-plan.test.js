// Plan-Vorschlag zum Magen-Modell (0.5.0): Essfenster, Verteilung, Gegessenes zählt, Rest auf offene Mahlzeiten.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorage } from './helpers.js';
import { planDay, PLAN_PRESETS, splitSum, planSettings, setPlanSettings } from '../js/features/analyse/meal-plan.js';

const base = { goal: 2000, wake: 7, bed: 23, split: PLAN_PRESETS.balanced.split, first: 1, gap: 3, weight: 70 };

test('Essfenster und gleichmäßige Uhrzeiten (auf halbe Stunden)', () => {
  const p = planDay(base);
  assert.equal(p.start, 8);
  assert.equal(p.end, 20);
  assert.deepEqual(p.items.map((x) => x.h), [8, 12, 16, 20]);
  assert.deepEqual(p.items.map((x) => x.target), [600, 600, 300, 500]);
  assert.deepEqual(p.protein, [28, 38.5]);
});

test('Gegessenes zählt, der Rest geht anteilig an die offenen Mahlzeiten', () => {
  const p = planDay({ ...base, eaten: { breakfast: 800 } });
  assert.equal(p.items[0].done, true);
  assert.equal(p.rest, 1200);
  // offen: 30 + 15 + 25 = 70 %
  assert.equal(Math.round(p.items[1].rest), Math.round(1200 * 30 / 70));
  assert.equal(Math.round(p.items[3].rest), Math.round(1200 * 25 / 70));
  const over = planDay({ ...base, eaten: { breakfast: 1500, lunch: 900 } });
  assert.equal(over.rest, 0);
  assert.equal(over.items[2].rest, 0);
});

test('Snack 0 % = drei Mahlzeiten; zu kurzes Fenster wird mindestens 1 h; ohne Ziel keine Mengen', () => {
  const p = planDay({ ...base, split: { breakfast: 35, lunch: 35, snack: 0, dinner: 30 } });
  assert.deepEqual(p.items.map((x) => x.meal), ['breakfast', 'lunch', 'dinner']);
  assert.deepEqual(p.items.map((x) => x.h), [8, 14, 20]);
  const short = planDay({ ...base, wake: 10, bed: 13 });
  assert.equal(short.end - short.start, 1);
  const none = planDay({ ...base, goal: null });
  assert.equal(none.items[0].target, null);
  assert.equal(none.items[0].rest, null);
  assert.equal(planDay({ ...base, weight: null }).protein, null);
});

test('Einstellungen: Vorlagen ergeben 100 %, eigene Werte bleiben, ungültige fallen zurück', () => {
  globalThis.localStorage = new MemoryStorage();
  for (const p of Object.values(PLAN_PRESETS)) if (p.split) assert.equal(splitSum(p.split), 100);
  assert.equal(planSettings().preset, 'balanced');
  setPlanSettings({ preset: 'evening' });
  assert.equal(planSettings().split.dinner, 40);
  setPlanSettings({ preset: 'custom', split: { breakfast: 10, lunch: 50, snack: 0, dinner: 40 } });
  assert.equal(planSettings().split.lunch, 50);
  localStorage.setItem('tt_mealplan', JSON.stringify({ preset: 'xyz', first: 9, gap: -1 }));
  const s = planSettings();
  assert.deepEqual([s.preset, s.first, s.gap], ['balanced', 1, 3]);
});
