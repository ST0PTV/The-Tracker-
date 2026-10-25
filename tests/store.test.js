import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorage } from './helpers.js';
import * as store from '../js/core/store.js';

store.define('demo', { a: 1 });
store.define('list', []);

const fresh = (init) => { globalThis.localStorage = new MemoryStorage(init); };

test('Keys tragen das Präfix tt_ und fremde Keys bleiben unberührt', () => {
  fresh({ 'ct.v1': '{"keep":true}', wt_settings: '{"appearance":"light"}' });
  store.init();
  store.set('demo', { a: 2 });
  assert.equal(localStorage.getItem('tt_demo'), '{"a":2}');
  assert.equal(localStorage.getItem('ct.v1'), '{"keep":true}');
  assert.equal(localStorage.getItem('wt_settings'), '{"appearance":"light"}');
  store.replaceAll({});
  assert.equal(localStorage.getItem('ct.v1'), '{"keep":true}', 'replaceAll darf fremde Apps nicht anfassen');
});

test('Standardwerte, Auffüllen neuer Felder und unbekannte Keys', () => {
  fresh();
  assert.deepEqual(store.get('demo'), { a: 1 });
  localStorage.setItem('tt_demo', '{"b":5}');
  assert.deepEqual(store.get('demo'), { a: 1, b: 5 });
  assert.throws(() => store.get('gibtsnicht'), /Unbekannter Speicher-Key/);
  assert.throws(() => store.define('demo', {}), /doppelt/);
});

test('Kaputte Daten: Standardwert, Rohtext wird aufgehoben', () => {
  fresh({ tt_list: '{kaputt' });
  assert.deepEqual(store.get('list'), []);
  assert.equal(localStorage.getItem('tt_broken_list'), '{kaputt');
  fresh({ tt_list: '{"keine":"liste"}' });
  assert.deepEqual(store.get('list'), []);
});

test('Schreibfehler wird gemeldet, replaceAll stellt den alten Stand wieder her', () => {
  fresh();
  store.set('list', [1, 2]);
  const seen = [];
  const off = store.onWriteResult((ok) => seen.push(ok));
  localStorage.full = true;
  assert.equal(store.set('list', [3]), false);
  assert.equal(store.replaceAll({ list: [9] }), false);
  localStorage.full = false;
  off();
  assert.deepEqual(store.get('list'), [1, 2]);
  assert.ok(seen.includes(false));
});

test('usageKB zählt nur eigene Keys', () => {
  fresh({ 'ct.v1': 'x'.repeat(10000) });
  assert.equal(store.usageKB(), 0);
});
