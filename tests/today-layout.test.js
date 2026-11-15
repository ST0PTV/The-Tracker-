// „Heute anpassen“ (0.4.2): Reihenfolge der Karten aus tt_settings.todayOrder, robust gegen alte und fremde Werte.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorage } from './helpers.js';
globalThis.localStorage = new MemoryStorage();
import { todayOrder, TODAY_CARDS } from '../js/features/me/today-layout.js';

const STD = TODAY_CARDS.map((c) => c.key);

test('ohne gespeicherte Reihenfolge: Standard', () => {
  assert.deepEqual(todayOrder({}), STD);
  assert.deepEqual(todayOrder({ todayOrder: 'kaputt' }), STD);
});

test('gespeicherte Reihenfolge gilt; Unbekanntes und Doppeltes fällt weg', () => {
  const o = ['water', 'cycle', 'meals', 'training', 'supp', 'caff', 'alc', 'weight'];
  assert.deepEqual(todayOrder({ todayOrder: o }), o);
  assert.deepEqual(todayOrder({ todayOrder: ['neu', ...o, 'water'] }), o);
});

test('fehlende Karte (z. B. neu in einer späteren Version) kommt hinter ihren Vorgänger im Standard', () => {
  assert.deepEqual(todayOrder({ todayOrder: ['water', 'cycle', 'training', 'meals', 'caff', 'alc', 'weight'] }),
    ['water', 'cycle', 'training', 'supp', 'meals', 'caff', 'alc', 'weight']);
  // ohne Vorgänger an den Anfang, die übrigen jeweils hinter ihren Vorgänger
  assert.deepEqual(todayOrder({ todayOrder: ['weight'] }), ['cycle', 'training', 'supp', 'meals', 'water', 'caff', 'alc', 'weight']);
});
