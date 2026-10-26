// Scanner im Browser: Reiter Scannen mit Test-Kamera, Barcode eintippen (Open Food Facts simuliert), eintragen;
// unbekannter Barcode → Abtippen → eigenes Lebensmittel → eintragen → in der Suche auffindbar.
// Kamera und Foto-Erkennung selbst lassen sich hier nicht echt prüfen (iPhone-Checkliste).
// Aufruf: node tests/browser/check-scanner.mjs
import { launch, startServer, checker, outDir, BAD_TEXT, viaPlus } from './lib.mjs';
import { join } from 'node:path';

const KNOWN = '4001234567890';
const PRODUCT = { status: 1, product: { product_name_de: 'Testkekse', brands: 'Marke A', quantity: '200 g', serving_quantity: 25,
  additives_tags: ['en:e955'], nutriments: { 'energy-kcal_100g': 450, proteins_100g: 7, carbohydrates_100g: 65, fat_100g: 17, sugars_100g: 22 } } };

const srv = await startServer();
const b = await launch(['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']);
const { ok, done } = checker();
const out = outDir('scanner');

for (const appearance of ['dark', 'light']) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block', permissions: ['camera'] });
  const p = await ctx.newPage();
  const errs = [];
  const offCalls = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  // Die simulierte 404-Antwort für den unbekannten Barcode erzeugt eine erwartete Browser-Meldung
  p.on('console', (m) => { if (m.type() === 'error' && !/status of 404/.test(m.text())) errs.push(m.text()); });
  await p.route('https://world.openfoodfacts.org/**', (route) => {
    const url = route.request().url();
    offCalls.push(url);
    if (url.includes(KNOWN)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PRODUCT) });
    return route.fulfill({ status: 404, contentType: 'application/json', body: '{"status":0}' });
  });
  await p.goto(srv.url + '/index.html');
  await p.evaluate((a) => { localStorage.clear(); localStorage.setItem('ct.v1', '{"fremd":1}'); localStorage.setItem('tt_settings', JSON.stringify({ appearance: a })); }, appearance);
  await p.reload(); await p.waitForTimeout(300);
  const shot = (n) => p.screenshot({ path: join(out, `${appearance}-${n}.png`) });
  const text = () => p.evaluate(() => document.body.innerText);

  // Reiter Scannen: Kamera startet (Test-Kamera), keine Fehlermeldung
  await viaPlus(p, 'Lebensmittel', 'Frühstück');
  await p.click('.sheet .seg button:has-text("Scannen")'); await p.waitForTimeout(1500);
  const camOk = await p.evaluate(() => { const v = document.querySelector('.scanner video'); return !!v && v.readyState >= 2 && !!v.srcObject; });
  ok(camOk, `${appearance}: Kamera läuft im Scanner (Test-Kamera)`);
  ok(!/Kein Kamerazugriff|nicht verfügbar/.test(await text()), `${appearance}: keine Kamera-Fehlermeldung`);
  await shot('1-scanner');

  // Bekannter Barcode eintippen → Mengen-Dialog mit Produkt und Hinweisen
  await p.fill('input[aria-label="Barcode eintippen"]', '123'); await p.click('.sheet button:has-text("Suchen")'); await p.waitForTimeout(150);
  ok(offCalls.length === 0, `${appearance}: ungültige Nummer wird nicht gesendet`);
  await p.fill('input[aria-label="Barcode eintippen"]', KNOWN); await p.click('.sheet button:has-text("Suchen")'); await p.waitForTimeout(600);
  ok(offCalls.length === 1 && offCalls[0].includes(`/product/${KNOWN}.json`), `${appearance}: genau eine Anfrage, nur mit der Barcode-Nummer`);
  let t = await text();
  ok(t.includes('Testkekse') && t.includes('Sucralose') && t.includes('Keine Angabe zu Ballaststoffe'), `${appearance}: Mengen-Dialog zeigt Produkt, Süßstoff und fehlende Angabe`);
  ok(await p.evaluate(() => !document.querySelector('.scanner video')?.srcObject), `${appearance}: Kamera im Mengen-Dialog aus`);
  await shot('2-produkt');
  await p.click('.sheet button:has-text("Packungsportion")'); await p.waitForTimeout(100);
  await p.click('.sheet button:has-text("Eintragen")'); await p.waitForTimeout(1200);
  ok(await p.locator('.sheet').count() === 1, `${appearance}: nach dem Eintragen zurück im Scanner`);
  ok(await p.evaluate(() => !!document.querySelector('.scanner video')?.srcObject), `${appearance}: Kamera läuft wieder`);

  // Gleicher Barcode nochmal: aus dem Speicher, ohne Netz
  await p.fill('input[aria-label="Barcode eintippen"]', KNOWN); await p.click('.sheet button:has-text("Suchen")'); await p.waitForTimeout(500);
  ok(offCalls.length === 1, `${appearance}: zweiter Scan ohne Anfrage (gespeichert)`);
  await p.click('.sheet:last-of-type .sheet-close'); await p.waitForTimeout(300);

  // Unbekannter Barcode → Abtippen → eigenes Lebensmittel
  await p.fill('input[aria-label="Barcode eintippen"]', '4009999999999'); await p.click('.sheet button:has-text("Suchen")'); await p.waitForTimeout(500);
  ok((await text()).includes('ist unbekannt'), `${appearance}: unbekannter Barcode mit Auswahl`);
  await shot('3-unbekannt');
  await p.click('.sheet button:has-text("Abtippen")'); await p.waitForTimeout(300);
  ok(await p.inputValue('input[aria-label="Barcode"]') === '4009999999999', `${appearance}: Barcode im Formular vorbelegt`);
  await p.click('.sheet button:has-text("Speichern & eintragen")'); await p.waitForTimeout(150);
  ok((await text()).includes('Bitte einen Namen') || (await text()).includes('Ohne kcal'), `${appearance}: Pflichtfelder geprüft`);
  await p.fill('input[aria-label="Name"]', 'Omas Linsensuppe');
  await p.fill('input[aria-label="kcal in kcal"]', '95');
  await p.fill('input[aria-label="Eiweiß in g"]', '6');
  await p.fill('input[aria-label="Kohlenhydrate in g"]', '12');
  await p.fill('input[aria-label="Fett in g"]', '2');
  await shot('4-formular');
  await p.click('.sheet button:has-text("Speichern & eintragen")'); await p.waitForTimeout(400);
  t = await text();
  ok(t.includes('Omas Linsensuppe') && t.includes('Eintragen'), `${appearance}: nach dem Speichern Mengen-Dialog`);
  await p.fill('.sheet input[aria-label="Menge in g"]', '300');
  await p.click('.sheet button:has-text("Eintragen")'); await p.waitForTimeout(1000);

  // Suche findet eigenes und gescanntes Produkt
  await p.click('.sheet .seg button:has-text("Suche")'); await p.waitForTimeout(200);
  await p.fill('input[aria-label="Lebensmittel suchen"]', 'linsensuppe'); await p.waitForTimeout(200);
  ok((await p.locator('.sheet .results .row b').first().innerText()).includes('Omas Linsensuppe'), `${appearance}: eigenes Lebensmittel in der Suche vorn`);
  await p.fill('input[aria-label="Lebensmittel suchen"]', 'testkekse'); await p.waitForTimeout(200);
  ok((await p.locator('.sheet .results .row b').first().innerText()).includes('Testkekse'), `${appearance}: gescanntes Produkt in der Suche`);
  await shot('5-suche');
  await p.click('.sheet .sheet-close'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => !document.querySelector('video')), `${appearance}: Sheet zu, keine Kamera mehr`);

  // Journal: 2 × Packungsportion 25 g Kekse (113 kcal) + 300 g Suppe (285 kcal)
  await p.waitForFunction(() => /[23] Einträge/.test(document.body.innerText), null, { timeout: 5000 }).catch(() => {});
  t = await text();
  ok(t.includes('3 Einträge') || t.includes('2 Einträge'), `${appearance}: Einträge im Frühstück`);
  ok(!BAD_TEXT.test(t), `${appearance}: kein null/undefined/NaN`);
  await shot('6-journal');
  const keys = await p.evaluate(() => Object.keys(localStorage));
  ok(keys.includes('tt_custom') && keys.includes('tt_offcache'), `${appearance}: eigene Keys tt_custom und tt_offcache`);
  ok(keys.every((k) => k.startsWith('tt_') || k === 'ct.v1'), `${appearance}: nur eigene Keys (${keys.join(', ')})`);
  ok(errs.length === 0, `${appearance}: keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

console.log(`Screenshots: ${out}`);
await b.close(); await srv.close();
done();
