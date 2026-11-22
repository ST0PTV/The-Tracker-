// Labor „Gemüsemonster“ (labor/gemuesemonster): Berechnung des Level-Systems.
// Das Labor ist nicht Teil der App; der Test hält es nur lauffähig.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('Labor Level-System: Berechnungstests bestehen', () => {
  const file = fileURLToPath(new URL('../labor/gemuesemonster/tests/test_level.js', import.meta.url));
  const r = spawnSync(process.execPath, [file], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Alle Tests bestanden/);
});
