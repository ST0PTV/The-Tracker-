// Beispieldaten Training (0.3.1): gültig nach model.js, entfernbar, echte Daten bleiben, nur tt_-Keys.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorage } from './helpers.js';

globalThis.localStorage = new MemoryStorage();
const store = await import('../js/features/training/store.js');
const D = await import('../js/features/training/demo.js');
const M = await import('../js/features/training/model.js');
const { createExercise } = M;

test('Beispieldaten sind gültig und reproduzierbar', () => {
  const now = new Date('2026-10-31T12:00:00');
  const a = D.generateTrainingDemo({ now }), b = D.generateTrainingDemo({ now });
  assert.equal(a.sessions.length, b.sessions.length);
  assert.deepEqual(a.sessions.map((s) => s.startedAt), b.sessions.map((s) => s.startedAt));
  assert.ok(a.sessions.length >= 12 && a.plans.length === 2);
  assert.ok(a.sessions.every((s) => s.demo && new Date(s.startedAt) < now));
  assert.deepEqual(M.validateData({ ...a, groups: [], routines: [], settings: M.DEFAULT_SETTINGS }), []);
});

test('Laden und Entfernen lassen echte Daten stehen; nur tt_training_-Keys', () => {
  localStorage.clear();
  localStorage.setItem('wt_exercises', '[1]');
  const own = createExercise({ name: 'Eigene Übung' });
  store.set('exercises', [own]);
  const n = D.loadTrainingDemo({ now: new Date('2026-10-31T12:00:00') });
  assert.ok(n > 0 && D.trainingDemoCount() === n);
  assert.deepEqual(M.validateData(store.snapshot()), []);
  assert.equal(D.loadTrainingDemo({ now: new Date('2026-10-31T12:00:00') }), n); // neu laden verdoppelt nicht
  assert.equal(store.get('sessions').length, n);
  assert.equal(D.removeTrainingDemo(), n);
  assert.deepEqual(store.get('exercises').map((e) => e.id), [own.id]);
  assert.equal(localStorage.getItem('wt_exercises'), '[1]');
  for (let i = 0; i < localStorage.length; i++) assert.ok(/^(tt_|wt_exercises$)/.test(localStorage.key(i)), localStorage.key(i));
});

test('Figur: Standard „wie im Profil“, eigene Wahl bleibt beim Speichern anderer Einstellungen erhalten', async () => {
  localStorage.clear();
  const { setProfile } = await import('../js/core/profile.js');
  setProfile({ sex: 'f' });
  let s = store.get('settings');
  assert.equal(s.figureChoice, 'auto');
  assert.equal(s.figure, 'female');
  store.set('settings', { ...store.get('settings'), restSeconds: 90 }); // wie die übernommenen Module speichern
  assert.equal(store.get('settings').figureChoice, 'auto', 'aufgelöste Figur wird nicht gespeichert');
  setProfile({ sex: 'm' });
  assert.equal(store.get('settings').figure, 'male');
  store.set('settings', { ...store.get('settings'), figureChoice: 'female' });
  store.set('settings', { ...store.get('settings'), barKg: 15 });
  s = store.get('settings');
  assert.equal(s.figure, 'female'); assert.equal(s.figureChoice, 'female'); assert.equal(s.barKg, 15); assert.equal(s.restSeconds, 90);
  assert.deepEqual(M.validateData(store.snapshot()), []);
});
