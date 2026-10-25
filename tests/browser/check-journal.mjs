// Journal im Browser: Ziel setzen, Lebensmittel suchen, Portion mehrfach tippen, eintragen, bearbeiten,
// löschen mit Rückgängig, Vortag übernehmen. Prüft Zahlen, Konsolenfehler und fremde Keys; Screenshots hell/dunkel.
// Aufruf: node tests/browser/check-journal.mjs
import { launch, startServer, checker, outDir, BAD_TEXT } from './lib.mjs';
import { join } from 'node:path';

const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('journal');

for (const appearance of ['dark', 'light']) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(srv.url + '/index.html');
  await p.evaluate((a) => { localStorage.clear(); localStorage.setItem('ct.v1', '{"fremd":1}'); localStorage.setItem('tt_settings', JSON.stringify({ appearance: a })); }, appearance);
  await p.reload(); await p.waitForTimeout(300);
  const shot = (name) => p.screenshot({ path: join(out, `${appearance}-${name}.png`) });
  const text = () => p.evaluate(() => document.body.innerText);

  // Ohne Ziel: Hinweis und Knopf
  ok((await text()).includes('Kein Tagesziel festgelegt'), `${appearance}: ohne Ziel neutraler Hinweis`);
  await shot('1-leer');

  // Ziel 2000 kcal, 70 kg, Ausgewogen; Untergrenzen-Hinweis bei 1100
  await p.goto(srv.url + '/index.html#/ich/ziel'); await p.waitForTimeout(200);
  await p.fill('input[aria-label="Kalorienziel"]', '1100');
  ok(await p.locator('.warn').isVisible(), `${appearance}: Hinweis unter der Untergrenze sichtbar`);
  await p.fill('input[aria-label="Kalorienziel"]', '2000');
  ok(!(await p.locator('.warn').isVisible()), `${appearance}: kein Hinweis bei 2000 kcal`);
  await p.fill('input[aria-label="Körpergewicht"]', '70');
  await p.click('button:has-text("Speichern")'); await p.waitForTimeout(200);

  // Frühstück: Haferflocken suchen, Portion zweimal tippen (2 × 30 g = 60 g)
  await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(200);
  await p.click('button[aria-label="Frühstück hinzufügen"]'); await p.waitForTimeout(300);
  await p.waitForFunction(() => /Bundeslebensmittelschlüssel/.test(document.body.innerText), null, { timeout: 8000 });
  await p.fill('input[aria-label="Lebensmittel suchen"]', 'haferflocken'); await p.waitForTimeout(200);
  const first = await p.locator('.sheet .results .row b').first().innerText();
  ok(/Hafer Flocken/.test(first), `${appearance}: „haferflocken“ findet zuerst Hafer Flocken (${first})`);
  await shot('2-suche');
  await p.locator('.sheet .results .row').first().click(); await p.waitForTimeout(300);
  const chip = p.locator('.sheet .chip', { hasText: '30 g' }).first();
  await chip.click(); await chip.click(); await p.waitForTimeout(100);
  ok((await p.inputValue('.sheet input[aria-label="Menge in g"]')) === '60', `${appearance}: zweimal Portion = 60 g`);
  await shot('3-menge');
  await p.click('.sheet button:has-text("Eintragen")'); await p.waitForTimeout(400);
  ok(await p.locator('.sheet').count() === 0, `${appearance}: Sheets nach dem Eintragen zu`);

  // Hafer Flocken 348 kcal/100 g × 60 g = 208,8 → 209 gegessen, 1.791 übrig
  let t = await text();
  ok(t.includes('1.791') && t.includes('kcal übrig'), `${appearance}: Ring zeigt 1.791 kcal übrig`);
  ok(t.includes('209 kcal'), `${appearance}: Frühstück zeigt 209 kcal`);
  ok(!BAD_TEXT.test(t), `${appearance}: kein null/undefined/NaN`);
  ok(await p.locator('.meal-toggle:has-text("Frühstück")').getAttribute('aria-expanded') === 'true', `${appearance}: Mahlzeit nach dem Eintragen aufgeklappt`);
  const fit = await p.evaluate(() => { const c = document.querySelector('.ring-c small').getBoundingClientRect(), r = document.querySelector('.ring').getBoundingClientRect(); const cx = r.x + r.width / 2, cy = r.y + r.height / 2, rad = r.width / 2 - 14; const pts = [[c.left, c.top], [c.right, c.top], [c.left, c.bottom], [c.right, c.bottom]]; return pts.every(([x, y]) => Math.hypot(x - cx, y - cy) <= rad); });
  ok(fit, `${appearance}: Ring-Beschriftung liegt innerhalb des Rings`);
  await shot('4-journal');

  // Bearbeiten: 100 g → 348 kcal; dann löschen und rückgängig
  await p.locator('.entry').first().click(); await p.waitForTimeout(250);
  await p.fill('.sheet input[aria-label="Menge in g"]', '100');
  await p.click('.sheet button:has-text("Speichern")'); await p.waitForTimeout(300);
  ok((await text()).includes('348 kcal'), `${appearance}: geänderte Menge ergibt 348 kcal`);
  await p.locator('.entry').first().click(); await p.waitForTimeout(250);
  await p.click('.sheet button:has-text("Eintrag löschen")'); await p.waitForTimeout(250);
  ok(!(await text()).includes('348 kcal'), `${appearance}: Eintrag gelöscht`);
  await p.click('.toast-act'); await p.waitForTimeout(250);
  ok((await text()).includes('348 kcal'), `${appearance}: Rückgängig stellt den Eintrag wieder her`);

  // Nächster Tag: Frühstück wie am Vortag
  await p.click('button[aria-label="Nächster Tag"]'); await p.waitForTimeout(200);
  ok((await text()).includes('Morgen'), `${appearance}: Tageswechsel auf Morgen`);
  await p.click('button:has-text("Wie am Vortag")'); await p.waitForTimeout(250);
  ok((await text()).includes('348 kcal'), `${appearance}: Vortag übernommen`);
  await shot('5-morgen');

  const keys = await p.evaluate(() => Object.keys(localStorage));
  ok(keys.every((k) => k.startsWith('tt_') || k === 'ct.v1'), `${appearance}: nur eigene Keys (${keys.join(', ')})`);
  ok(await p.evaluate(() => localStorage.getItem('ct.v1')) === '{"fremd":1}', `${appearance}: ct.v1 unverändert`);
  ok(errs.length === 0, `${appearance}: keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

console.log(`Screenshots: ${out}`);
await b.close(); await srv.close();
done();
