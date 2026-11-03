// Einstellungen (0.4.2): „Heute anpassen“ (Karten an/aus wirkt auf „Heute“ und „+“, Reihenfolge per Ziehen und Pfeiltasten,
// Standard wiederherstellen), gemeinsames Muster der Unterseiten (Schalter statt Checkboxen, sofort gespeichert), Geschmack-Seite.
// Hell und dunkel. Aufruf: node tests/browser/check-einstellungen.mjs
import { launch, startServer, checker, outDir, settle } from './lib.mjs';
import { join } from 'node:path';

const SUBPAGES = ['#/ich/wasser', '#/ich/koffein', '#/ich/alkohol', '#/ich/supplements', '#/ich/zyklus', '#/ich/koerper', '#/ich/gewichtsziel', '#/ich/training', '#/ich/heute', '#/ich/darstellung'];
const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('einstellungen');

for (const appearance of ['dark', 'light']) {
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' })).newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(srv.url + '/index.html');
  await p.evaluate((a) => { localStorage.clear(); localStorage.setItem('tt_settings', JSON.stringify({ appearance: a })); localStorage.setItem('tt_profile', JSON.stringify({ sex: 'f', cycle: 'yes' })); }, appearance);
  await p.reload(); await settle(p, 300);
  const nav = async (hash) => { await p.evaluate((x) => { location.hash = x; }, hash); await settle(p, 350); };
  const order = () => p.evaluate(() => (JSON.parse(localStorage.getItem('tt_settings')).todayOrder || []).slice(0, 8));
  const heute = () => p.evaluate(() => [...document.querySelectorAll('#view .card')].map((c) => (c.classList.contains('water') ? 'water' : c.classList.contains('caf') ? 'caff' : c.classList.contains('tt-today') ? 'training' : c.classList.contains('day-card') ? 'day' : null)).filter(Boolean));

  // Muster: keine alten Checkboxen mehr, Abschnittstitel im neuen Stil
  for (const r of SUBPAGES) {
    await nav(r);
    const s = await p.evaluate(() => ({ old: document.querySelectorAll('#view .check-row, #view .set-line').length, sec: document.querySelectorAll('#view .st-sec').length, lists: document.querySelectorAll('#view .st-list').length }));
    ok(s.old === 0 && s.sec > 0 && s.lists > 0, `${appearance}: ${r} im neuen Muster (alt ${s.old}, Abschnitte ${s.sec}, Listen ${s.lists})`);
  }

  // Ich: neuer Bereich „Heute“
  await nav('#/ich');
  ok(/Heute anpassen/.test(await p.innerText('#view')) && /von 9 Karten/.test(await p.innerText('a[href="#/ich/heute"]')), `${appearance}: Ich zeigt „Heute anpassen“ mit Kartenzahl`);

  // An/aus: Wasser aus → keine Karte und kein Eintrag im „+“
  await nav('#/ich/heute');
  await p.screenshot({ path: join(out, `heute-anpassen-${appearance}.png`) });
  await p.locator('input[aria-label="Wasser"]').uncheck(); await settle(p, 200);
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('tt_water') || '{}').enabled) === false, `${appearance}: Wasser aus gespeichert (tt_water)`);
  await nav('#/');
  ok(!(await heute()).includes('water'), `${appearance}: Heute ohne Wasser-Karte`);
  await p.click('#tabbar .tab-plus, #tabbar button[aria-label*="Hinzufügen"], #tabbar .plus'); await settle(p, 300);
  ok(!/Wasser/.test(await p.innerText('.sheet')), `${appearance}: „+“ ohne Wasser`);
  await p.keyboard.press('Escape'); await settle(p, 200);
  while (await p.locator('.sheet').count()) { await p.locator('.sheet .sheet-close').last().click(); await settle(p, 200); }
  await nav('#/ich/heute');
  await p.locator('input[aria-label="Wasser"]').check(); await settle(p, 200);

  // Reihenfolge: Koffein per Ziehen ganz nach oben
  await p.click('button.st-edit'); await settle(p, 200);
  ok(await p.locator('.st-grip').count() === 8, `${appearance}: acht Griffe im Reihenfolge-Modus`);
  const g = await p.locator('.st-grip[data-key="caff"]').boundingBox();
  const top = await p.locator('.st-grip[data-key="cycle"]').boundingBox();
  await p.mouse.move(g.x + g.width / 2, g.y + g.height / 2); await p.mouse.down();
  for (let i = 1; i <= 12; i++) await p.mouse.move(g.x + g.width / 2, g.y + g.height / 2 + (top.y - g.y - 10) * i / 12);
  await p.mouse.up(); await settle(p, 250);
  ok((await order())[0] === 'caff', `${appearance}: Koffein nach Ziehen oben (${(await order()).join(',')})`);
  // Pfeiltaste: Training eins nach unten, Fokus bleibt auf dem Griff
  const before = await order();
  await p.locator('.st-grip[data-key="training"]').focus(); await p.keyboard.press('ArrowDown'); await settle(p, 200);
  const after = await order();
  ok(after.indexOf('training') === before.indexOf('training') + 1, `${appearance}: Pfeil runter verschiebt Training um eins`);
  ok(await p.evaluate(() => document.activeElement?.dataset.key) === 'training', `${appearance}: Fokus bleibt auf dem Griff`);
  await p.screenshot({ path: join(out, `reihenfolge-${appearance}.png`) });
  // Heute in dieser Reihenfolge: Tagesübersicht, dann Koffein vor Wasser
  await nav('#/');
  const hs = await heute();
  ok(hs[0] === 'day' && hs.indexOf('caff') < hs.indexOf('water'), `${appearance}: Heute in neuer Reihenfolge (${hs.join(',')})`);
  // Standard wiederherstellen
  await nav('#/ich/heute'); await p.click('button.st-edit'); await settle(p, 200);
  await p.click('a:has-text("Standard wiederherstellen")'); await settle(p, 200);
  ok((await order()).length === 0 || (await order())[0] === 'cycle', `${appearance}: Standard wiederhergestellt`);

  // Sofort gespeichert: Wassermenge ohne Knopf
  await nav('#/ich/wasser');
  await p.fill('input[aria-label="Tagesziel"]', '2000'); await p.press('input[aria-label="Tagesziel"]', 'Tab'); await settle(p, 200);
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('tt_water')).goal) === 2000, `${appearance}: Wasser-Ziel sofort gespeichert`);
  await p.fill('input[aria-label="Tagesziel"]', '99'); await p.press('input[aria-label="Tagesziel"]', 'Tab'); await settle(p, 200);
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('tt_water')).goal) === 2000 && await p.inputValue('input[aria-label="Tagesziel"]') === '2000', `${appearance}: Wert außerhalb des Bereichs abgewiesen`);

  // Geschmack auf eigener Seite
  await nav('#/ich/ernaehrung');
  ok(await p.locator('.taste-row').count() === 0 && await p.locator('a[href="#/ich/geschmack"]').count() === 1, `${appearance}: Ernährung ohne lange Geschmacksliste`);
  await nav('#/ich/geschmack');
  ok(await p.locator('.taste-row').count() > 10, `${appearance}: Geschmack-Seite mit Liste`);

  ok(errs.length === 0, `${appearance}: keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
  await p.context().close();
}
console.log(`Screenshots: ${out}`);
await b.close(); await srv.close();
done();
