// Woche und Einkauf (0.2.3) im Browser: Plan gefüllt, Übernehmen per Kreis, Sheet (Anderes Rezept, Tauschen),
// Alle übernehmen, Rest neu mischen, Einstellungen (Mahlzeiten, Portionen, Mengen anpassen), Einkauf (Gerichte,
// Abhaken, Filter, Grundzutaten), Rezeptseite (Einplanen, Mengenfaktor aus dem Plan), Vorschlag unter Rezepte.
// Prüft fremde Keys, Konsolenfehler, null/undefined/NaN; Screenshots hell/dunkel.
// Aufruf: node tests/browser/check-woche.mjs
import { launch, startServer, checker, outDir, BAD_TEXT } from './lib.mjs';
import { join } from 'node:path';

const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('woche');
const FOREIGN = { 'rezeptbuch-v1': '{"x":1}', 'ct.v1': '{"days":{}}', wt_x: '1' };

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
    localStorage.setItem('tt_recipes', JSON.stringify({ started: true, portions: 2 }));
  }, [appearance, FOREIGN]);
  await p.reload(); await p.waitForTimeout(300);
  await p.goto(srv.url + '/index.html#/rezepte/woche'); await p.waitForTimeout(1500);
  const shot = (name, full = false) => p.screenshot({ path: join(out, `${appearance}-${name}.png`), fullPage: full });
  const text = () => p.evaluate(() => document.body.innerText);
  const hash = () => p.evaluate(() => location.hash);
  const week = () => p.evaluate(() => JSON.parse(localStorage.getItem('tt_week') || '{}'));
  const close = async () => { while (await p.locator('.sheet').count()) { await p.locator('.sheet .sheet-close').last().click(); await p.waitForTimeout(250); } };

  // Plan
  ok(await p.locator('.wk-day').count() === 7 && await p.locator('.wk-row').count() === 21, `${appearance}: 7 Tage × 3 Mahlzeiten`);
  ok(await p.locator('.wk-row.prop').count() === 21 && /0 von 21 übernommen/.test(await text()), `${appearance}: alles Vorschläge`);
  ok(!BAD_TEXT.test(await text()), `${appearance}: Woche ohne null/undefined/NaN`);
  ok(/≈ [\d.]+ kcal/.test(await p.innerText('.wk-dh span')), `${appearance}: Tagessumme`);
  await shot('1-woche');
  await p.locator('.wk-ok').nth(0).click(); await p.locator('.wk-ok').nth(2).click(); await p.waitForTimeout(150);
  let w = await week();
  ok(Object.values(w.slots).filter((s) => s.ok).length === 2 && /2 von 21 übernommen/.test(await text()), `${appearance}: Kreis übernimmt (tt_week)`);
  ok(await p.locator('.wk-ok').nth(0).getAttribute('aria-checked') === 'true', `${appearance}: Kreis zeigt Haken`);

  // Sheet: Anderes Rezept, Tauschen
  const nameOf = (i) => p.locator('.wk-main b').nth(i).innerText();
  const n1 = await nameOf(1);
  await p.locator('.wk-main').nth(1).click(); await p.waitForTimeout(300);
  ok(await p.locator('.sheet .btn:has-text("Übernehmen")').count() === 1 && await p.locator('.wk-swap .chip').count() >= 1, `${appearance}: Sheet mit Übernehmen und Tauschen`);
  await shot('2-sheet');
  await p.click('.sheet button:has-text("Anderes Rezept")'); await p.waitForTimeout(250);
  ok((await nameOf(1)) !== n1, `${appearance}: Anderes Rezept (${n1} → ${await nameOf(1)})`);
  const a0 = await nameOf(0);
  await p.locator('.wk-main').nth(0).click(); await p.waitForTimeout(300);
  await p.locator('.wk-swap .chip').first().click(); await p.waitForTimeout(250);
  ok((await nameOf(0)) !== a0 && (await text()).includes(a0), `${appearance}: Tauschen`);
  await close();

  // Alle übernehmen, Rest neu mischen
  await p.click('.wk-bar button:has-text("Rest neu mischen")'); await p.waitForTimeout(200);
  ok(/2 von 21 übernommen/.test(await text()), `${appearance}: Mischen behält Übernommenes`);
  await p.click('.wk-bar button:has-text("Alle übernehmen")'); await p.waitForTimeout(200);
  ok(/21 von 21 übernommen/.test(await text()) && await p.locator('.wk-row.prop').count() === 0, `${appearance}: Alle übernehmen`);

  // Einstellungen
  await p.click('.wk-set .chip:has-text("Snack")'); await p.waitForTimeout(250);
  ok(await p.locator('.wk-row').count() === 28, `${appearance}: Snack dazu → 4 Zeilen pro Tag`);
  await p.click('.wk-set .chip:has-text("Snack")'); await p.waitForTimeout(250);
  const kcalFit = await p.innerText('.wk-dh span');
  await p.click('.wk-set .check-row input'); await p.waitForTimeout(200);
  ok((await week()).fit === false && !/× Menge/.test(await text()), `${appearance}: Mengen nicht anpassen → keine Faktoren (${kcalFit} → ${await p.innerText('.wk-dh span')})`);
  await p.click('.wk-set .check-row input'); await p.waitForTimeout(200);
  await p.click('.wk-set button[aria-label="Eine Portion mehr"]'); await p.waitForTimeout(150);
  ok((await week()).portions === 3, `${appearance}: Portionen für den Einkauf`);
  await shot('3-woche-voll', true);

  // Einkauf
  await p.click('.rz-sub a:has-text("Einkauf")'); await p.waitForTimeout(400);
  ok((await hash()) === '#/rezepte/einkauf' && await p.locator('.sh-dish').count() === 21, `${appearance}: Einkauf zeigt 21 Gerichte`);
  const rows = await p.locator('.sh-row').count();
  ok(rows > 15 && /3 Portionen/.test(await text()), `${appearance}: ${rows} Zutaten, 3 Portionen`);
  ok(!BAD_TEXT.test(await text()), `${appearance}: Einkauf ohne null/undefined/NaN`);
  ok(/Hast du meistens da/i.test(await text()), `${appearance}: Grundzutaten getrennt`);
  const first = await p.locator('.sh-row b').first().innerText();
  ok(/^\d|^[½¼¾]/.test(first), `${appearance}: Zeile mit Menge (${first})`);
  await p.locator('.sh-row').first().click(); await p.waitForTimeout(150);
  ok(await p.locator('.sh-row').first().getAttribute('aria-checked') === 'true' && Object.keys((await week()).bought).length === 1, `${appearance}: Abhaken`);
  await shot('4-einkauf');
  await p.click('.sh-chips .chip:has-text("Offen")'); await p.waitForTimeout(150);
  ok(await p.locator('.sh-row').count() === rows - 1, `${appearance}: Filter Offen`);
  await p.click('.sh-chips .chip:has-text("Erledigt")'); await p.waitForTimeout(150);
  ok(await p.locator('.sh-row').count() === 1, `${appearance}: Filter Erledigt`);
  await p.click('.sh-chips .chip:has-text("Alles")'); await p.waitForTimeout(150);
  await p.click('.sh-reset'); await p.waitForTimeout(150);
  ok(Object.keys((await week()).bought).length === 0, `${appearance}: Haken entfernen`);

  // Rezeptseite: Faktor aus dem Plan, Einplanen
  await p.locator('.sh-dish').first().click(); await p.waitForTimeout(400);
  ok(/#\/rezepte\/rezept\?id=/.test(await hash()), `${appearance}: Gericht öffnet Rezept`);
  const f = new URLSearchParams((await hash()).split('?')[1]).get('f');
  if (f) ok(/Laut Wochenplan/.test(await text()) && /Gekocht – [\d,]+ Portionen/.test(await text()), `${appearance}: Faktor ${f} auf der Rezeptseite`);
  await p.click('.rp-acts .chip:has-text("Einplanen")'); await p.waitForTimeout(300);
  ok(await p.locator('.wk-days .chip').count() === 7, `${appearance}: Einplanen zeigt 7 Tage`);
  await shot('5-einplanen');
  const onBefore = await p.locator('.wk-days .chip.on').count();
  await p.locator('.wk-days .chip:not(.on)').first().click(); await p.waitForTimeout(150);
  ok(await p.locator('.wk-days .chip.on').count() === onBefore + 1, `${appearance}: Tag eingeplant`);
  await close();

  // Rezepte: Vorschlag aus dem Wochenplan zuerst
  await p.evaluate(() => { const w = JSON.parse(localStorage.getItem('tt_week')); for (const s of Object.values(w.slots)) s.ok = true; localStorage.setItem('tt_week', JSON.stringify(w)); });
  await p.goto(srv.url + '/index.html#/rezepte?m=dinner'); await p.waitForTimeout(600);
  ok(/aus dem Wochenplan/.test(await p.locator('.rz-list').first().locator('.rz-row').first().innerText()), `${appearance}: geplantes Abendessen steht bei den Vorschlägen zuerst`);
  await shot('6-rezepte');

  const keys = await p.evaluate(() => ({ all: Object.keys(localStorage), rb: localStorage.getItem('rezeptbuch-v1'), ct: localStorage.getItem('ct.v1'), wt: localStorage.getItem('wt_x') }));
  ok(keys.all.every((k) => k.startsWith('tt_') || k in FOREIGN), `${appearance}: nur tt_-Keys geschrieben`);
  ok(keys.rb === FOREIGN['rezeptbuch-v1'] && keys.ct === FOREIGN['ct.v1'] && keys.wt === '1', `${appearance}: fremde Speicher unverändert`);
  ok(errs.length === 0, `${appearance}: keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
  await ctx.close();
}
await b.close(); await srv.close();
done();
