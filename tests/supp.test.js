import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorage } from './helpers.js';
import { isDue, dow, dayDiff, addItem, updateItem, removeItem, setTaken, isTaken, itemsFor, summary, overNote, suppSettings } from '../js/features/supp/supplements.js';
import { SUPP_CAT, SUPP_CAT_MAP } from '../js/features/supp/catalog.js';
import { caffEntries, caffSum } from '../js/features/drinks/caffeine.js';
import { isoDate } from '../js/core/format.js';

const fresh = () => { globalThis.localStorage = new MemoryStorage({ 'ct.v1': '{"fremd":1}' }); };

test('Fälligkeit: täglich, jeden 2. Tag, Wochentage, ab Startdatum', () => {
  assert.equal(dow('2026-10-26'), 1, 'Montag');
  assert.equal(dow('2026-10-25'), 7, 'Sonntag');
  assert.equal(dayDiff('2026-10-30', '2026-11-02'), 3, 'über den Monatswechsel');
  assert.equal(dayDiff('2026-03-28', '2026-03-30'), 2, 'über die Zeitumstellung');
  const base = { on: true, from: '2026-10-20', anchor: '2026-10-20', mode: 'daily', days: [] };
  assert.equal(isDue(base, '2026-10-19'), false, 'vor dem Start nicht');
  assert.equal(isDue(base, '2026-10-25'), true);
  assert.equal(isDue({ ...base, on: false }, '2026-10-25'), false);
  const e2 = { ...base, mode: 'every2' };
  assert.deepEqual(['2026-10-20', '2026-10-21', '2026-10-22'].map((d) => isDue(e2, d)), [true, false, true]);
  const wd = { ...base, mode: 'days', days: [1, 3] };
  assert.deepEqual(['2026-10-26', '2026-10-27', '2026-10-28'].map((d) => isDue(wd, d)), [true, false, true]);
});

test('Supplements starten leer; anlegen, ändern, abhaken, löschen', () => {
  fresh();
  assert.deepEqual(suppSettings().items, [], 'keine Vorgaben (keine Gesundheitsdaten im Repo)');
  const x = addItem('vitd');
  assert.equal(x.name, SUPP_CAT_MAP.vitd.name);
  const t = isoDate();
  assert.equal(itemsFor(t).length, 1);
  updateItem(x.id, { mode: 'days', days: [3, 1, 1] });
  assert.deepEqual(suppSettings().items[0].days, [1, 3]);
  assert.match(summary(suppSettings().items[0]), /^Mo Mi · Frühstück/);
  assert.throws(() => updateItem(x.id, { name: '  ' }), /Namen/);
  assert.throws(() => updateItem(x.id, { amount: 0 }), /Menge/);
  setTaken(t, x.id, true); setTaken(t, x.id, true);
  assert.deepEqual(suppSettings().log[t], [x.id], 'nur einmal abgehakt');
  setTaken(t, x.id, false);
  assert.equal(isTaken(t, x.id), false);
  assert.equal(suppSettings().log[t], undefined);
  removeItem(x.id);
  assert.equal(suppSettings().items.length, 0);
  assert.equal(localStorage.getItem('ct.v1'), '{"fremd":1}');
});

test('Koffein-Tablette zählt im Koffein-Tracker, Abhaken zurück entfernt sie', () => {
  fresh();
  const x = addItem('caffeine');
  updateItem(x.id, { amount: 100, unit: 'mg' });
  const t = isoDate();
  setTaken(t, x.id, true);
  assert.equal(caffSum(t), 100);
  setTaken(t, x.id, true);
  assert.equal(caffEntries(t).length, 1, 'feste ID: kein Doppel');
  setTaken(t, x.id, false);
  assert.equal(caffEntries(t).length, 0);
});

test('Hinweis über BfR-Höchstmenge; Katalog vollständig mit hell/dunkel', () => {
  const withMax = SUPP_CAT.find((c) => c.max);
  assert.ok(withMax, 'mindestens ein Eintrag mit Höchstmenge');
  const x = { kind: withMax.kind, amount: withMax.max[0] * 2, unit: withMax.max[1] };
  assert.match(overNote(x), /BfR-Höchstmenge/);
  assert.equal(overNote({ ...x, amount: withMax.max[0] }), '');
  assert.equal(overNote({ kind: 'custom', amount: 1e4, unit: 'mg' }), '');
  const hex = /^#[0-9a-f]{6}$/i;
  for (const c of SUPP_CAT) {
    assert.ok(c.name && c.unit && c.form, c.kind);
    assert.match(c.c, hex, `${c.kind}: Farbe hell`);
    assert.match(c.cd, hex, `${c.kind}: Farbe dunkel`);
  }
  assert.equal(new Set(SUPP_CAT.map((c) => c.kind)).size, SUPP_CAT.length, 'eindeutige IDs');
});
