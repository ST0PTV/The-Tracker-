// Gewicht und Gewichtsziel im Browser: Gewicht eintragen, Ziel mit Bedarf von der Uhr übernehmen, Tempo-Grenze,
// Untergrenze, Schätzung aus Körperdaten, automatische Anpassung, Beispieldaten mit Verlauf. Hell und dunkel.
// Aufruf: node tests/browser/check-weight.mjs
import { launch, startServer, checker, outDir, BAD_TEXT } from './lib.mjs';
import { join } from 'node:path';

const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('weight');
const FOREIGN = { 'ct.v1': '{"wgoal":{"on":true}}', wt_body: '[1]', 'rezeptbuch-v1': '{"x":1}' };

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
  const goal = () => p.evaluate(() => { const g = JSON.parse(localStorage.getItem('tt_goals') || '[]'); return g.length ? g[g.length - 1].goal : null; });
  const inside = () => p.evaluate(() => [...document.querySelectorAll('.card')].every((c) => { const r = c.getBoundingClientRect(); return [...c.querySelectorAll('input, .seg, .chips')].every((i) => { const q = i.getBoundingClientRect(); return q.left >= r.left - 0.5 && q.right <= r.right + 0.5; }); }));

  // 1. Leere Karte, Gewicht eintragen
  ok((await text()).includes('Noch kein Gewicht eingetragen.'), `${appearance}: Karte ohne Gewicht`);
  await p.click('button[aria-label="Gewicht eintragen"]'); await p.waitForTimeout(250);
  await p.fill('.sheet input[aria-label="Gewicht in kg"]', '25');
  await p.click('.sheet button:has-text("Eintragen")'); await p.waitForTimeout(150);
  ok(await p.locator('.sheet').count() === 1 && (await text()).includes('30 und 300'), `${appearance}: 25 kg abgelehnt, Sheet bleibt offen`);
  await p.fill('.sheet input[aria-label="Gewicht in kg"]', '80,4');
  await shot('1-sheet');
  await p.click('.sheet button:has-text("Eintragen")'); await p.waitForTimeout(300);
  let t = await text();
  ok(await p.locator('.sheet').count() === 0 && t.includes('80,4') && t.includes('heute gewogen'), `${appearance}: 80,4 kg auf der Karte`);

  // 2. Gewichtsziel mit Gesamtverbrauch von der Uhr
  await p.goto(srv.url + '/index.html#/ich/gewichtsziel'); await p.waitForTimeout(250);
  ok((await text()).includes('Aktuell 80,4 kg'), `${appearance}: Seite kennt das aktuelle Gewicht`);
  await p.fill('input[aria-label="Ø Gesamtverbrauch der letzten Wochen (kcal/Tag)"]', '2500');
  await p.fill('input[aria-label="Zielgewicht"]', '72'); await p.waitForTimeout(100);
  ok(await p.locator('.wg-opt').count() === 4, `${appearance}: drei Tempo-Vorschläge und eigenes Datum`);
  ok(await p.getAttribute('.wg-opt:has-text("Empfohlen")', 'aria-checked') === 'true', `${appearance}: „Empfohlen“ vorgewählt`);
  // 80,4 kg · 0,75 % = 0,603 kg/Woche → −663 kcal → 2500 − 663 = 1837 → 1.840 kcal
  const res = await p.innerText('.wg-res b');
  ok(res === '1.840 kcal', `${appearance}: Kalorienziel 1.840 kcal (${res})`);
  ok((await text()).includes('voraussichtlich'), `${appearance}: Zieldatum als Schätzung beschrieben`);
  ok(await inside(), `${appearance}: Felder bleiben in den Karten`);
  await shot('2-gewichtsziel', true);

  // 3. Eigenes Datum zu früh → gedeckelt mit Hinweis (2500 − 0,804 · 7700 / 7 = 1616 → 1.620 kcal)
  await p.click('.wg-opt:has-text("Eigenes Datum")'); await p.waitForTimeout(100);
  const soon = await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 21); return d.toISOString().slice(0, 10); });
  await p.fill('input[aria-label="Zieldatum"]', soon); await p.dispatchEvent('input[aria-label="Zieldatum"]', 'change'); await p.waitForTimeout(150);
  ok((await text()).includes('Zu schnell'), `${appearance}: zu frühes Datum → Hinweis „Zu schnell“`);
  ok(await p.innerText('.wg-res b') === '1.620 kcal', `${appearance}: gedeckelt auf 1 %/Woche (80,4 kg · 1 % = −884 kcal) (${await p.innerText('.wg-res b')})`);
  await shot('3-zu-schnell');

  // 4. Untergrenze bei niedrigem Bedarf
  await p.click('.wg-opt:has-text("Empfohlen")');
  await p.fill('input[aria-label="Ø Gesamtverbrauch der letzten Wochen (kcal/Tag)"]', '1700'); await p.waitForTimeout(150);
  ok(await p.innerText('.wg-res b') === '1.200 kcal' && (await text()).includes('Untergrenze'), `${appearance}: Untergrenze 1.200 kcal mit Hinweis`);
  await p.fill('input[aria-label="Ø Gesamtverbrauch der letzten Wochen (kcal/Tag)"]', '2500'); await p.waitForTimeout(100);

  // 5. Schätzen aus Körperdaten braucht das Geburtsjahr
  await p.click('.seg button:has-text("Schätzen")'); await p.waitForTimeout(100);
  ok((await text()).includes('Geburtsjahr eintragen'), `${appearance}: Schätzung fragt nach dem Geburtsjahr`);
  await p.fill('input[aria-label="Geburtsjahr"]', '1995'); await p.waitForTimeout(100);
  ok(/Erhaltungsbedarf ≈ [\d.]+ kcal/.test(await text()), `${appearance}: geschätzter Erhaltungsbedarf angezeigt`);
  await shot('4-schaetzen', true);
  await p.click('.seg button:has-text("Von der Uhr")'); await p.waitForTimeout(100);

  // 6. Übernehmen
  await p.click('button:has-text("Als Kalorienziel übernehmen")'); await p.waitForTimeout(300);
  ok(await goal() === 1840, `${appearance}: Kalorienziel 1.840 kcal gespeichert (${await goal()})`);
  await p.goto(srv.url + '/index.html#/ich'); await p.waitForTimeout(200);
  t = await text();
  ok(t.includes('1.840 kcal') && t.includes('72 kg'), `${appearance}: „Ich“ zeigt Ziel und Gewichtsziel`);

  // 7. Neues Gewicht für heute → automatisch neu gerechnet
  await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(200);
  ok((await text()).includes('Ziel 72 kg'), `${appearance}: Karte zeigt das Ziel`);
  await p.click('button[aria-label="Gewicht eintragen"]'); await p.waitForTimeout(250);
  await p.fill('.sheet input[aria-label="Gewicht in kg"]', '79,6');
  await p.click('.sheet button:has-text("Eintragen")'); await p.waitForTimeout(300);
  ok((await text()).includes('Kalorienziel ab heute'), `${appearance}: Toast meldet das neue Kalorienziel`);
  ok(await goal() !== 1840, `${appearance}: Kalorienziel neu gerechnet (${await goal()})`);

  // 8. Beispieldaten: Verlauf mit Linie und Trend
  await p.goto(srv.url + '/index.html#/ich'); await p.waitForTimeout(200);
  await p.click('button:has-text("Beispieldaten laden")');
  await p.waitForFunction(() => /Beispiel-Einträge vorhanden/.test(document.body.innerText), null, { timeout: 15000 });
  await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(300);
  ok(await p.locator('.weight .wspark path.line').count() === 1, `${appearance}: Verlauf als Linie`);
  ok(/zur Vorwoche[\s\S]*[+−±]\d/.test(await p.innerText('.weight')), `${appearance}: Trend zur Vorwoche`);
  t = await text();
  ok(!BAD_TEXT.test(t), `${appearance}: kein null/undefined/NaN`);
  await p.locator('.weight').scrollIntoViewIfNeeded();
  await shot('5-karte');
  await p.goto(srv.url + '/index.html#/ich'); await p.waitForTimeout(200);
  await p.click('button:has-text("Entfernen")'); await p.waitForTimeout(300);
  const left = await p.evaluate(() => Object.values(JSON.parse(localStorage.getItem('tt_weight'))).filter((v) => v.demo).length);
  ok(left === 0, `${appearance}: Beispiel-Gewichte entfernt`);

  const keys = await p.evaluate(() => Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])));
  ok(Object.entries(FOREIGN).every(([k, v]) => keys[k] === v), `${appearance}: fremde Keys unverändert`);
  ok(Object.keys(keys).every((k) => k.startsWith('tt_') || k in FOREIGN), `${appearance}: nur tt_-Keys geschrieben`);
  ok(errs.length === 0, `${appearance}: keine Konsolenfehler${errs.length ? ' – ' + errs.join(' | ') : ''}`);
  await ctx.close();
}
await b.close(); await srv.close();
console.log('Screenshots: ' + out);
done();
