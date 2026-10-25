// Getränke und Supplements im Browser: Wasser „+“ und Löschen mit Rückgängig, Koffein-Getränk mit Vorschau,
// Verlauf mit Beispieldaten, Supplement anlegen und abhaken (Farbe je Theme). Prüft Konsolenfehler und fremde Keys.
// Aufruf: node tests/browser/check-drinks.mjs
import { launch, startServer, checker, outDir, BAD_TEXT } from './lib.mjs';
import { join } from 'node:path';

const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('drinks');
const FOREIGN = { 'ct.v1': '{"fremd":1}', wt_sessions: '[1]', 'rezeptbuch-tracker': '{"x":1}' };
// Vitamin D3 im Katalog: hell #E6AC00, dunkel #FFD966
const D3 = { light: 'rgb(230, 172, 0)', dark: 'rgb(255, 217, 102)' };

for (const appearance of ['dark', 'light']) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(srv.url + '/index.html');
  await p.evaluate(([a, f]) => { localStorage.clear(); for (const [k, v] of Object.entries(f)) localStorage.setItem(k, v); localStorage.setItem('tt_settings', JSON.stringify({ appearance: a })); }, [appearance, FOREIGN]);
  await p.reload(); await p.waitForTimeout(300);
  const shot = (name, full = false) => p.screenshot({ path: join(out, `${appearance}-${name}.png`), fullPage: full });
  const text = () => p.evaluate(() => document.body.innerText);
  const bar = () => p.getAttribute('.water .w-bar', 'aria-label');

  // Wasser: 2 × „+“ (250 ml) und „+ 500 ml“ = 1.000 ml
  await p.click('button[aria-label="250 ml Wasser eintragen"]');
  await p.click('button[aria-label="250 ml Wasser eintragen"]');
  await p.click('.water .chip:has-text("+ 500 ml")'); await p.waitForTimeout(150);
  ok((await bar()) === '1.000 von 1.500 ml', `${appearance}: Wasser 1.000 von 1.500 ml (${await bar()})`);
  ok((await text()).includes('noch 0,50 l'), `${appearance}: „noch 0,50 l“`);
  await p.click('.water button[aria-label="500 ml Wasser löschen"]'); await p.waitForTimeout(150);
  ok((await bar()) === '500 von 1.500 ml', `${appearance}: nach Löschen 500 ml`);
  await p.click('.toast button:has-text("Rückgängig")'); await p.waitForTimeout(150);
  ok((await bar()) === '1.000 von 1.500 ml', `${appearance}: Rückgängig stellt 500 ml wieder her`);
  await p.click('.water .chip:has-text("Andere Menge")');
  await p.fill('input[aria-label="Andere Menge in ml"]', '5');
  await p.click('.water .code-row button:has-text("Eintragen")'); await p.waitForTimeout(150);
  ok(await p.locator('.toast.error, .toast.is-error, .toast[data-error]').count() + ((await text()).includes('10–3.000') ? 1 : 0) > 0, `${appearance}: 5 ml wird abgelehnt`);
  await p.waitForTimeout(2500);

  // Koffein: Filterkaffee aus der Liste, 08:00, eintragen
  await p.click('button[aria-label="Koffein-Getränk hinzufügen"]'); await p.waitForTimeout(250);
  ok((await text()).includes("dann erscheint die Vorschau"), `${appearance}: Sheet ohne Wahl zeigt Hinweis statt Vorschau`);
  await p.locator('.sheet .caf-pick .row').first().click(); await p.waitForTimeout(150);
  await p.fill('.sheet input[aria-label="Uhrzeit"]', '08:00'); await p.dispatchEvent('.sheet input[aria-label="Uhrzeit"]', 'change'); await p.waitForTimeout(150);
  ok(await p.locator('.sheet .caf-prev svg').count() === 1, `${appearance}: Vorschau-Kurve sichtbar`);
  ok(/Zur Bettzeit .* mg/.test(await p.innerText('.sheet .caf-prev')), `${appearance}: Vorschau nennt Pegel zur Bettzeit`);
  await shot('2-koffein-sheet');
  const mgSaved = await p.inputValue('.sheet input[aria-label="Koffein in mg"]');
  const mlSaved = Number(await p.inputValue('.sheet input[aria-label="Menge in ml"]'));
  await p.locator('.sheet button.primary').click(); await p.waitForTimeout(300);
  ok(await p.locator('.sheet').count() === 0, `${appearance}: Sheet nach Eintragen zu`);
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('tt_caffeine')));
  const day = Object.values(st.log)[0] || [];
  ok(day.length === 1 && String(day[0].mg) === mgSaved.replace(',', '.') && day[0].min === 480, `${appearance}: Getränk gespeichert (${mgSaved} mg, 08:00)`);
  ok((await bar()) === `${(1000 + mlSaved).toLocaleString('de-DE')} von 1.500 ml`, `${appearance}: Kaffee zählt zum Wasser (${await bar()})`);
  ok(await p.locator('.card.tk:has-text("Koffein") .chart-box svg').count() === 1, `${appearance}: Kurve auf der Karte`);
  let t = await text();
  ok(t.includes('jetzt im Körper') && !t.includes('(geschätzt)'), `${appearance}: Pegel ohne „(geschätzt)“`);
  ok(!BAD_TEXT.test(t), `${appearance}: kein null/undefined/NaN`);
  await shot('1-heute', true);

  // Verlauf mit Beispieldaten
  await p.evaluate(async () => {
    const { generateDemoDrinks } = await import('/js/features/dev/demo.js');
    const { loadDemoWater } = await import('/js/features/drinks/water.js');
    const { loadDemoCaffeine } = await import('/js/features/drinks/caffeine.js');
    const { isoDate } = await import('/js/core/format.js');
    const d = generateDemoDrinks({ today: isoDate() });
    loadDemoWater(d.water); loadDemoCaffeine(d.caff);
  });
  await p.waitForTimeout(200);
  await p.click('button:has-text("Verlauf (30 Tage)")'); await p.waitForTimeout(300);
  ok(await p.locator('.sheet .heat-box svg .hc').count() >= 30 * 12, `${appearance}: Heatmap mit 30 Tagen`);
  const before = await p.innerText('.sheet .heat-detail');
  await p.locator('.sheet .heat-box svg .hit').nth(3).click(); await p.waitForTimeout(150);
  ok((await p.innerText('.sheet .heat-detail')) !== before, `${appearance}: Tippen auf einen Tag wechselt die Details`);
  t = await p.innerText('.sheet');
  ok(t.includes('Ø Pegel zur Bettzeit') && !BAD_TEXT.test(t), `${appearance}: Durchschnitte ohne null/NaN`);
  await shot('3-verlauf');
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  if (await p.locator('.sheet').count()) { await p.locator('.sheet button[aria-label="Schließen"]').first().click(); await p.waitForTimeout(200); }

  // Supplements: leer → anlegen → Vitamin D3 → abhaken
  ok((await text()).includes('Noch keine angelegt.'), `${appearance}: Supplements starten leer`);
  await p.click('.supp a:has-text("Anlegen")'); await p.waitForTimeout(250);
  await p.click('button:has-text("+ Supplement hinzufügen")'); await p.waitForTimeout(250);
  await shot('4-katalog');
  await p.locator('.sheet .plain-btn:has-text("Vitamin D3")').click(); await p.waitForTimeout(300);
  ok(await p.locator('.sheet input[aria-label="Name"]').count() === 1, `${appearance}: nach Wahl öffnet die Bearbeitung`);
  await p.locator('.sheet button:has-text("Speichern")').click(); await p.waitForTimeout(250);
  if (await p.locator('.sheet').count()) { await p.locator('.sheet button[aria-label="Schließen"]').first().click(); await p.waitForTimeout(200); }
  const col = await p.evaluate(() => getComputedStyle(document.querySelector('.supp-ico')).color);
  ok(col === D3[appearance], `${appearance}: Icon in Katalogfarbe für ${appearance} (${col})`);
  await shot('5-supp-einstellungen');
  await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(250);
  ok((await p.innerText('.supp .count')) === '0/1', `${appearance}: Zähler 0/1`);
  await p.click('.supp-pill'); await p.waitForTimeout(150);
  ok((await p.innerText('.supp .count')) === '1/1' && (await p.getAttribute('.supp-pill', 'aria-pressed')) === 'true', `${appearance}: abgehakt 1/1`);
  await shot('6-supp-heute');

  // Einstellungen Getränke: Ziel ändern, Karte ausblenden
  await p.goto(srv.url + '/index.html#/ich/getraenke'); await p.waitForTimeout(250);
  await p.fill('input[aria-label="Tagesziel"]', '2000'); await p.dispatchEvent('input[aria-label="Tagesziel"]', 'change');
  await p.fill('input[aria-label="Halbwertszeit"]', '20'); await p.dispatchEvent('input[aria-label="Halbwertszeit"]', 'change'); await p.waitForTimeout(100);
  const cs = await p.evaluate(() => [JSON.parse(localStorage.getItem('tt_water')).goal, JSON.parse(localStorage.getItem('tt_caffeine')).halfLife]);
  ok(cs[0] === 2000 && cs[1] === 5, `${appearance}: Ziel gespeichert, ungültige Halbwertszeit abgelehnt (${cs})`);
  await shot('7-getraenke');
  await p.uncheck('input[aria-label="Koffein-Karte anzeigen"]');
  await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(250);
  ok(await p.locator('button[aria-label="Koffein-Getränk hinzufügen"]').count() === 0, `${appearance}: Koffein-Karte ausgeblendet`);

  const keys = await p.evaluate(() => Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])));
  ok(Object.entries(FOREIGN).every(([k, v]) => keys[k] === v), `${appearance}: fremde Keys unverändert`);
  ok(Object.keys(keys).every((k) => k.startsWith('tt_') || k in FOREIGN), `${appearance}: nur tt_-Keys geschrieben`);
  ok(errs.length === 0, `${appearance}: keine Konsolenfehler${errs.length ? ' – ' + errs.join(' | ') : ''}`);
  await ctx.close();
}
await b.close(); await srv.close();
console.log('Screenshots: ' + out);
done();
