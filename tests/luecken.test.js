// 0.5.1 weitere Lücken: Tagebuch (Verdoppeln, Uhrzeit je Mahlzeit), Woche/Monat, Wochenrückblick, Ziel-Formular und
// -Historie, Lebensmittel-Datei, Rezept je 100 g, Kochen mit dem Vorrat, Einkaufsliste, Vorrat (Herz, Wegwerfen), Tipps.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorage } from './helpers.js';
globalThis.localStorage = new MemoryStorage();

const J = await import('../js/features/journal/journal.js');
const W = await import('../js/features/journal/week-strip.js');
const R = await import('../js/features/analyse/week-review.js');
const G = await import('../js/features/goal/goal-view.js');
const P = await import('../js/core/profile.js');
const S = await import('../js/features/food/share.js');
const C = await import('../js/features/food/custom.js');
const RF = await import('../js/features/food/recipe-food.js');
const CK = await import('../js/features/recipes/cook-view.js');
const SH = await import('../js/features/recipes/shop-view.js');
const PA = await import('../js/features/recipes/pantry.js');
const WK = await import('../js/features/recipes/week.js');
const I = await import('../js/features/intro/intro.js');

const food = { src: 'bls', id: 'bls:X1', n: 'Haferflocken', k: 370, p: 13, c: 59, f: 7, fi: 10, su: 1, fs: 0 };

test('Tagebuch: noch einmal eintragen und Uhrzeit für die ganze Mahlzeit', () => {
  const a = J.addEntry('2026-11-16', food, 50, 'breakfast');
  J.addEntry('2026-11-16', { ...food, id: 'bls:X2', n: 'Milch' }, 200, 'breakfast');
  const c = J.duplicateEntry('2026-11-16', a.id);
  assert.notEqual(c.id, a.id);
  assert.equal(J.entriesOf('2026-11-16').length, 3);
  assert.equal(J.mealTime('2026-11-16', 'breakfast'), null);
  assert.equal(J.setMealTime('2026-11-16', 'breakfast', '07:15'), 3);
  assert.equal(J.mealTime('2026-11-16', 'breakfast'), '07:15');
  assert.equal(J.entryMin(J.entriesOf('2026-11-16')[0]), 7 * 60 + 15);
  assert.throws(() => J.setMealTime('2026-11-16', 'breakfast', '25:00'));
  J.updateEntry('2026-11-16', a.id, { t: '08:00' });
  assert.equal(J.mealTime('2026-11-16', 'breakfast'), 'mixed');
  J.setMealTime('2026-11-16', 'breakfast', null);
  assert.equal(J.mealTime('2026-11-16', 'breakfast'), null);
});

test('Woche und Monat: Montag, 7 Tage, Monatsraster mit Montag-Start', () => {
  assert.equal(W.mondayOf('2026-11-15'), '2026-11-09'); // Sonntag
  assert.equal(W.mondayOf('2026-11-16'), '2026-11-16');
  assert.deepEqual(W.weekOf('2026-11-18').slice(0, 2), ['2026-11-16', '2026-11-17']);
  const m = W.monthGrid(2026, 10); // November 2026 beginnt am Sonntag
  assert.equal(m.lead, 6);
  assert.equal(m.days.length, 30);
  assert.equal(W.monthGrid(2024, 1).days.length, 29);
});

test('Wochenrückblick: Mittelwerte nur über Tage mit Essen, sichtbar Mo–Mi bis gelesen', () => {
  const rows = [{ n: 3, k: 2000, p: 100, water: 1600, wgoal: 1500, caf: 200 }, { n: 0, k: 0, p: 0, water: 500, wgoal: 1500, caf: 0 }, { n: 2, k: 1800, p: 80, water: 1500, wgoal: 1500, caf: 100 }];
  const st = R.weekStats(rows, -0.34, { water: true, caf: true });
  assert.deepEqual(st, { logged: 2, kcal: 1900, protein: 90, waterDays: 2, caf: 150, trend: -0.3 });
  assert.equal(R.weekStats(rows, null, { water: false, caf: false }).waterDays, null);
  assert.deepEqual(R.lastWeek('2026-11-18'), { start: '2026-11-09', end: '2026-11-15' });
  assert.equal(R.reviewDue('2026-11-19'), false, 'Donnerstag');
  assert.equal(R.reviewDue('2026-11-16', 0), false, 'keine Einträge');
  assert.equal(R.reviewDue('2026-11-16'), true);
  R.markRead('2026-11-16');
  assert.equal(R.reviewDue('2026-11-17'), false);
  assert.equal(R.reviewDue('2026-11-23'), true, 'neue Woche');
});

