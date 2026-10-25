import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorage } from './helpers.js';
import { addEntry, updateEntry, removeEntry, restoreEntry, copyEntries, entriesOf, dayTotals, sumEntries,
  toggleFav, isFav, recent, lastGrams, makeEntry } from '../js/features/journal/journal.js';
import { ringParts } from '../js/features/journal/day-card.js';
import { kcalFloor } from '../js/core/profile.js';

const oats = { src: 'bls', id: 'bls:C133000', n: 'Hafer Flocken', k: 348, p: 13.22, c: 53.3, f: 6.65, fi: 10.98, su: 0.74, fs: 0, fe: 4.4 };
const fresh = () => { globalThis.localStorage = new MemoryStorage({ 'ct.v1': '{"fremd":1}' }); };

test('Eintragen: Kopie der Nährwerte, Summe, „Zuletzt“ mit Menge', () => {
  fresh();
  const e = addEntry('2026-10-25', oats, 60, 'breakfast');
  assert.equal(e.ref, 'bls:C133000');
  assert.equal(e.k, 348);
  assert.equal(e.fe, undefined, 'Mikronährstoffe gehören nicht in den Eintrag (später über ref)');
  assert.equal(Math.round(dayTotals('2026-10-25').k * 10) / 10, 208.8);
  assert.equal(lastGrams('bls:C133000'), 60);
  addEntry('2026-10-25', oats, 40, 'snack');
  assert.equal(recent().length, 1, 'gleiches Lebensmittel nur einmal unter „Zuletzt“');
  assert.equal(lastGrams('bls:C133000'), 40);
  assert.equal(localStorage.getItem('ct.v1'), '{"fremd":1}');
});

test('Ungültige Eingaben werden abgelehnt', () => {
  assert.throws(() => makeEntry(oats, 0, 'breakfast'), /Menge/);
  assert.throws(() => makeEntry(oats, 6000, 'breakfast'), /Menge/);
  assert.throws(() => makeEntry(oats, 50, 'brunch'), /Mahlzeit/);
});

test('Ändern, Löschen, Rückgängig; leerer Tag verschwindet aus dem Speicher', () => {
  fresh();
  const e = addEntry('2026-10-25', oats, 60, 'breakfast');
  updateEntry('2026-10-25', e.id, { grams: 100, meal: 'lunch' });
  assert.deepEqual([entriesOf('2026-10-25')[0].grams, entriesOf('2026-10-25')[0].meal], [100, 'lunch']);
  const gone = removeEntry('2026-10-25', e.id);
  assert.equal(entriesOf('2026-10-25').length, 0);
  assert.ok(!('2026-10-25' in JSON.parse(localStorage.getItem('tt_days'))));
  restoreEntry('2026-10-25', gone);
  restoreEntry('2026-10-25', gone);
  assert.equal(entriesOf('2026-10-25').length, 1, 'doppeltes Wiederherstellen legt nichts doppelt an');
});

test('Vortag übernehmen: neue IDs, optional nur eine Mahlzeit', () => {
  fresh();
  addEntry('2026-10-24', oats, 60, 'breakfast');
  addEntry('2026-10-24', oats, 30, 'snack');
  assert.equal(copyEntries('2026-10-24', '2026-10-25', 'snack'), 1);
  assert.equal(copyEntries('2026-10-24', '2026-10-25'), 2);
  const ids = entriesOf('2026-10-25').map((e) => e.id).concat(entriesOf('2026-10-24').map((e) => e.id));
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(copyEntries('2026-10-01', '2026-10-25'), 0);
});

test('Favoriten an und aus', () => {
  fresh();
  assert.equal(toggleFav(oats), true);
  assert.equal(isFav('bls:C133000'), true);
  assert.equal(toggleFav(oats), false);
  assert.equal(isFav('bls:C133000'), false);
});

test('Ring: Anteil = gegessen / Ziel, aufgeteilt nach Herkunft der kcal', () => {
  const t = sumEntries([{ ...oats, grams: 100 }]);
  const parts = ringParts(t, 2000);
  const total = parts.reduce((a, p) => a + p.len, 0);
  assert.ok(Math.abs(total - 348 / 2000) < 0.001);
  assert.deepEqual(parts.map((p) => p.cls), ['p', 'c', 'f']);
  assert.ok(Math.abs(ringParts({ k: 3000, p: 100, c: 300, f: 100 }, 2000).reduce((a, p) => a + p.len, 0) - 1) < 1e-9, 'über dem Ziel höchstens voll');
  assert.ok(ringParts({ k: 300, p: 0, c: 0, f: 0 }, 2000).some((p) => p.cls === 'o'), 'kcal ohne Makros (z. B. Alkohol) als Rest');
  assert.deepEqual(ringParts({ k: 0, p: 0, c: 0, f: 0 }, null), []);
});

test('Untergrenze: Frauen und ohne Angabe 1.200, Männer 1.500 kcal', () => {
  assert.equal(kcalFloor('f'), 1200);
  assert.equal(kcalFloor(null), 1200);
  assert.equal(kcalFloor('m'), 1500);
});
