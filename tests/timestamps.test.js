// Zeitstempel ab 0.2.5 (Vorbereitung Level-System): Journal at, eigene Lebensmittel created/updated/filled,
// Scan scannedAt, Lebensmittel-Ereignisse, eigene Rezepte. Keine echten Daten, nur erfundene Werte.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorage } from './helpers.js';
import * as store from '../js/core/store.js';
import { addEntry, addQuick, updateEntry, updateQuick, removeEntry, restoreEntry, copyEntries, entriesOf, setLinkedEntry, makeEntry } from '../js/features/journal/journal.js';
import { makeCustom, saveCustom, customById } from '../js/features/food/custom.js';
import { fetchProduct, offCache } from '../js/features/food/off.js';
import { foodEvents } from '../js/features/food/events.js';
import * as R from '../js/features/recipes/recipes.js';

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const FOOD = { src: 'bls', id: 'bls:X', n: 'Testbrot', k: 250, p: 8, c: 45, f: 3, fi: 6, su: 2, fs: 0 };
const fresh = () => { globalThis.localStorage = new MemoryStorage({ 'ct.v1': '{"x":1}', wt_a: '1' }); };
const later = () => new Promise((r) => setTimeout(r, 5));

test('Journal: at beim Anlegen, bleibt bei Ändern, Rückgängig, Wiederherstellen; Kopie bekommt ein neues at', async () => {
  fresh();
  const e = addEntry('2026-10-01', FOOD, 80, 'breakfast');
  assert.match(e.at, ISO);
  await later();
  updateEntry('2026-10-01', e.id, { grams: 120, meal: 'lunch', t: '12:10' });
  assert.equal(entriesOf('2026-10-01')[0].at, e.at, 'Ändern behält at');
  const q = addQuick('2026-10-01', 300, 'snack', 'Kuchen');
  assert.match(q.at, ISO);
  updateQuick('2026-10-01', q.id, { kcal: 350, name: 'Kuchen', meal: 'snack' });
  assert.equal(entriesOf('2026-10-01').find((x) => x.id === q.id).at, q.at);
  const gone = removeEntry('2026-10-01', e.id);
  restoreEntry('2026-10-01', gone);
  assert.equal(entriesOf('2026-10-01').find((x) => x.id === e.id).at, e.at, 'Wiederherstellen behält at');
  await later();
  copyEntries('2026-10-01', '2026-10-02');
  const copies = entriesOf('2026-10-02');
  assert.equal(copies.length, 2);
  assert.ok(copies.every((c) => ISO.test(c.at) && c.at > e.at), 'Kopie = neuer Eintrag mit neuem at');
  // Verknüpfter Eintrag (z. B. Koffein): Ersetzen behält at
  setLinkedEntry('2026-10-01', 'caff:1', makeEntry(FOOD, 200, 'snack'));
  const l1 = entriesOf('2026-10-01').find((x) => x.link === 'caff:1');
  await later();
  setLinkedEntry('2026-10-01', 'caff:1', makeEntry(FOOD, 250, 'snack'));
  const l2 = entriesOf('2026-10-01').find((x) => x.link === 'caff:1');
  assert.equal(l2.grams, 250);
  assert.equal(l2.at, l1.at);
  // Alte Einträge ohne at bleiben ohne at
  store.update('days', (d) => { d['2026-09-01'] = [{ ...FOOD, id: 'alt', meal: 'lunch', grams: 100, ref: 'bls:X' }]; });
  updateEntry('2026-09-01', 'alt', { grams: 150 });
  assert.equal(entriesOf('2026-09-01')[0].at, undefined, 'nichts erfunden');
  assert.equal(localStorage.getItem('ct.v1'), '{"x":1}');
});

test('Eigene Lebensmittel: created/updated, filled nur für vorher fehlende Angaben, Ereignisse', async () => {
  fresh();
  const a = saveCustom(makeCustom({ n: 'Proteinriegel', k: 380, p: 30, c: null, f: 12, fi: null, su: null }));
  assert.match(a.created, ISO);
  assert.equal(a.updated, a.created);
  assert.deepEqual(a.miss, ['c', 'fi', 'su']);
  await later();
  const b = saveCustom(makeCustom({ n: 'Proteinriegel', k: 380, p: 30, c: 40, f: 12, fi: null, su: 5 }, a.id));
  assert.equal(b.created, a.created, 'created bleibt');
  assert.ok(b.updated > a.updated, 'updated neu');
  assert.equal(b.filled.length, 1);
  assert.deepEqual(b.filled[0].keys.sort(), ['c', 'su']);
  await later();
  const c = saveCustom(makeCustom({ n: 'Proteinriegel XL', k: 400, p: 30, c: 40, f: 12, fi: null, su: 5 }, a.id));
  assert.equal(c.filled.length, 1, 'Ändern ohne Nachtrag schreibt kein filled');
  assert.deepEqual(customById(a.id).filled, c.filled);
  assert.deepEqual(foodEvents().map((x) => x.kind), ['custom', 'fill']);
  // Älteres Lebensmittel ohne created
  store.update('custom', (l) => { l.push({ src: 'custom', id: 'custom:alt', n: 'Alt', k: 100, p: 0, c: 0, f: 0, fi: 0, su: 0 }); });
  const d = saveCustom(makeCustom({ n: 'Alt', k: 110, p: 0, c: 0, f: 0, fi: 0, su: 0 }, 'custom:alt'));
  assert.equal(d.created, undefined);
  assert.match(d.updated, ISO);
});

test('Scan: scannedAt beim ersten Abruf, Ereignis bleibt; aus dem Speicher kein neues Ereignis', async () => {
  fresh();
  const ok = async () => ({ status: 200, json: async () => ({ status: 1, product: { product_name: 'Müsli', nutriments: { 'energy-kcal_100g': 380, proteins_100g: 9, carbohydrates_100g: 60, fat_100g: 8, sugars_100g: 12, fiber_100g: 7 } } }) });
  const r = await fetchProduct('4000000000001', { fetchFn: ok });
  assert.match(r.food.scannedAt, ISO);
  assert.equal(offCache()['4000000000001'].scannedAt, r.food.scannedAt);
  await fetchProduct('4000000000001', { fetchFn: ok });
  assert.deepEqual(foodEvents().map((x) => [x.kind, x.ref]), [['scan', '4000000000001']]);
});

test('Eigene Rezepte: created und updated; Backup (snapshot → replaceAll) behält alle Felder', async () => {
  fresh();
  const form = { name: 'Testsuppe', portions: 2, rows: [{ amount: '400', unit: 'g', name: 'Zauberknolle', kcal100: '80' }], meals: ['lunch'], steps: 'Kochen' };
  const r1 = R.saveOwn(form);
  assert.match(r1.created, ISO);
  await later();
  const r2 = R.saveOwn({ ...form, id: r1.id, name: 'Testsuppe 2' });
  assert.equal(r2.created, r1.created);
  assert.ok(r2.updated > r1.updated);
  addEntry('2026-10-03', FOOD, 50, 'lunch');
  saveCustom(makeCustom({ n: 'X', k: 10, p: null, c: 1, f: 0, fi: 0, su: 0 }));
  const snap = JSON.parse(JSON.stringify(store.snapshot()));
  fresh();
  store.replaceAll(snap);
  assert.match(entriesOf('2026-10-03')[0].at, ISO);
  assert.match(R.rs().own[0].created, ISO);
  assert.equal(foodEvents().length, 1);
  assert.match(store.get('custom')[0].created, ISO);
});