test('Ziel-Formular: Bereiche, Datum, eigene Faktoren müssen in die kcal passen', () => {
  const ok = { kcal: 2000, preset: 'dge', weight: 70, fiber: null, sugar: null, from: '2026-11-16', today: '2026-11-16' };
  assert.equal(G.checkGoalForm(ok), null);
  assert.match(G.checkGoalForm({ ...ok, kcal: 500 }), /800 und 6\.000/);
  assert.match(G.checkGoalForm({ ...ok, from: '2028-01-01' }), /ein Jahr/);
  assert.match(G.checkGoalForm({ ...ok, preset: 'custom', pf: 5, ff: 1 }), /Eiweiß/);
  assert.match(G.checkGoalForm({ ...ok, preset: 'custom', pf: 3, ff: 2, kcal: 1000 }), /mehr kcal/);
  assert.equal(G.checkGoalForm({ ...ok, preset: 'custom', pf: 1.8, ff: 0.9 }), null);
  assert.match(G.checkGoalForm({ ...ok, fiber: 5 }), /Ballaststoffe/);
});

test('Ziel-Historie: ab Datum, löschen und zurücklegen', () => {
  P.setGoal({ from: '2026-11-01', goal: 2000, preset: 'dge', weight: 70 });
  P.setGoal({ from: '2026-11-20', goal: 1900, preset: 'custom', pf: 1.8, ff: 0.9, weight: 70, fiber: 35 });
  assert.equal(P.getGoals('2026-11-19').goal, 2000);
  const g = P.getGoals('2026-11-21');
  assert.deepEqual([g.goal, g.preset, g.pf, g.fiber, g.protein], [1900, 'custom', 1.8, 35, 126]);
  const gone = P.removeGoal('2026-11-20');
  assert.equal(P.getGoals('2026-11-21').goal, 2000);
  P.restoreGoal(gone);
  assert.equal(P.getGoals('2026-11-21').goal, 1900);
});

test('Lebensmittel-Datei: eigenes Format, nur Neues, Fehlerhaftes übersprungen', () => {
  C.saveCustom(C.makeCustom({ n: 'Riegel', k: 355, p: 30, c: 35, f: 10, fi: 3, su: 8 }, 'custom:a1'));
  const d = S.buildFoods();
  assert.equal(d.kind, 'foods');
  assert.equal(d.custom.length, 1);
  assert.throws(() => S.parseFoods('{"app":"the-tracker","kind":"backup"}'), /keine Lebensmittel-Datei/);
  assert.throws(() => S.parseFoods('kein json'), /JSON/);
  const text = JSON.stringify({ ...d, custom: [...d.custom, { id: 'custom:b2', n: 'Nüsse', k: 610, p: 20, c: 10, f: 50 }, { id: 'custom:c3', n: 'x', k: 'viel' }, { id: 'nicht-erlaubt', n: 'y', k: 1 }],
    scanned: [{ barcode: '4000000000001', n: 'Skyr', k: 63, p: 11 }, { barcode: '12', n: 'kaputt', k: 10 }], favs: ['off:4000000000001', 'javascript:alert(1)'] });
  const p = S.parseFoods(text);
  assert.equal(p.skipped, 3);
  assert.deepEqual(p.favs, ['off:4000000000001']);
  const n = S.newFoods(p);
  assert.deepEqual(n.custom.map((x) => x.id), ['custom:b2'], 'Riegel ist schon da');
  const r = S.applyFoods(p, (id) => (id.startsWith('off:') ? { id, n: 'Skyr', k: 63 } : null));
  assert.deepEqual([r.custom, r.scanned, r.favs], [1, 1, 1]);
  assert.equal(S.applyFoods(p, () => null).custom, 0, 'zweites Laden fügt nichts hinzu');
});

