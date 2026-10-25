import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fromBls, setFoods, searchFoods, per, fsOf, blsLiquid, isLiq, unitOf } from '../js/features/food/foods.js';
import { portionOptions, larnPortion, sliceRule } from '../js/features/food/portions.js';

const data = JSON.parse(readFileSync(new URL('../data/bls.json', import.meta.url)));
const foods = data.foods.map(fromBls);
setFoods(foods);
const byName = (n) => foods.find((f) => f.n === n);

test('BLS-Daten: Herkunft und Lizenz stehen in meta, Einträge haben Energie und Makros', () => {
  assert.match(data.meta.license, /CC BY 4\.0/);
  assert.match(data.meta.doi, /10\.25826/);
  assert.ok(foods.length > 7000);
  assert.ok(foods.every((f) => f.id.startsWith('bls:') && typeof f.k === 'number' && f.n));
});

test('Suche: Rangfolge wie im Tracker', () => {
  assert.equal(searchFoods('haferflocken')[0].n, 'Hafer Flocken', 'ohne Leerzeichen findet „Hafer Flocken“');
  assert.equal(searchFoods('Hühnerei')[0].n.startsWith('Hühnerei'), true);
  const milk = searchFoods('milch').slice(0, 5).map((f) => f.n);
  assert.ok(milk.every((n) => !/ mit /.test(n)), `Gerichte „mit …“ nicht vorn: ${milk.join(' | ')}`);
  assert.deepEqual(searchFoods('   '), []);
  assert.deepEqual(searchFoods('xyzgibtsnicht'), []);
});

test('Suche: Favoriten und eigene Lebensmittel nach vorn', () => {
  const second = searchFoods('haferflocken')[1];
  assert.equal(searchFoods('haferflocken', { favIds: new Set([second.id]) })[0].id, second.id);
  const own = { src: 'custom', id: 'c1', n: 'Meine Haferflocken', k: 370, p: 13, c: 58, f: 7 };
  assert.equal(searchFoods('haferflocken', { extra: [own] })[0].id, 'c1');
});

test('Nährwerte pro Menge und freier Zucker', () => {
  const x = per({ k: 348, p: 13.22, c: 53.3, f: 6.65, fi: 10.98, su: 0.74, fs: 0 }, 60);
  assert.equal(Math.round(x.k * 10) / 10, 208.8);
  assert.equal(fsOf({ su: 10, fs: 12 }), 10, 'freier Zucker höchstens Gesamtzucker');
  assert.equal(fsOf({ su: 10 }), 10, 'ohne Angabe konservativ = Gesamtzucker');
});

test('Flüssigkeiten in ml', () => {
  const milk = foods.find((f) => /^Vollmilch frisch/.test(f.n));
  assert.ok(milk && blsLiquid(milk.id, milk.n), `Milch ist flüssig (${milk && milk.n})`);
  assert.equal(unitOf(byName('Hafer Flocken')), 'g');
  assert.equal(blsLiquid('bls:M882000', 'Vollmilchpulver'), false, 'Milchpulver ist fest');
  assert.equal(isLiq({ liq: true }), true);
  assert.equal(blsLiquid('custom:1', 'Saft'), false, 'nur BLS wird automatisch erkannt');
});

test('Portionen nach LARN', () => {
  const oats = byName('Hafer Flocken');
  assert.deepEqual(portionOptions(oats, foods).map((o) => o.grams), [30], 'Flocken: 30 g');
  const egg = foods.find((f) => /^Hühnerei roh|^Hühnerei$/.test(f.n));
  if (egg) assert.equal(larnPortion(egg).grams, 50);
  assert.equal(larnPortion({ id: 'custom:1', n: 'Reis' }), null, 'nur BLS-Lebensmittel');
  // Gegart: Portion aus dem rohen Gegenstück über das kcal-Verhältnis
  const cooked = foods.find((f) => f.id[4] === 'C' && /, gekocht$/.test(f.n) && foods.some((r) => r.n === f.n.replace(/, gekocht$/, ', roh')));
  if (cooked) {
    const opt = portionOptions(cooked, foods)[0];
    assert.match(opt.label, /gegart/);
    assert.ok(opt.grams > 80, `gegart schwerer als 80 g roh (${cooked.n}: ${opt.grams} g)`);
  }
});

test('Scheibengewicht nur für Wurst, Aufschnitt und Käse', () => {
  assert.equal(sliceRule({ id: 'bls:W100000', n: 'Salami' })[1], 9);
  assert.equal(sliceRule({ id: 'bls:M100000', n: 'Gouda 45 %' })[1], 25);
  assert.equal(sliceRule({ id: 'bls:C100000', n: 'Gouda' }), null, 'falsche Hauptgruppe');
  assert.equal(sliceRule({ id: 'bls:W100000', n: 'Salami gerieben' }), null);
});
