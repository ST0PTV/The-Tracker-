// PIN-Sperre (0.2.6): PIN, Schein-PIN, Bereich, Sperren, „vergessen“; Schein-PIN trennt die Zyklusdaten.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorage } from './helpers.js';
import * as L from '../js/core/lock.js';
import * as C from '../js/features/cycle/cycle.js';
import { setProfile } from '../js/core/profile.js';
import { isoDate } from '../js/core/format.js';

const FOREIGN = { 'rezeptbuch-v1': '{"cycle":{"pin":"x"}}', 'ct.v1': '{}', wt_x: '1' };
const fresh = () => { globalThis.localStorage = new MemoryStorage({ ...FOREIGN }); L._resetSession(); };

test('Ohne PIN nichts gesperrt; PIN setzen entsperrt die Sitzung; nach relock gesperrt', async () => {
  fresh();
  assert.equal(L.isLocked('app'), false);
  await assert.rejects(L.setPin('pin', '12'), /4 bis 8/);
  await L.setPin('pin', '2580');
  assert.equal(L.lockSettings().on, true);
  assert.equal(L.isLocked('zyklus'), false);
  L.relock();
  assert.equal(L.isLocked('zyklus'), true);
  assert.equal(L.isLocked('app'), false, 'Standard: nur Zyklus');
  assert.equal(await L.unlock('1111'), null);
  assert.equal(await L.unlock('2580'), 'ok');
  assert.equal(L.isLocked('zyklus'), false);
  const raw = JSON.parse(localStorage.getItem('tt_lock'));
  assert.notEqual(raw.pin, '2580');
  assert.match(raw.pin, /^[0-9a-f]{64}$/);
});

test('Ganze App sperren; Schein-PIN öffnet leeren Zyklus, darf nichts umstellen', async () => {
  fresh();
  setProfile({ sex: 'f', cycle: 'yes' });
  await L.setPin('pin', '2580');
  L.setScope('app');
  const today = isoDate();
  C.setDayField(today, 'bleed', 3);
  await assert.rejects(L.setPin('decoy', '2580'), /verschieden/);
  await L.setPin('decoy', '1357');
  L.relock();
  assert.equal(L.isLocked('app'), true);
  assert.equal(await L.unlock('1357'), 'decoy');
  assert.equal(L.isDecoy(), true);
  assert.deepEqual(C.cycleDays(), {});
  C.setDayField(today, 'pain', 'Leicht');
  assert.throws(() => L.setScope('zyklus'), /richtigen PIN/);
  L.relock();
  await L.unlock('2580');
  assert.deepEqual(C.cycleDays()[today], { bleed: 3 });
  assert.equal(localStorage.getItem('rezeptbuch-v1'), FOREIGN['rezeptbuch-v1']);
});

test('PIN vergessen hebt die Sperre auf', async () => {
  fresh();
  await L.setPin('pin', '2580');
  L.relock();
  L.forgetPin();
  assert.equal(L.isLocked('zyklus'), false);
  assert.equal(L.lockSettings().on, false);
});
