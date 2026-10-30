// Zyklus und PIN-Sperre (0.2.6) im Browser: Regel-Frage unter „Schlaf & Körper“, leere Karte, Eintragen, Karte
// (Streifen/Ring), Kalender (Kreise/Band), Verlauf, Wissen, Bericht, Import, Hormon-Methode blendet Fenster aus,
// PIN für den Zyklus und für die ganze App mit Schein-PIN. Prüft fremde Keys, Konsolenfehler, null/undefined/NaN;
// Screenshots hell/dunkel. Aufruf: node tests/browser/check-zyklus.mjs
import { launch, startServer, checker, outDir, BAD_TEXT } from './lib.mjs';
import { join } from 'node:path';

const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('zyklus');
const FOREIGN = { 'rezeptbuch-v1': '{"cycle":{"days":{"2026-01-01":{"bleed":3}}}}', 'ct.v1': '{"x":1}', wt_x: '1' };
const isoN = (n) => { const d = new Date(); d.setDate(d.getDate() + n); const p = (x) => String(x).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };

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
    localStorage.setItem('tt_profile', JSON.stringify({ sex: 'f' }));
  }, [appearance, FOREIGN]);
  await p.reload(); await p.waitForTimeout(500);
  const shot = (name) => p.screenshot({ path: join(out, `${appearance}-${name}.png`) });
  const text = () => p.evaluate(() => document.body.innerText);
  const zy = () => p.evaluate(() => JSON.parse(localStorage.getItem('tt_zyklus') || '{}'));
  const nav = async (hash) => { await p.evaluate((x) => { location.hash = x; }, hash); await p.waitForTimeout(350); };

  // Ohne Regel-Frage: keine Karte
  ok(await p.locator('.cy-card').count() === 0, `${appearance}: ohne „Regel = Ja“ keine Zyklus-Karte`);
  await nav('#/ich/koerper');
  await p.click('.seg[aria-label="Hast du deine Regel?"] button:has-text("Ja")');
  await p.click('button:has-text("Speichern")'); await p.waitForTimeout(300);
  ok((await p.evaluate(() => JSON.parse(localStorage.getItem('tt_profile')).cycle)) === 'yes', `${appearance}: Regel-Frage gespeichert (tt_profile.cycle)`);
  await nav('#/');
  ok(await p.locator('.cy-card.cy-empty').count() === 1, `${appearance}: leere Zyklus-Karte auf „Heute“`);

  // Eintragen über das „+“ der Karte
  await p.click('.cy-empty .trk-plus'); await p.waitForTimeout(350);
  await p.click('.cy-bleed .chip:has-text("Mittel")'); await p.waitForTimeout(200);
  await p.click('.chip:has-text("Unterleibskrämpfe")'); await p.waitForTimeout(200);
  let z = await zy();
  ok(z.days && z.days[isoN(0)] && z.days[isoN(0)].bleed === 3 && z.days[isoN(0)].body.includes('Unterleibskrämpfe'), `${appearance}: Blutung und Körper eingetragen`);
  await shot('1-tag');

  // Import: frühere Perioden einfügen
  await nav('#/ich/zyklus');
  const lines = [-84, -56, -28].map((n) => `${isoN(n)} bis ${isoN(n + 4)}`).join('\n');
  await p.fill('textarea[aria-label="Daten einfügen"]', lines);
  await p.click('button:text-is("Übernehmen")'); await p.waitForTimeout(300);
  z = await zy();
  ok(Object.values(z.days).filter((e) => e.imp).length === 15, `${appearance}: 15 Tage importiert`);
  await nav('#/');
  const cardText = await p.locator('.cy-card').innerText();
  ok(/Tag 1/.test(cardText) && /Periode in 2[6-9]/.test(cardText) && await p.locator('.cy-strip i').count() >= 28, `${appearance}: Karte Streifen „Tag 1“, Periode in ~28 Tagen`);
  ok(!BAD_TEXT.test(await text()), `${appearance}: Heute ohne null/undefined/NaN`);
  await shot('2-heute-streifen');

  // Kalender Kreise, Verlauf, Wissen, Bericht
  await nav('#/zyklus');
  const nb = await p.locator('.cy-cal.circles .cy-d.b').count();
  await p.click('button[aria-label="Nächster Monat"]'); await p.waitForTimeout(200);
  const nf = await p.locator('.cy-cal .cy-d.f').count() + await p.locator('.cy-cal .cy-d.p').count();
  await p.click('button[aria-label="Vormonat"]'); await p.waitForTimeout(200);
  ok(nb >= 1 && nf >= 1, `${appearance}: Kalender Kreise mit Periode, nächster Monat mit Fenster/erwartet`);
  ok(/Nächste Perioden/i.test(await text()) && /keine Verhütung/.test(await text()), `${appearance}: Vorschau und Hinweis „keine Verhütung“`);
  await shot('3-kalender-kreise');
  await nav('#/zyklus/verlauf');
  ok(/Tage typisch/.test(await text()) && await p.locator('.cy-chart .bar').count() === 3, `${appearance}: Verlauf mit 3 Zyklen`);
  await nav('#/zyklus/wissen');
  for (const t of ['Schleim', 'Muttermund', 'Training', 'Abklären']) { await p.click(`.cy-tabs .chip:has-text("${t}")`); await p.waitForTimeout(150); }
  ok(/Wann abklären/.test(await text()) && await p.locator('.cy-refs li').count() >= 20, `${appearance}: Wissen mit 5 Themen und Quellen`);
  ok(!/Eisprung heute|du hast heute deinen Eisprung/i.test(await text()), `${appearance}: nie „Eisprung heute“`);
  await shot('4-wissen');
  await nav('#/zyklus/bericht');
  ok(/Zyklusbericht/.test(await text()) && await p.locator('.cy-table tbody tr').count() === 4 && /Unterleibskrämpfe/.test(await text()), `${appearance}: Bericht mit 4 Zyklen und Beschwerden`);
  ok(!BAD_TEXT.test(await text()), `${appearance}: Bericht ohne null/undefined/NaN`);
  await shot('5-bericht');

  // Stile umschalten
  await nav('#/ich/zyklus');
  await p.click('.seg[aria-label="Kartenstil"] button:has-text("Ring")');
  await p.click('.seg[aria-label="Kalenderstil"] button:has-text("Band")'); await p.waitForTimeout(200);
  await nav('#/');
  ok(await p.locator('.cy-ringcard .cy-ring').count() === 1, `${appearance}: Karte Ring`);
  await shot('6-heute-ring');
  await nav('#/zyklus');
  ok(await p.locator('.cy-cal.band').count() === 1, `${appearance}: Kalender Band`);
  await shot('7-kalender-band');

  // Hormonelle Methode: kein Fenster
  await nav('#/ich/zyklus');
  await p.click('.chip:has-text("Ring oder Pflaster")'); await p.waitForTimeout(200);
  await nav('#/zyklus');
  ok(await p.locator('.cy-cal .cy-d.f').count() === 0 && /Entzugsblutung/.test(await text()), `${appearance}: Ring/Pflaster blendet Fenster aus`);
  await nav('#/ich/zyklus');
  await p.click('.chip:has-text("Keine oder Kondom")'); await p.waitForTimeout(200);

  // PIN nur für den Zyklus
  await nav('#/ich/sperre');
  await p.fill('input[aria-label="PIN, 4 bis 8 Ziffern"]', '2580');
  await p.fill('input[aria-label="Noch einmal"]', '2580');
  await p.click('.lock-field button:has-text("Speichern")'); await p.waitForTimeout(300);
  await p.reload(); await p.waitForTimeout(500);
  await nav('#/');
  ok(/Gesperrt/.test(await p.locator('.cy-card').innerText()) && await p.locator('.cy-strip, .cy-ring').count() === 0, `${appearance}: Karte zeigt „Gesperrt“ ohne Daten`);
  await nav('#/zyklus');
  ok(/Zyklus gesperrt/.test(await text()), `${appearance}: Kalender gesperrt`);
  await p.fill('.lock input', '1111'); await p.click('.lock button:has-text("Entsperren")'); await p.waitForTimeout(300);
  ok(/stimmt nicht/.test(await text()), `${appearance}: falsche PIN abgelehnt`);
  await p.fill('.lock input', '2580'); await p.click('.lock button:has-text("Entsperren")'); await p.waitForTimeout(300);
  ok(await p.locator('.cy-cal').count() === 1, `${appearance}: mit PIN entsperrt`);

  // Ganze App + Schein-PIN
  await nav('#/ich/sperre');
  await p.click('.seg[aria-label="Was gesperrt wird"] button:has-text("Ganze App")'); await p.waitForTimeout(200);
  await p.fill('input[aria-label="Schein-PIN, anders als die PIN"]', '1357');
  await p.fill('.lock-field input[aria-label="Noch einmal"]', '1357');
  await p.click('.lock-field button:has-text("Speichern")'); await p.waitForTimeout(300);
  await p.reload(); await p.waitForTimeout(500);
  ok(/The Tracker ist gesperrt/.test(await text()) && !(await p.locator('#tabbar').isVisible()), `${appearance}: ganze App gesperrt, ohne Tab-Leiste`);
  await shot('8-gesperrt');
  await nav('#/rezepte');
  ok(/The Tracker ist gesperrt/.test(await text()), `${appearance}: auch Rezepte gesperrt`);
  await p.fill('.lock input', '1357'); await p.click('.lock button:has-text("Entsperren")'); await p.waitForTimeout(400);
  await nav('#/zyklus');
  ok(await p.locator('.cy-cal .cy-d.b').count() === 0, `${appearance}: Schein-PIN zeigt leeren Kalender`);
  z = await zy();
  ok(Object.keys(z.days).length >= 16, `${appearance}: echte Daten bleiben bei Schein-PIN erhalten`);

  const keys = await p.evaluate(() => ({ all: Object.keys(localStorage), ct: localStorage.getItem('ct.v1'), rb: localStorage.getItem('rezeptbuch-v1') }));
  ok(keys.all.every((k) => k.startsWith('tt_') || k in FOREIGN), `${appearance}: nur tt_-Keys geschrieben`);
  ok(keys.ct === FOREIGN['ct.v1'] && keys.rb === FOREIGN['rezeptbuch-v1'], `${appearance}: fremder Zyklus (Rezeptbuch) unverändert`);
  ok(errs.length === 0, `${appearance}: keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
  await ctx.close();
}
await b.close(); await srv.close();
done();
