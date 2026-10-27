// Analyse (0.2.0) im Browser: Einstieg auf Heute, Kacheln mit Beispieldaten (Zahlen gegen die Rechnung), Zeitraum,
// Energiebedarf, Mikronährstoffe, Monat (Tag → Heute), Jahr, Magen-Modell, Tracker aus → Kachel weg.
// Prüft fremde Keys, Konsolenfehler, null/undefined/NaN; Screenshots hell/dunkel.
// Aufruf: node tests/browser/check-analyse.mjs
import { launch, startServer, checker, outDir, BAD_TEXT } from './lib.mjs';
import { join } from 'node:path';

const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('analyse');
const FOREIGN = { 'ct.v1': '{"days":{}}', wt_x: '1', 'rezeptbuch-v1': '{}' };

for (const appearance of ['dark', 'light']) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(srv.url + '/index.html');
  await p.evaluate(([a, f]) => { localStorage.clear(); for (const [k, v] of Object.entries(f)) localStorage.setItem(k, v); localStorage.setItem('tt_settings', JSON.stringify({ appearance: a })); localStorage.setItem('tt_profile', JSON.stringify({ sex: 'f', weightKg: 64, heightCm: 168, birthYear: 1995 })); }, [appearance, FOREIGN]);
  await p.reload(); await p.waitForTimeout(300);
  const shot = (name) => p.screenshot({ path: join(out, `${appearance}-${name}.png`), fullPage: true });
  const text = () => p.evaluate(() => document.body.innerText);
  const close = async () => { while (await p.locator('.sheet').count()) { await p.locator('.sheet .sheet-close').last().click(); await p.waitForTimeout(250); } };

  // Leer: Analyse ohne Daten zeigt Striche, keine Fehler
  await p.click('.day-nav a[aria-label="Analyse"]'); await p.waitForTimeout(300);
  ok((await p.evaluate(() => location.hash)) === '#/analyse', `${appearance}: Trend-Knopf auf Heute öffnet die Analyse`);
  ok(await p.locator('.tabbar .tab[aria-current="page"]').innerText() === 'Heute', `${appearance}: Analyse gehört zum Reiter Heute`);
  let t = await text();
  ok(!BAD_TEXT.test(t) && t.includes('braucht 14 Tage'), `${appearance}: leer ohne null/NaN, Energiebedarf nennt die nötigen Daten`);

  // Beispieldaten
  await p.goto(srv.url + '/index.html#/ich'); await p.waitForTimeout(200);
  await p.click('button:has-text("Beispieldaten laden")');
  await p.waitForFunction(() => /Beispiel-Einträge vorhanden/.test(document.body.innerText), null, { timeout: 15000 });
  await p.evaluate(() => document.querySelectorAll('.toast').forEach((x) => x.classList.remove('show')));
  await p.goto(srv.url + '/index.html#/analyse'); await p.waitForTimeout(400);
  t = await text();
  ok(!BAD_TEXT.test(t), `${appearance}: Analyse mit Daten ohne null/undefined/NaN`);
  const names = await p.locator('.an-tile .an-h').allInnerTexts();
  ok(names.join(',') === 'Kalorien,Gewicht,Energiebedarf,Wasser,Koffein,Alkohol,Eiweiß', `${appearance}: Kacheln (${names.join(', ')})`);
  ok(!/Gewohnheit/.test(t), `${appearance}: keine Kachel „Gewohnheit“`);
  // Ø kcal gegen die Rechnung: Mittel über die Tage mit Essens-Einträgen (gestern und 6 Tage davor)
  const want = await p.evaluate(async () => {
    const J = await import('./js/features/journal/journal.js'); const F = await import('./js/core/format.js');
    const end = F.addDays(F.isoDate(), -1); const ds = Array.from({ length: 7 }, (_, i) => F.addDays(end, i - 6));
    const tr = ds.filter((d) => J.entriesOf(d).some((e) => !e.link));
    return Math.round(tr.reduce((s, d) => s + J.sumEntries(J.entriesOf(d)).k, 0) / tr.length).toLocaleString('de-DE');
  });
  ok((await p.locator('.an-tile.wide .an-v').innerText()).startsWith(`Ø ${want}`), `${appearance}: Ø kcal = ${want} (Rechnung)`);
  ok(await p.locator('.an-tile.wide svg.kb rect.b').count() === 7 && await p.locator('.kb-lab span').count() === 7, `${appearance}: 7 Balken mit Wochentagen`);
  ok(/≈ [\d.]+/.test(await p.locator('.an-tile.k-body .an-v').innerText()), `${appearance}: Energiebedarf mit Beispieldaten geschätzt`);
  await shot('1-uebersicht');

  // Zeitraum 30 Tage, gemerkt unter tt_analyse
  await p.click('.an-seg button:has-text("30 Tage")'); await p.waitForTimeout(250);
  ok(await p.locator('.an-tile.wide svg.kb rect.b').count() >= 25 && await p.locator('.kb-lab').count() === 0, `${appearance}: 30 Tage ohne Wochentag-Beschriftung`);
  ok((await p.evaluate(() => JSON.parse(localStorage.getItem('tt_analyse')).range)) === 30, `${appearance}: Zeitraum gespeichert`);
  await p.click('.an-seg button:has-text("7 Tage")'); await p.waitForTimeout(200);

  // Energiebedarf-Sheet
  await p.click('.an-tile.k-body'); await p.waitForTimeout(300);
  t = await p.innerText('.sheet');
  ok(t.includes('Nur Anzeige') && t.includes('7.700') && t.includes('Spanne'), `${appearance}: Energiebedarf erklärt Rechnung und Schwächen`);
  await shot('2-energie'); await close();

  // Mikronährstoffe
  await p.goto(srv.url + '/index.html#/analyse/mikro');
  await p.waitForFunction(() => document.querySelectorAll('.mc-row').length === 8, null, { timeout: 8000 });
  t = await text();
  ok(/Abdeckung: \d+ %/.test(t) && !BAD_TEXT.test(t), `${appearance}: 8 Mikronährstoffe mit Abdeckung`);
  await shot('3-mikro');

  // Monat: gestern antippen → Heute zeigt gestern
  await p.goto(srv.url + '/index.html#/analyse/monat'); await p.waitForTimeout(300);
  const y = await p.evaluate(async () => { const F = await import('./js/core/format.js'); return F.addDays(F.isoDate(), -1); });
  ok(await p.locator('.cal-d:not(.empty)').count() === new Date(Number(y.slice(0, 4)), Number(new Date().getMonth()) + 1, 0).getDate(), `${appearance}: Kalender mit allen Tagen des Monats`);
  ok(await p.locator('.am-row').count() === 3, `${appearance}: Ø Makros`);
  await shot('4-monat');
  if (y.slice(0, 7) === (await p.evaluate(() => new Date().toISOString().slice(0, 7)))) {
    await p.click(`.cal-d[aria-label^="${Number(y.slice(8))}. "]`); await p.waitForTimeout(300);
    ok((await p.evaluate(() => location.hash)) === '#/' && (await p.innerText('.day-head h1')) === 'Gestern', `${appearance}: Tag im Monat öffnet ihn auf Heute`);
    ok(await p.locator('.day-nav a[aria-label="Analyse"]').count() === 0 && await p.locator('.day-nav button:has-text("Heute")').count() === 1, `${appearance}: an anderen Tagen „Heute“ statt Analyse-Knopf`);
  }

  // Jahr
  await p.goto(srv.url + '/index.html#/analyse/jahr'); await p.waitForTimeout(300);
  const yr = Number(y.slice(0, 4)); const daysInYear = (yr % 4 === 0 && yr % 100 !== 0) || yr % 400 === 0 ? 366 : 365;
  ok(await p.locator('.yd').count() === daysInYear && await p.locator('.yd.on').count() >= 25, `${appearance}: Jahresansicht mit ${daysInYear} Tagen`);
  ok((await text()).includes('Keine Serie'), `${appearance}: Jahr ohne Serie`);
  await shot('5-jahr');

  // Magen-Modell: gestern (Beispieldaten haben Mahlzeiten)
  await p.goto(srv.url + '/index.html#/analyse/magen'); await p.waitForTimeout(300);
  await p.click('.day-nav button[aria-label="Vorheriger Tag"]'); await p.waitForTimeout(250);
  t = await text();
  ok(await p.locator('.st-svg path.line').count() === 1 && await p.locator('.st-row').count() >= 2 && t.includes('Höchstwert'), `${appearance}: Magen-Kurve mit Mahlzeiten (gestern)`);
  ok(await p.locator('.day-nav button[aria-label="Nächster Tag"]').isEnabled(), `${appearance}: von gestern nach heute blättern möglich`);
  await p.click('.st .info-btn'); await p.waitForTimeout(250);
  ok((await p.innerText('.sheet')).includes('keine Messung') && (await p.innerText('.sheet')).includes('Abell'), `${appearance}: Magen-Modell erklärt Schwächen und Quellen`);
  await close();
  await shot('6-magen');

  // Koffein aus → keine Koffein-Kachel
  await p.goto(srv.url + '/index.html#/ich/koffein'); await p.waitForTimeout(250);
  await p.uncheck('input[aria-label="Koffein-Karte anzeigen"]');
  await p.goto(srv.url + '/index.html#/analyse'); await p.waitForTimeout(300);
  ok(await p.locator('.an-tile.k-caf').count() === 0, `${appearance}: Koffein aus → keine Kachel`);

  const keys = await p.evaluate(() => ({ all: Object.keys(localStorage), ct: localStorage.getItem('ct.v1'), wt: localStorage.getItem('wt_x') }));
  ok(keys.all.every((k) => k.startsWith('tt_') || k in { 'ct.v1': 1, wt_x: 1, 'rezeptbuch-v1': 1 }), `${appearance}: nur tt_-Keys geschrieben`);
  ok(keys.ct === FOREIGN['ct.v1'] && keys.wt === '1', `${appearance}: fremde Keys unverändert`);
  ok(errs.length === 0, `${appearance}: keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

console.log(`Screenshots: ${out}`);
await b.close(); await srv.close();
done();
