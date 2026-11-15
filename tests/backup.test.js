// Backup der ganzen App (0.5.0): Inhalt, Prüfungen beim Import, alles oder nichts, PIN und fremde Keys bleiben.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorage } from './helpers.js';
import * as store from '../js/core/store.js';
import '../js/core/lock.js';
import '../js/features/journal/journal.js';
import '../js/core/profile.js';
import { KEYS as TRAINING_KEYS } from '../js/features/training/store.js';
import { buildBackup, parseBackup, applyBackup, fileName, LAZY_KEYS, MAX_TEXT, APP_ID } from '../js/core/backup.js';

const fresh = (init) => { globalThis.localStorage = new MemoryStorage(init); };
const BASE = {
  'ct.v1': '{"fremd":1}', wt_sessions: '[]',
  tt_days: '{"2026-11-01":[{"id":"a","name":"Brot","g":50}]}',
  tt_weight: '{"2026-11-01":75.5}',
  tt_lock: '{"pin":"abc","decoy":null,"salt":"s"}',
  tt_schema: '1', tt_broken_days: 'kaputt',
  tt_training_sessions: '[{"id":"s1","date":"2026-11-02"}]', tt_training_plans: '[{"id":"p1","name":"A"}]'
};

test('Trainings-Keys im Backup = Keys des Trainingsbereichs', () => {
  assert.deepEqual(LAZY_KEYS.slice().sort(), TRAINING_KEYS.map((k) => `training_${k}`).sort());
});

test('Sicherung enthält alle eigenen Daten, aber keine PIN, keine Reste und nichts Fremdes', () => {
  fresh(BASE);
  const b = buildBackup(new Date('2026-11-15T10:00:00Z'));
  assert.equal(b.app, APP_ID);
  assert.equal(b.format, 1);
  assert.deepEqual(Object.keys(b.data).sort(), ['days', 'training_plans', 'training_sessions', 'weight']);
  assert.equal(b.data.days['2026-11-01'][0].name, 'Brot');
  assert.equal(fileName(new Date(2026, 10, 5)), 'the-tracker-backup-2026-11-05.json');
});

test('Rundweg: sichern, ändern, wiederherstellen – PIN und fremde Keys bleiben', () => {
  fresh(BASE);
  const text = JSON.stringify(buildBackup());
  localStorage.setItem('tt_days', '{}');
  localStorage.setItem('tt_water', '{"x":1}');
  const r = parseBackup(text);
  assert.equal(r.ok, true, r.error);
  assert.equal(r.summary.days, 1);
  assert.equal(r.summary.trainings, 1);
  assert.equal(applyBackup(r.backup), true);
  assert.equal(JSON.parse(localStorage.getItem('tt_days'))['2026-11-01'][0].name, 'Brot');
  assert.equal(localStorage.getItem('tt_water'), null, 'nicht gesicherte Bereiche werden zurückgesetzt');
  assert.equal(localStorage.getItem('tt_lock'), BASE.tt_lock, 'PIN bleibt');
  assert.equal(localStorage.getItem('ct.v1'), '{"fremd":1}');
  assert.equal(localStorage.getItem('wt_sessions'), '[]');
});

test('Import prüft alles, bevor etwas geändert wird', () => {
  fresh(BASE);
  const good = buildBackup();
  const bad = (patch) => parseBackup(JSON.stringify({ ...good, ...patch }));
  assert.match(parseBackup('').error, /leer/);
  assert.match(parseBackup('{kein json').error, /kein JSON/);
  assert.match(bad({ app: 'workout-tracker' }).error, /keine Sicherung von The Tracker/);
  assert.match(bad({ format: 2 }).error, /neueren Version/);
  assert.match(bad({ data: [] }).error, /keine Daten/);
  assert.match(bad({ data: { ...good.data, lock: { pin: 'x' } } }).error, /Unbekannter Bereich/, 'PIN kann nicht importiert werden');
  assert.match(bad({ data: { __proto__x: 1 } }).error, /Unbekannter Bereich/);
  assert.match(bad({ data: { ...good.data, days: [] } }).error, /falsche Form/);
  assert.match(bad({ data: { ...good.data, weight: { a: 'x'.repeat(MAX_TEXT + 1) } } }).error, /länger als/);
  assert.match(bad({ data: { ...good.data, training_sessions: [{ id: 'a' }, { id: 'a' }] } }).error, /doppelt/);
  assert.match(parseBackup('x'.repeat(20 * 1024 * 1024 + 1)).error, /20 MB/);
  // __proto__ als Key im JSON verschmutzt nichts
  const proto = parseBackup(`{"app":"the-tracker","format":1,"data":{"__proto__":{"polluted":1}}}`);
  assert.equal(({}).polluted, undefined);
  assert.equal(proto.ok, false);
  assert.equal(localStorage.getItem('tt_days'), BASE.tt_days, 'nichts geändert');
});

test('Speicher voll beim Wiederherstellen: alter Stand bleibt vollständig', () => {
  fresh(BASE);
  const r = parseBackup(JSON.stringify({ ...buildBackup(), data: { days: { '2026-11-03': [] }, weight: { big: 1 } } }));
  assert.equal(r.ok, true, r.error);
  const ls = globalThis.localStorage;
  const orig = ls.setItem.bind(ls);
  let n = 0;
  ls.setItem = (k, v) => { if (k === 'tt_weight' && n++ === 0) throw new Error('QuotaExceeded'); return orig(k, v); };
  assert.equal(applyBackup(r.backup), false);
  ls.setItem = orig;
  for (const k of ['tt_days', 'tt_weight', 'tt_training_sessions', 'tt_lock']) assert.equal(ls.getItem(k), BASE[k], k);
});

test('store.ownRaw liest nur eigene Keys', () => {
  fresh(BASE);
  const raw = store.ownRaw();
  assert.ok(!Object.keys(raw).some((k) => k.startsWith('ct') || k.startsWith('wt')));
  assert.ok('lock' in raw && 'days' in raw);
});
