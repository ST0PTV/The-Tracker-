// Abstände: alle Seiten unter „Ich“ und die wichtigsten Sheets, hell und dunkel, mit Beispieldaten.
// Aufruf: node tests/browser/check-abstaende.mjs   (Befunde werden einzeln ausgegeben)
import { launch, startServer, checker, outDir, viaPlus } from './lib.mjs';
import { auditSpacing, auditFields } from './spacing.mjs';
import { join } from 'node:path';

const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('abstaende');
const ROUTES = ['#/ich', '#/ich/ziel', '#/ich/gewichtsziel', '#/ich/koerper', '#/ich/wasser', '#/ich/koffein', '#/ich/alkohol', '#/ich/supplements', '#/ich/quellen', '#/', '#/analyse', '#/analyse/mikro', '#/analyse/monat', '#/analyse/jahr', '#/analyse/magen', '#/rezepte', '#/rezepte/rezept?id=linsen-bolognese', '#/rezepte/neu', '#/rezepte/start', '#/rezepte/start?s=2', '#/rezepte/start?s=3', '#/ich/ernaehrung', '#/zyklus', '#/zyklus/tag', '#/zyklus/verlauf', '#/zyklus/wissen', '#/zyklus/bericht', '#/ich/zyklus', '#/ich/sperre', '#/rezepte/woche'];

for (const appearance of ['dark', 'light']) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(srv.url + '/index.html');
  await p.evaluate((a) => { localStorage.clear(); localStorage.setItem('tt_settings', JSON.stringify({ appearance: a })); localStorage.setItem('tt_profile', JSON.stringify({ sex: 'f', weightKg: 64, heightCm: 168, birthYear: 1995, cycle: 'yes', deficits: ['fe', 'vd'] })); localStorage.setItem('tt_zyklus', JSON.stringify({ days: Object.fromEntries([-60, -32, -4].flatMap((s) => [0, 1, 2, 3].map((i) => { const d = new Date(); d.setDate(d.getDate() + s + i); return [d.toISOString().slice(0, 10), { bleed: 3, temp: 36.5 }]; }))) })); localStorage.setItem('tt_recipes', JSON.stringify({ started: true })); }, appearance);
  await p.reload(); await p.waitForTimeout(300);
  await p.goto(srv.url + '/index.html#/ich'); await p.waitForTimeout(200);
  await p.click('button:has-text("Beispieldaten laden")');
  await p.waitForFunction(() => /Beispiel-Einträge vorhanden/.test(document.body.innerText), null, { timeout: 15000 });
  await p.waitForTimeout(3000);
  const close = async () => { while (await p.locator('.sheet').count()) { await p.locator('.sheet .sheet-close').last().click(); await p.waitForTimeout(250); } };
  const check = async (where, shotName) => {
    const issues = await auditSpacing(p, where);
    for (const x of issues) console.log('  · ' + x);
    ok(issues.length === 0, `${appearance}: ${where} – Abstände (${issues.length} Befunde)`);
    const fi = await auditFields(p, where);
    for (const x of fi) console.log('  · ' + x);
    ok(fi.length === 0, `${appearance}: ${where} – Text mittig in Feldern (${fi.length} Befunde)`);
    if (shotName) await p.screenshot({ path: join(out, `${appearance}-${shotName}.png`), fullPage: true });
  };

  for (const r of ROUTES) {
    await p.goto(srv.url + '/index.html' + r); await p.waitForTimeout(300);
    await check(r, r.replace(/[#/]+/g, '_') || 'root');
  }
  // Gewichtsziel mit Plan
  await p.goto(srv.url + '/index.html#/ich/gewichtsziel'); await p.waitForTimeout(250);
  await p.fill('input[aria-label="Ø Gesamtverbrauch der letzten Wochen (kcal/Tag)"]', '2400');
  await p.fill('input[aria-label="Zielgewicht"]', '60'); await p.waitForTimeout(150);
  await check('#/ich/gewichtsziel (mit Plan)', 'gewichtsziel-plan');
  await p.click('.seg button:has-text("Schätzen")'); await p.waitForTimeout(150);
  await check('#/ich/gewichtsziel (Schätzen)', 'gewichtsziel-schaetzen');

  // Sheets
  await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(400);
  const sheets = [
    ['„+“-Menü', async () => { await p.click('.tab-plus'); await p.waitForTimeout(300); }],
    ['Lebensmittel suchen', async () => viaPlus(p, 'Lebensmittel')],
    ['Schnell – nur kcal', async () => viaPlus(p, 'Schnell')],
    ['Koffein eintragen', async () => { await viaPlus(p, 'Koffein'); await p.locator('.sheet .caf-pick .row').first().click(); await p.waitForTimeout(150); }],
    ['Alkohol eintragen', async () => { await viaPlus(p, 'Alkohol'); await p.locator('.sheet .caf-pick .row').first().click(); await p.waitForTimeout(150); }],
    ['Gewicht eintragen', async () => viaPlus(p, 'Gewicht')],
    ['Wasser-Details', async () => { await p.click('.trk.water'); await p.waitForTimeout(300); }],
    ['Koffein-Details', async () => { await p.click('.trk.caf'); await p.waitForTimeout(300); }],
    ['Gewicht-Details', async () => { await p.click('.trk.weight'); await p.waitForTimeout(300); }]
  ];
  for (const [n, open] of sheets) {
    await open();
    await check(`Sheet ${n}`, 'sheet-' + n.replace(/[^a-z]+/gi, '-').toLowerCase());
    await close();
  }
  // Mengen-Dialog
  await viaPlus(p, 'Lebensmittel');
  await p.fill('input[aria-label="Lebensmittel suchen"]', 'haferflocken'); await p.waitForTimeout(250);
  await p.locator('.sheet .results .row').first().click(); await p.waitForTimeout(300);
  await check('Sheet Mengen-Dialog', 'sheet-menge');
  await close();
  // Supplement bearbeiten
  await p.goto(srv.url + '/index.html#/ich/supplements'); await p.waitForTimeout(250);
  await p.click('button:has-text("+ Supplement hinzufügen")'); await p.waitForTimeout(250);
  await p.locator('.sheet .plain-btn:has-text("Vitamin D3")').click(); await p.waitForTimeout(350);
  await check('Sheet Supplement bearbeiten', 'sheet-supp');
  await close();

  ok(errs.length === 0, `${appearance}: keine Seitenfehler${errs.length ? ' – ' + errs.join(' | ') : ''}`);
  await ctx.close();
}
await b.close(); await srv.close();
console.log('Screenshots: ' + out);
done();
