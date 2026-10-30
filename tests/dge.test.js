// DGE-Tabelle und „reich an dem, was fehlt“ (0.3.0).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../js/features/analyse/dge.js';

test('Person aus dem Profil: Alter ab 15, sonst 30; Wechseljahre aus Phase oder Regel nein ab 51', () => {
  assert.deepEqual(D.dgePerson({ sex: 'f', birthYear: 1995, cycle: 'yes' }, {}, 2026), { male: false, age: 31, cycle: 'yes', post: false });
  assert.equal(D.dgePerson({}, {}, 2026).age, 30);
  assert.equal(D.dgePerson({ birthYear: 2020 }, {}, 2026).age, 30);
  assert.equal(D.dgePerson({ sex: 'f', birthYear: 1970, cycle: 'no' }, {}, 2026).post, true);
  assert.equal(D.dgePerson({ sex: 'f', birthYear: 1990, cycle: 'yes' }, { phase: 'wechsel' }, 2026).post, true);
});

test('Referenzwerte: Eisen nach Regel, Magnesium/Zink/Calcium nach Alter und Geschlecht', () => {
  const f = D.dgePerson({ sex: 'f', birthYear: 1995, cycle: 'yes' }, {}, 2026);
  const m = D.dgePerson({ sex: 'm', birthYear: 1995 }, {}, 2026);
  assert.equal(D.dgeRef('fe', f), 16); assert.equal(D.dgeRef('fe', m), 11);
  assert.equal(D.dgeRef('fe', { ...f, cycle: 'no' }), 11); assert.equal(D.dgeRef('fe', { ...f, post: true }), 14);
  assert.equal(D.dgeRef('mg', f), 300); assert.equal(D.dgeRef('mg', { ...m, age: 17 }), 330);
  assert.equal(D.dgeRef('zn', f), 8); assert.equal(D.dgeRef('ca', { ...f, age: 16 }), 1200);
  assert.match(D.dgeNote('fe', f), /Regelblutung/);
  assert.equal(D.dgeRef('fe', { ...f, age: 70 }), 14);
  assert.deepEqual(Object.keys(D.DGE).sort(), [...D.DGE_ORDER].sort());
});

test('Reichtum: Verhältnis Anteil am Tageswert zu Anteil an kcal; fehlender Wert zählt nicht', () => {
  // 500 kcal von 2000 = 25 %; 8 mg Eisen von 16 = 50 % → 2
  assert.equal(D.richness({ kcal: 500, fe: 8, miss_fe: 0 }, 'fe', 16, 2000), 2);
  assert.equal(D.richness({ kcal: 500, fe: 8, miss_fe: 1 }, 'fe', 16, 2000), null);
  assert.equal(D.richness({ kcal: 0, fe: 8 }, 'fe', 16, 2000), null);
});

test('Bonus begrenzt, Schilder ab 1,5×, Tagesschnitt aus dem Plan', () => {
  const p = D.dgePerson({ sex: 'f', birthYear: 1995, cycle: 'yes' }, {}, 2026);
  const rich = { kcal: 500, fe: 8, vd: 0.5, miss_fe: 0, miss_vd: 0 };
  assert.equal(D.deficitBonus(rich, ['fe'], p, 2000), 2);                      // q = 2 → (2−1)·2
  assert.equal(D.deficitBonus({ kcal: 500, fe: 40 }, ['fe'], p, 2000), 4);    // gedeckelt bei 2
  assert.equal(D.deficitBonus({ kcal: 500, fe: 0 }, ['fe'], p, 2000), -2);    // gedeckelt bei −1
  assert.deepEqual(D.richTags(rich, ['fe', 'vd'], p, 2000), ['Eisen']);
  const avg = D.planAverage([{ fe: 10 }, { fe: 12 }], ['fe'], p);
  assert.deepEqual(avg[0], { id: 'fe', name: 'Eisen', unit: 'mg', v: 11, ref: 16, pct: 69 });
});
