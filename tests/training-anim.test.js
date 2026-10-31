// Animationen im Trainingsbereich (Phase 4): 1:1 wie im Workout-Tracker 3.14.0 (V5) und Liste für das späte Laden.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fingerprints } from './training-fp.mjs';
import { ANIMATIONS } from '../js/features/training/anim-data.js';
import { ANIM_REFS } from '../js/features/training/anim-index.js';

const DIR = new URL('../js/features/training', import.meta.url).href;
const ORIGINAL = JSON.parse(readFileSync(new URL('./fixtures/anim-fingerprints-wt-3.14.0.json', import.meta.url), 'utf8'));

test('V5: jede Animation liefert dieselben Haltungen wie im Workout-Tracker 3.14.0', async () => {
  const now = await fingerprints(DIR);
  assert.equal(Object.keys(now).length, 121);
  const diff = Object.keys(ORIGINAL).filter((ref) => now[ref] !== ORIGINAL[ref]);
  assert.deepEqual(diff, [], `abweichend: ${diff.join(', ')}`);
  assert.deepEqual(Object.keys(now).sort(), Object.keys(ORIGINAL).sort());
});

test('anim-index.js passt zu anim-data.js (Knopf „Technik“ ohne Laden der Daten)', () => {
  assert.deepEqual([...ANIM_REFS].sort(), ANIMATIONS.map((a) => a.ref).sort());
});

test('anim-view.js lädt anim-data.js nicht statisch (spätes Laden)', () => {
  const src = readFileSync(new URL('../js/features/training/anim-view.js', import.meta.url), 'utf8');
  assert.ok(!/^import [^;]*from '\.\/anim-data\.js'/m.test(src));
  assert.match(src, /import\('\.\/anim-data\.js'\)/);
  for (const f of ['exercises-view.js', 'training-view.js', 'routine-view.js', 'pool.js', 'main.js']) {
    const s = readFileSync(new URL(`../js/features/training/${f}`, import.meta.url), 'utf8');
    assert.ok(!s.includes("from './anim-data.js'"), f);
  }
});