test('Rezept je 100 g: Summe ÷ Endgewicht, Portion, Prüfungen', () => {
  const r = RF.recipeFoodFrom({ parts: [{ food, g: 100 }, { food: { k: 64, p: 3.4, c: 4.8, f: 3.5 }, g: 300 }], total: 300, portions: 2 });
  assert.equal(r.raw, 400);
  assert.equal(r.per100.k, Math.round(((370 + 192) * 100) / 300 * 10) / 10);
  assert.equal(r.serving, 150);
  assert.equal(RF.recipeFoodFrom({ parts: [{ food, g: 100 }] }).per100.k, 370, 'ohne Endgewicht = roh');
  assert.throws(() => RF.recipeFoodFrom({ parts: [] }), /mindestens eine Zutat/);
  assert.throws(() => RF.recipeFoodFrom({ parts: [{ food, g: 100 }], total: 5 }), /Endgewicht/);
  assert.throws(() => RF.recipeFoodFrom({ parts: [{ food, g: 100 }], portions: 0 }), /Portionen/);
});

test('Kochen mit dem Vorrat: alles da, fehlt 1–2, Rest weg; Sortierung nach Passung', () => {
  const rs = [{ name: 'A', st: { have: ['x'], missing: [], all: true }, s: 1 }, { name: 'B', st: { have: ['x'], missing: ['y'], all: false }, s: 2 },
    { name: 'C', st: { have: ['x'], missing: ['y', 'z', 'w'], all: false }, s: 9 }, { name: 'D', st: { have: [], missing: ['y'], all: false }, s: 9 },
    { name: 'E', st: { have: ['x'], missing: ['y', 'z'], all: false }, s: 5 }, { name: 'F', st: { have: [], missing: [], all: false }, s: 9 }];
  const out = CK.splitByPantry(rs, (r) => r.st, (r) => r.s);
  assert.deepEqual(out.all.map((x) => x.r.name), ['A']);
  assert.deepEqual(out.few.map((x) => x.r.name), ['E', 'B']);
});

test('Einkaufsliste: Text nach Gruppen, eigene Punkte ohne Doppelte, Erledigtes weg', () => {
  const t = SH.shopText([{ text: '2 Bananen', group: 'obst' }, { text: '500 g Linsen', group: 'huelsen' }, { text: '1 Gurke', group: 'gemuese' }], ['Kaffee']);
  assert.equal(t, 'Einkaufsliste\n\nGemüse\n- 1 Gurke\n\nObst\n- 2 Bananen\n\nHülsenfrüchte\n- 500 g Linsen\n\nAußerdem\n- Kaffee');
  assert.equal(SH.shopGroup('Banane'), 'obst');
  assert.equal(SH.shopGroup(null), 'sonst');
  assert.equal(WK.addExtra('Kaffee'), true);
  assert.equal(WK.addExtra('kaffee'), false);
  WK.addExtra('Tee');
  WK.toggleBought(WK.extras()[0].key);
  assert.equal(WK.clearBoughtExtras(), 1);
  assert.deepEqual(WK.extras().map((x) => x.text), ['Tee']);
});

test('Vorrat: Herz und Wegwerfen (Teil, alles, Rückgängig)', () => {
  localStorage.setItem('tt_vorrat', JSON.stringify([{ id: 'v1', n: 'Linsen', ref: 'rb:Linsen', fn: 'Linsen', qty: 500, qu: 'g', ug: 1, k: 320 },
    { id: 'v2', n: 'Riegel', ref: 'off:1', qty: 2, qu: 'pkg', ug: null, k: 450 }]));
  PA.setFav('v1', true);
  assert.equal(PA.pantryById('v1').fav, true);
  const u = PA.discard('v1', 120);
  assert.equal(PA.pantryById('v1').qty, 380);
  PA.giveBack(u);
  assert.equal(PA.pantryById('v1').qty, 500);
  assert.deepEqual(PA.discard('v2', 50), [], 'ohne Packungsgröße kein Teil');
  PA.discard('v2');
  assert.equal(PA.pantryById('v2').qty, 0);
});

test('Tipps: erst nach dem Rundgang, einmal je Tipp, abschaltbar', () => {
  assert.deepEqual(I.pendingTips('/training/fortschritt', I.introState()), [], 'Rundgang noch offen');
  I.setIntro({ tour: 'skipped' });
  assert.deepEqual(I.pendingTips('/training/fortschritt', I.introState()).map((t) => t.id), ['progress-4w']);
  I.markTip('progress-4w');
  assert.deepEqual(I.pendingTips('/training/fortschritt', I.introState()), []);
  I.resetTips();
  I.setIntro({ hints: false });
  assert.deepEqual(I.pendingTips('/training/fortschritt', I.introState()), []);
});
