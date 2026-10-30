// Mangel nach Diagnose und Nüsse getrennt (0.3.0) im Browser: Schalter unter „Ernährung & Rezepte“ mit DGE-Werten,
// Schilder „viel …“ an Rezepten, Wochenplan-Karte, Mikronährstoffe gegen DGE mit Markierung; Erdnuss-Allergie sperrt
// Erdnuss-Rezepte, Walnuss-Rezepte bleiben. Prüft fremde Keys, Konsolenfehler, null/undefined/NaN; Screenshots hell/dunkel.
// Aufruf: node tests/browser/check-defizit.mjs
import { launch, startServer, checker, outDir, BAD_TEXT } from './lib.mjs';
import { join } from 'node:path';

const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('defizit');
const FOREIGN = { 'rezeptbuch-v1': '{"profile":{"deficits":["fe"]}}', 'ct.v1': '{"x":1}', wt_x: '1' };

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
    localStorage.setItem('tt_profile', JSON.stringify({ sex: 'f', weightKg: 64, heightCm: 168, birthYear: 1995, cycle: 'yes' }));
    localStorage.setItem('tt_recipes', JSON.stringify({ started: true }));
  }, [appearance, FOREIGN]);
  await p.reload(); await p.waitForTimeout(400);
  const nav = async (hash, wait = 1500) => { await p.evaluate((x) => { location.hash = x; }, hash); await p.waitForTimeout(wait); };
  const text = () => p.evaluate(() => document.body.innerText);
  const shot = (name) => p.screenshot({ path: join(out, `${appearance}-${name}.png`) });
  const prof = () => p.evaluate(() => JSON.parse(localStorage.getItem('tt_profile')));

  await nav('#/ich/ernaehrung');
  ok(await p.locator('.df-row').count() === 8 && /16 mg pro Tag \(DGE\) · mit Regelblutung/.test(await text()) && /150 µg pro Tag \(DGE\)/.test(await text()), `${appearance}: 8 Schalter mit DGE-Werten (Eisen 16 mg, Jod 150 µg)`);
  ok(await p.locator('.rz-rich').count() === 0, `${appearance}: ohne Mangel keine Schilder`);
  await p.locator('.df-row', { hasText: 'Eisen' }).locator('input').check(); await p.waitForTimeout(200);
  await p.locator('.df-row', { hasText: 'Vitamin B12' }).locator('input').check(); await p.waitForTimeout(200);
  ok(JSON.stringify((await prof()).deficits) === '["fe","b12"]', `${appearance}: Mangel im Profil (tt_profile.deficits)`);
  await p.evaluate(() => { document.getElementById('view').scrollTop = 99999; }); await p.waitForTimeout(150);
  await shot('1-einstellung');

  await nav('#/rezepte');
  ok(await p.locator('.rz-rich').count() > 0 && /viel (Eisen|Vitamin B12)/.test(await text()), `${appearance}: Schilder „viel …“ an Rezepten`);
  ok(!BAD_TEXT.test(await text()), `${appearance}: Rezepte ohne null/undefined/NaN`);
  await shot('2-rezepte');
  await nav('#/rezepte/woche', 2500);
  ok(await p.locator('.wk-def .wk-def-bar').count() === 2 && /Schnitt pro Tag \(Schätzung\)/.test(await text()), `${appearance}: Wochenplan-Karte mit 2 Balken`);
  await shot('3-woche');
  await nav('#/analyse/mikro');
  await p.locator('.info-btn').first().click(); await p.waitForTimeout(300);
  ok(/DGE-Referenzwert/.test(await text()), `${appearance}: Mikronährstoffe gegen DGE`);
  await p.locator('.sheet .sheet-close').last().click(); await p.waitForTimeout(250);

  // Nüsse getrennt
  await nav('#/ich/ernaehrung');
  await p.locator('.chips[aria-label="Allergene"] .chip', { hasText: 'Erdnuss' }).click(); await p.waitForTimeout(200);
  await nav('#/rezepte');
  await p.fill('input[placeholder="Rezept oder Zutat suchen"]', 'Erdnuss'); await p.waitForTimeout(400);
  const cnt = async () => Number(((await p.locator('.rz-count').innerText()).match(/\d+/) || [0])[0]);
  const pea = await cnt();
  await p.fill('input[placeholder="Rezept oder Zutat suchen"]', 'Walnüsse'); await p.waitForTimeout(400);
  const wal = await cnt();
  ok(pea === 0 && wal > 0, `${appearance}: Erdnuss-Allergie sperrt Erdnuss (${pea}), Walnuss bleibt (${wal})`);

  const keys = await p.evaluate(() => ({ all: Object.keys(localStorage), rb: localStorage.getItem('rezeptbuch-v1'), ct: localStorage.getItem('ct.v1') }));
  ok(keys.all.every((k) => k.startsWith('tt_') || k in FOREIGN), `${appearance}: nur tt_-Keys geschrieben`);
  ok(keys.rb === FOREIGN['rezeptbuch-v1'] && keys.ct === FOREIGN['ct.v1'], `${appearance}: fremde Daten unverändert`);
  ok(errs.length === 0, `${appearance}: keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
  await ctx.close();
}
await b.close(); await srv.close();
done();
