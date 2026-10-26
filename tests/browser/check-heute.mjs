// Heute (Entwürfe V1/V5, M2): leere Mahlzeiten ausgeblendet, Tracker-Karten leer groß / mit Eintrag kompakt,
// „+“-Menü in der Tab-Leiste (Reihenfolge, Farben), „Schnell – nur kcal“, Alkohol erst mit Eintrag sichtbar.
// Aufruf: node tests/browser/check-heute.mjs
import { launch, startServer, checker, outDir, BAD_TEXT, viaPlus } from './lib.mjs';
import { join } from 'node:path';

const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('heute');
const FOREIGN = { 'ct.v1': '{"alcohol":{"enabled":true}}', wt_x: '1', 'rezeptbuch-v1': '{}' };

for (const appearance of ['dark', 'light']) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(srv.url + '/index.html');
  await p.evaluate(([a, f]) => { localStorage.clear(); for (const [k, v] of Object.entries(f)) localStorage.setItem(k, v); localStorage.setItem('tt_settings', JSON.stringify({ appearance: a })); localStorage.setItem('tt_profile', JSON.stringify({ sex: 'f', weightKg: 64, heightCm: 168 })); }, [appearance, FOREIGN]);
  await p.reload(); await p.waitForTimeout(300);
  const shot = (name, full = false) => p.screenshot({ path: join(out, `${appearance}-${name}.png`), fullPage: full });
  const text = () => p.evaluate(() => document.body.innerText);
  const close = async () => { while (await p.locator('.sheet').count()) { await p.locator('.sheet .sheet-close').last().click(); await p.waitForTimeout(300); } };

  // Leerer Tag
  let t = await text();
  ok(await p.locator('.card.meal').count() === 0 && t.includes('Mahlzeiten erscheinen mit dem ersten Eintrag'), `${appearance}: ohne Einträge keine Mahlzeit-Karten, kurzer Hinweis`);
  ok(await p.locator('.trk.alc').count() === 0, `${appearance}: Alkohol-Karte erst mit Eintrag`);
  ok(await p.locator('.trk:not(.on) .trk-div .trk-plus').count() === 2, `${appearance}: Wasser und Koffein leer mit „+“ auf der Linie`);
  ok(await p.locator('.trk.weight.on').count() === 1, `${appearance}: Gewicht aus dem Profil → kompakte Karte`);
  await shot('1-leer', true);

  // „+“-Menü
  ok(await p.locator('.tabbar .tab-plus').count() === 1 && await p.locator('.tabbar .tab').count() === 4, `${appearance}: „+“ mittig in der Tab-Leiste`);
  await p.click('.tab-plus'); await p.waitForTimeout(300);
  const rows = await p.locator('.qa-grp').nth(1).locator('.qa-row b').allInnerTexts();
  ok(rows.join(',') === 'Wasser,Supplements,Koffein,Alkohol,Gewicht', `${appearance}: Tracker-Reihenfolge (${rows.join(', ')})`);
  ok((await p.locator('.qa-grp').first().locator('.qa-row b').allInnerTexts()).join(',') === 'Lebensmittel,Scannen,Schnell', `${appearance}: Gruppe Essen`);
  const badges = await p.locator('.qa-grp').nth(1).locator('.qa-badge').evaluateAll((l) => l.map((b) => getComputedStyle(b).color));
  ok(new Set(badges).size === 5, `${appearance}: Farbe je Tracker im Menü (${new Set(badges).size} Farben)`);
  ok(await p.locator('.qa-meal [aria-checked="true"]').count() === 1, `${appearance}: Mahlzeit vorgewählt`);
  await shot('2-menu');
  await close();

  // Schnell – nur kcal
  await viaPlus(p, 'Schnell', 'Snacks');
  await p.fill('.sheet input[aria-label="Energie in kcal"]', '250');
  await p.fill('.sheet input[aria-label="Bezeichnung"]', 'Kuchen');
  await p.click('.sheet button:has-text("Eintragen")'); await p.waitForTimeout(300);
  t = await text();
  ok(await p.locator('.card.meal').count() === 1 && t.includes('Kuchen') && t.includes('250 kcal'), `${appearance}: Snacks erscheinen mit dem Schnell-Eintrag`);
  ok(t.includes('nur kcal'), `${appearance}: Eintrag als „nur kcal“ gekennzeichnet`);
  await p.locator('.entry:has-text("Kuchen")').click(); await p.waitForTimeout(250);
  await p.fill('.sheet input[aria-label="Energie in kcal"]', '300');
  await p.click('.sheet button:has-text("Speichern")'); await p.waitForTimeout(300);
  ok((await text()).includes('300 kcal'), `${appearance}: Schnell-Eintrag bearbeitet`);

  // Alkohol über das Menü
  await viaPlus(p, 'Alkohol');
  await p.locator('.sheet .caf-pick .row').nth(1).click(); await p.waitForTimeout(150); // Pils 0,5 l
  await p.fill('.sheet input[aria-label="Uhrzeit"]', '00:10'); await p.dispatchEvent('.sheet input[aria-label="Uhrzeit"]', 'change'); await p.waitForTimeout(150);
  ok(/Höchstwert ca\. [\d,]+ ‰/.test(await p.innerText('.sheet .caf-prev')), `${appearance}: Vorschau nennt den Höchstwert`);
  ok((await p.inputValue('.sheet input[aria-label="Bezeichnung"]')) === 'Pils 500 ml', `${appearance}: Name ohne Komma`);
  await shot('3-alkohol-sheet');
  await p.locator('.sheet button.primary').click(); await p.waitForTimeout(700);
  ok((await p.locator('.sheet').last().innerText()).includes('nicht geeignet, um die Fahrtüchtigkeit zu beurteilen'), `${appearance}: Warnhinweis beim ersten Getränk`);
  await close();
  ok(await p.locator('.trk.alc.on .chart-box svg').count() === 1, `${appearance}: Alkohol-Karte mit Kurve nach dem Eintrag`);
  t = await text();
  ok(t.includes('Pils 500 ml') && t.includes('190 kcal'), `${appearance}: kcal als verknüpfter Snack (${t.includes('190 kcal')})`);
  await p.click('.trk.alc'); await p.waitForTimeout(300);
  const det = await p.locator('.sheet').last().innerText();
  ok(det.includes('Schätzung') && det.includes('19 g Alkohol'), `${appearance}: Details mit Schätzung und Gramm`);
  const pkTxt = (det.match(/Höchstwert\s+([\d,]+) ‰/) || [])[1];
  ok(pkTxt && pkTxt !== '0,00', `${appearance}: Höchstwert zählt Getränke nach Mitternacht (${pkTxt} ‰)`);
  ok(!BAD_TEXT.test(det), `${appearance}: Details ohne null/NaN`);
  await shot('4-alkohol-details');
  await close();
  await p.waitForTimeout(3000);
  await shot('5-heute', true);
  const fit = await p.evaluate(() => [...document.querySelectorAll('.card')].every((c) => { const r = c.getBoundingClientRect(); return [...c.querySelectorAll('*')].every((e) => { const q = e.getBoundingClientRect(); return !q.width || (q.left >= r.left - 1 && q.right <= r.right + 1); }); }));
  ok(fit, `${appearance}: nichts ragt aus den Karten`);

  // Alkohol ausschalten → weder Karte noch Menü-Zeile
  await p.goto(srv.url + '/index.html#/ich/getraenke'); await p.waitForTimeout(250);
  await p.uncheck('input[aria-label="Alkohol im „+“-Menü (Karte erscheint mit dem ersten Eintrag)"]');
  await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(250);
  await p.click('.tab-plus'); await p.waitForTimeout(300);
  ok(await p.locator('.trk.alc').count() === 0 && await p.locator('.qa-row:has-text("Alkohol")').count() === 0, `${appearance}: ausgeschaltet ohne Karte und Menü-Zeile`);
  await close();

  const keys = await p.evaluate(() => Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])));
  ok(Object.entries(FOREIGN).every(([k, v]) => keys[k] === v), `${appearance}: fremde Keys unverändert`);
  ok(Object.keys(keys).every((k) => k.startsWith('tt_') || k in FOREIGN), `${appearance}: nur tt_-Keys geschrieben`);
  ok(errs.length === 0, `${appearance}: keine Konsolenfehler${errs.length ? ' – ' + errs.join(' | ') : ''}`);
  await ctx.close();
}
await b.close(); await srv.close();
console.log('Screenshots: ' + out);
done();
