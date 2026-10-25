import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorage } from './helpers.js';
import { mapOffProduct, offDiet, offSliceG, fetchProduct, validCode, scannedFoods } from '../js/features/food/off.js';
import { makeCustom, saveCustom, customFoods, removeCustom } from '../js/features/food/custom.js';
import { parseNutritionText } from '../js/features/food/ocr.js';

const offReply = (over = {}) => ({
  status: 1,
  product: {
    product_name_de: 'Haferkekse', brands: 'Testmarke, Zweitmarke', quantity: '200 g', serving_quantity: 25, product_quantity: 200,
    ingredients_analysis_tags: ['en:vegetarian'], allergens_tags: ['en:gluten', 'en:milk'], additives_tags: ['en:e955'],
    nutriments: { 'energy-kcal_100g': 450, proteins_100g: 7, carbohydrates_100g: 65, fat_100g: 17, sugars_100g: 22 },
    ...over
  }
});

test('Open Food Facts → Lebensmittel: Werte, Marke, Ernährung, Süßstoff, fehlende Angaben', () => {
  const f = mapOffProduct('4001234567890', offReply());
  assert.equal(f.id, 'off:4001234567890');
  assert.equal(f.n, 'Haferkekse');
  assert.equal(f.brand, 'Testmarke');
  assert.deepEqual([f.k, f.p, f.c, f.f, f.su, f.fi], [450, 7, 65, 17, 22, 0]);
  assert.deepEqual(f.miss, ['fi'], 'fehlende Ballaststoffe als „keine Angabe“ markiert');
  assert.deepEqual([f.d, f.a], [1, ['gl', 'mi']]);
  assert.deepEqual(f.sw, ['Sucralose']);
  assert.equal(f.liq, false);
  assert.equal(f.serving, 25);
});

test('Open Food Facts: nur kJ, Getränk in ml, ohne Produkt oder Brennwert', () => {
  const kj = mapOffProduct('1', offReply({ nutriments: { energy_100g: 1884, fat_100g: 0 }, quantity: '1,5 l' }));
  assert.equal(Math.round(kj.k), 450, '1884 kJ / 4,184 = 450 kcal');
  assert.equal(kj.liq, true);
  assert.equal(mapOffProduct('1', { status: 0 }), null);
  assert.equal(mapOffProduct('1', offReply({ nutriments: { fat_100g: 3 } })), null);
  assert.equal(mapOffProduct('1', offReply({ product_name_de: '', product_name: '' })).n, 'Produkt 1');
});

test('Ernährungsform und Scheibengewicht', () => {
  assert.deepEqual(offDiet({ ingredients_analysis_tags: ['en:vegan'] }), { d: 2, a: [] });
  assert.deepEqual(offDiet({}), { d: null, a: null }, 'unbekannt bleibt unbekannt');
  assert.equal(offSliceG('2 Scheiben (25 g)'), 12.5);
  assert.equal(offSliceG('30 g'), null);
});

test('Barcode prüfen: 8, 12 oder 13 Ziffern', () => {
  assert.equal(validCode('4001234567890'), '4001234567890');
  assert.equal(validCode('4001 2345 6789 0'), '4001234567890');
  assert.equal(validCode('12345678'), '12345678');
  assert.equal(validCode('123'), false);
  assert.equal(validCode(''), false);
});

test('fetchProduct: eigenes zuerst, dann Speicher, dann Netz; unbekannt und offline', async () => {
  globalThis.localStorage = new MemoryStorage({ 'ct.v1': '{"fremd":1}' });
  let calls = 0;
  const ok = async () => { calls++; return { status: 200, json: async () => offReply() }; };
  const own = [{ src: 'custom', id: 'custom:1', barcode: '111', n: 'Eigen', k: 1 }];
  assert.equal((await fetchProduct('111', { own, fetchFn: ok })).food.id, 'custom:1');
  assert.equal(calls, 0);
  assert.equal((await fetchProduct('4001234567890', { fetchFn: ok })).food.n, 'Haferkekse');
  assert.equal((await fetchProduct('4001234567890', { fetchFn: ok })).food.n, 'Haferkekse');
  assert.equal(calls, 1, 'zweiter Scan aus dem Speicher, ohne Netz');
  assert.equal(scannedFoods().length, 1);
  assert.deepEqual(await fetchProduct('2', { fetchFn: async () => ({ status: 404, json: async () => ({}) }) }), { missing: true });
  assert.deepEqual(await fetchProduct('3', { fetchFn: async () => ({ status: 200, json: async () => ({ status: 0 }) }) }), { missing: true });
  assert.deepEqual(await fetchProduct('4', { fetchFn: async () => { throw new Error('offline'); } }), { offline: true });
  assert.equal(localStorage.getItem('ct.v1'), '{"fremd":1}');
});

test('Eigenes Lebensmittel: Pflichtfelder, Grenzen, fehlende Werte markiert', () => {
  globalThis.localStorage = new MemoryStorage();
  assert.throws(() => makeCustom({ n: '', k: 100 }), /Namen/);
  assert.throws(() => makeCustom({ n: 'X', k: 1200 }), /kcal/);
  assert.throws(() => makeCustom({ n: 'X', k: 100, p: 140 }), /Eiweiß/);
  assert.throws(() => makeCustom({ n: 'X', k: 100, c: 10, su: 20 }), /Zucker/);
  const f = makeCustom({ n: ' Kekse ', k: 450, p: 7, c: 65, f: 17, su: null, fi: null, barcode: '4001234567890', ns: 'foto' });
  assert.equal(f.n, 'Kekse');
  assert.deepEqual(f.miss, ['fi', 'su']);
  assert.equal(f.ns, 'foto');
  saveCustom(f);
  saveCustom({ ...f, k: 460 });
  assert.equal(customFoods().length, 1, 'gleiche ID ersetzt');
  assert.equal(customFoods()[0].k, 460);
  removeCustom(f.id);
  assert.equal(customFoods().length, 0);
});

test('Nährwerttabelle lesen: Komma, Portionsspalte, nur kJ, Lesefehler', () => {
  const full = parseNutritionText('Brennwert 1580 kJ / 375 kcal 474 kJ / 113 kcal\nFett 7,0 g 2,1 g\ndavon gesättigte Fettsäuren 1,2 g 0,4 g\nKohlenhydrate 60 g 18 g\ndavon Zucker 1,0 g 0,3 g\nBallaststoffe 10 g 3,0 g\nEiweiß 13 g 3,9 g\nSalz 0,02 g 0,01 g');
  assert.deepEqual([full.k, full.f, full.sf, full.c, full.su, full.fi, full.p, full.sa], [375, 7, 1.2, 60, 1, 10, 13, 0.02]);
  assert.equal(full.fit, true);
  const kjOnly = parseNutritionText('Energie 1690 kJ\nFett 20 g\nKohlenhydrate 50 g\nEiweiß 8 g');
  assert.equal(kjOnly.kjOnly, true);
  assert.equal(kjOnly.k, Math.round(1690 / 4.184));
  const nothing = parseNutritionText('Zutaten: Weizenmehl, Zucker, Butter');
  assert.deepEqual(nothing.found, []);
  // „g“ als 9 gelesen: 24,09 → 24,0 (passt zum Brennwert)
  const misread = parseNutritionText('Brennwert 412 kcal\nFett 24,09\nKohlenhydrate 42,0 g\ndavon Zucker 30,0 g\nEiweiß 6,0 g');
  assert.equal(misread.f, 24);
});
