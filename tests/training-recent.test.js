// „Letzte Trainings“ (0.4.0): nur Cardio zeigt Übung und Minuten statt „Freies Training · 0 Sätze“.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorage } from './helpers.js';

globalThis.localStorage = new MemoryStorage();
const { recentLine } = await import('../js/features/training/history.js');

const byId = {
  rad: { id: 'rad', name: 'Radfahren', kind: 'cardio' },
  lauf: { id: 'lauf', name: 'Laufen', kind: 'cardio' },
  kb: { id: 'kb', name: 'Kniebeuge', kind: 'strength' }
};
const start = '2026-11-01T10:00:00.000Z', end = '2026-11-01T10:40:00.000Z';
const done = (extra = {}) => ({ completedAt: end, type: 'work', ...extra });
const session = (entries, planId = null) => ({ id: 's', planId, startedAt: start, endedAt: end, entries });

test('Nur Cardio, freies Training: Name der Übung und Minuten', () => {
  const r = recentLine(session([{ exerciseId: 'rad', sets: [done({ durationSec: 1800 })] }]), byId);
  assert.deepEqual(r, { name: 'Radfahren', detail: '30 min' });
});

test('Nur Cardio ohne erfasste Dauer: Zeit von Start bis Ende', () => {
  const r = recentLine(session([{ exerciseId: 'rad', sets: [done()] }, { exerciseId: 'lauf', sets: [done()] }]), byId);
  assert.deepEqual(r, { name: 'Radfahren · Laufen', detail: '40 min' });
});

test('Mit Kraftübung: weiter Name und Sätze', () => {
  const r = recentLine(session([{ exerciseId: 'kb', sets: [done({ reps: 8, weight: 60 })] }, { exerciseId: 'rad', sets: [done({ durationSec: 600 })] }]), byId);
  assert.equal(r.name, 'Freies Training');
  assert.match(r.detail, /^\d+ (Satz|Sätze)$/);
  assert.ok(!/0 Sätze/.test(recentLine(session([{ exerciseId: 'rad', sets: [done()] }]), byId).detail));
});
