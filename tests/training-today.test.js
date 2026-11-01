// Trainingskarte auf „Heute“ (0.3.2, Variante B): nächster Plan, Woche Mo–So, Sätze ohne Aufwärmen und Cardio,
// laufendes Training; keine Ziel- oder Serienangaben.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MemoryStorage } from './helpers.js';

globalThis.localStorage = new MemoryStorage();
const { todaySummary } = await import('../js/features/training/today-card.js');
const D = await import('../js/features/training/demo.js');

const now = new Date('2026-11-01T12:00:00'); // Sonntag
const demo = D.generateTrainingDemo({ now });

test('Woche Mo–So aus den Beispieldaten: Kraft Mo/Mi/Fr, Rad am Samstag als Ring', () => {
  const s = todaySummary(demo, now);
  assert.equal(s.days.length, 7);
  assert.equal(s.days[6].today, true);
  const kinds = s.days.map((d) => d.kind);
  for (const i of [0, 2, 4]) assert.ok(kinds[i] === 'strength' || kinds[i] === null);
  assert.ok(kinds[5] === 'cardio' || kinds[5] === null);
  assert.ok([1, 3, 6].every((i) => kinds[i] === null));
  assert.equal(s.trainings, kinds.filter(Boolean).length);
  assert.ok(s.next && s.next.plan.name.includes('Beispiel'));
  assert.equal(s.running, null);
});

test('Sätze: ohne Aufwärmsätze und ohne Cardio', () => {
  const s = todaySummary(demo, now);
  const from = new Date('2026-10-26T00:00:00').getTime();
  const byId = Object.fromEntries(demo.exercises.map((e) => [e.id, e]));
  const want = demo.sessions.filter((x) => Date.parse(x.startedAt) >= from).flatMap((x) => x.entries)
    .filter((e) => byId[e.exerciseId].kind !== 'cardio').flatMap((e) => e.sets).filter((x) => x.type !== 'warmup').length;
  assert.equal(s.sets, want);
});

test('Laufendes Training: Name, erledigte Übungen', () => {
  const plan = demo.plans[0];
  const run = { id: 'r1', planId: plan.id, startedAt: new Date(now.getTime() - 20 * 60000).toISOString(), endedAt: null,
    entries: [{ exerciseId: plan.items[0].exerciseId, sets: [{ completedAt: now.toISOString(), type: 'work' }] }, { exerciseId: plan.items[1].exerciseId, sets: [{ completedAt: null, type: 'work' }] }] };
  const s = todaySummary({ ...demo, sessions: [...demo.sessions, run] }, now);
  assert.deepEqual({ name: s.running.name, done: s.running.done, total: s.running.total }, { name: plan.name, done: 1, total: 2 });
});

test('Ohne Pläne kein Vorschlag; keine Ziel- oder Serien-Texte in der Karte', () => {
  const s = todaySummary({ plans: [], sessions: [], exercises: [] }, now);
  assert.equal(s.next, null); assert.equal(s.trainings, 0);
  const src = readFileSync(new URL('../js/features/training/today-card.js', import.meta.url), 'utf8');
  const texts = [...src.matchAll(/'([^'\n]{3,})'|`([^`\n]{3,})`/g)].map((m) => m[1] || m[2]).join(' ');
  assert.ok(!/Serie|Streak|in Folge|Ziel erreicht|verdient|kcal/i.test(texts));
});
