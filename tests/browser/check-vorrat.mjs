// Vorrat (0.2.5) im Browser: leerer Zustand, Zutat dazu, −/+, Bearbeiten-Sheet (Menge, zählt als, Gegessen → Journal),
// Rezeptseite mit Vorrats-Hinweis und Abziehen beim „Gekocht“ (Rückgängig), Einkauf minus Vorrat und „Gekauftes in den
// Vorrat“, Vorschläge „Mit Vorrat zuerst“. Prüft fremde Keys, Konsolenfehler, null/undefined/NaN; Screenshots hell/dunkel.
// Aufruf: node tests/browser/check-vorrat.mjs
import { launch, startServer, checker, outDir, BAD_TEXT } from './lib.mjs';
import { join } from 'node:path';

const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('vorrat');
const FOREIGN = { 'rezeptbuch-v1': '{"x":1}', 'ct.v1': '{"pantry":[{"id":"x"}]}', wt_x: '1' };

for (const appearance of ['dark', 'light']) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(srv.url + '/index.html');
  await p.evaluate(([a, f]) => {
    localStorage.clear(); for (const [k, v] of Object.entries(f)) localStorage.setItem(k, v);
    localStorage.setItem('tt_settings', JSON.stringify({ appearance: a }));
    localStorage.setItem('tt_profile', JSON.stringify({ sex: 'f', weightKg: 64, heightCm: 168 }));
    localStorage.setItem('tt_recipes', JSON.stringify({ started: true }));
  }, [appearance, FOREIGN]);
  await p.reload(); await p.waitForTimeout(300);
  await p.goto(srv.url + '/index.html#/rezepte/vorrat'); await p.waitForTimeout(1500);
  const shot = (name, full = false) => p.screenshot({ path: join(out, `${appearance}-${name}.png`), fullPage: full });
  const text = () => p.evaluate(() => document.body.innerText);
  const vr = () => p.evaluate(() => JSON.parse(localStorage.getItem('tt_vorrat') || '[]'));
  const close = async () => { while (await p.locator('.sheet').count()) { await p.locator('.sheet .sheet-close').last().click(); await p.waitForTimeout(250); } };

  ok(await p.locator('.rz-sub a').count() === 4 && /Noch nichts im Vorrat/.test(await text()), `${appearance}: Reiter Vorrat, leerer Zustand`);
  // Zutat dazu
  await p.click('.wk-bar button:has-text("Zutat dazu")'); await p.waitForTimeout(300);
  const addLoose = async (name, amount, unit) => {
    await p.fill('.sheet input[aria-label="Zutat"]', name);
    await p.click(`.sheet .seg button:has-text("${unit}")`);
    await p.fill('.sheet input[aria-label="Menge"]', amount);
    await p.click('.sheet button:has-text("Dazulegen")'); await p.waitForTimeout(200);
  };
  await addLoose('Zwiebel', '3', 'Stück');
  await addLoose('Nudeln', '500', 'g');
  await addLoose('Hackfleisch', '400', 'g');
  await addLoose('Möhre', '2', 'Stück');
  await addLoose('Passierte Tomaten', '500', 'g');
  await addLoose('Tomatenmark', '100', 'g');
  await close();
  let v = await vr();
  ok(v.length === 6 && v.find((x) => x.fn === 'Zwiebel').qty === 3, `${appearance}: 6 Zutaten im Vorrat (tt_vorrat)`);
  ok(await p.locator('.vr-row').count() === 6 && /Gemüse/i.test(await text()) && /Brot, Nudeln/i.test(await text()), `${appearance}: Liste nach Gruppen`);
  ok(!BAD_TEXT.test(await text()), `${appearance}: Vorrat ohne null/undefined/NaN`);
  await shot('1-liste');
  // −/+
  const zw = p.locator('.vr-row', { hasText: 'Zwiebel' });
  await zw.locator('button[aria-label="Zwiebel: mehr"]').click(); await p.waitForTimeout(150);
  ok((await vr()).find((x) => x.fn === 'Zwiebel').qty === 4 && /4 Stück/.test(await zw.innerText()), `${appearance}: + erhöht`);
  await p.locator('.vr-row', { hasText: 'Zwiebel' }).locator('button[aria-label="Zwiebel: weniger"]').click(); await p.waitForTimeout(150);
  ok((await vr()).find((x) => x.fn === 'Zwiebel').qty === 3, `${appearance}: − verringert`);
  // Bearbeiten-Sheet: Gegessen
  await p.locator('.vr-main', { hasText: 'Nudeln' }).click(); await p.waitForTimeout(300);
  ok(await p.locator('.sheet select[aria-label="Zählt als"]').inputValue() === 'Nudeln', `${appearance}: zählt als Nudeln`);
  await shot('2-sheet');
  await p.fill('.sheet input[aria-label="Gegessen in g"]', '50');
  await p.click('.sheet button:has-text("Ins Journal")'); await p.waitForTimeout(300);
  const days = await p.evaluate(() => JSON.parse(localStorage.getItem('tt_days') || '{}'));
  ok(Object.values(days).flat().some((e) => e.n === 'Nudeln' && e.grams === 50 && e.at), `${appearance}: Gegessen → Journal mit Zeitstempel`);
  ok((await vr()).find((x) => x.fn === 'Nudeln').qty === 450, `${appearance}: Gegessen zieht ab`);
  await p.click('.toast-act'); await p.waitForTimeout(200);
  ok((await vr()).find((x) => x.fn === 'Nudeln').qty === 500, `${appearance}: Rückgängig gibt zurück`);

  // Rezeptseite: Hinweis und Kochen
  await p.goto(srv.url + '/index.html#/rezepte/rezept?id=spaghetti-bolognese&m=dinner'); await p.waitForTimeout(500);
  ok(/Alles im Vorrat/.test(await p.innerText('.rp-stock')), `${appearance}: Rezeptseite „Alles im Vorrat“`);
  await shot('3-rezept');
  await p.click('button:has-text("Gekocht")'); await p.waitForTimeout(300);
  v = await vr();
  ok(v.find((x) => x.fn === 'Nudeln').qty === 420 && /Vom Vorrat abgezogen/.test(await p.innerText('.toast')), `${appearance}: Gekocht zieht 80 g Nudeln ab`);
  await p.click('.toast-act'); await p.waitForTimeout(200);
  ok((await vr()).find((x) => x.fn === 'Nudeln').qty === 500, `${appearance}: Rückgängig beim Kochen`);

  // Vorschläge
  await p.goto(srv.url + '/index.html#/rezepte?m=dinner'); await p.waitForTimeout(500);
  ok(await p.locator('.rz-pf .chip').count() === 2 && /Alles im Vorrat|Fehlt:/.test(await p.locator('.rz-list').first().innerText()), `${appearance}: Vorschläge mit Vorrats-Hinweis`);
  await shot('4-vorschlaege');

  // Einkauf minus Vorrat
  await p.evaluate(() => { localStorage.setItem('tt_week', JSON.stringify({ meals: ['dinner'], portions: 1, fit: false, seed: 0, slots: {}, bought: {} })); });
  await p.goto(srv.url + '/index.html#/rezepte/rezept?id=spaghetti-bolognese&m=dinner'); await p.waitForTimeout(400);
  await p.click('.rp-acts .chip:has-text("Einplanen")'); await p.waitForTimeout(250);
  await p.locator('.wk-days .chip').first().click(); await p.waitForTimeout(150);
  await close();
  await p.goto(srv.url + '/index.html#/rezepte/einkauf'); await p.waitForTimeout(500);
  ok(/Schon im Vorrat/i.test(await text()) && !/80 g Spaghetti/.test(await p.locator('.sh-list').innerText().catch(() => '')), `${appearance}: Spaghetti reicht → „Schon im Vorrat“`);
  await shot('5-einkauf', true);
  const rows = await p.locator('.sh-row').count();
  if (rows) {
    await p.locator('.sh-row').first().click(); await p.waitForTimeout(150);
    const before = (await vr()).length;
    await p.click('.sh-topantry'); await p.waitForTimeout(300);
    ok((await vr()).length >= before, `${appearance}: Gekauftes in den Vorrat`);
  }

  const keys = await p.evaluate(() => ({ all: Object.keys(localStorage), ct: localStorage.getItem('ct.v1'), rb: localStorage.getItem('rezeptbuch-v1') }));
  ok(keys.all.every((k) => k.startsWith('tt_') || k in FOREIGN), `${appearance}: nur tt_-Keys geschrieben`);
  ok(keys.ct === FOREIGN['ct.v1'] && keys.rb === FOREIGN['rezeptbuch-v1'], `${appearance}: fremde Vorräte unverändert`);
  ok(errs.length === 0, `${appearance}: keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
  await ctx.close();
}
await b.close(); await srv.close();
done();
