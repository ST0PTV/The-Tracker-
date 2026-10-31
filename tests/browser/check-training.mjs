// Trainingsbereich (0.3.1): Unterreiter mit Beispieldaten, spätes Laden (Bereich beim Öffnen, Animationsdaten erst bei „Technik“),
// Animation mit VoiceOver-Beschreibung, Training starten, Muskelkarte; keine Konsolenfehler, nur tt_-Keys,
// Stil des Trainingsbereichs nur auf dessen Seiten (body.tt-train). Hell und dunkel.
import { launch, startServer, checker, outDir, BAD_TEXT } from './lib.mjs';
import { join } from 'node:path';

const SUBS = ['#/training', '#/training/plaene', '#/training/uebungen', '#/training/fortschritt', '#/ich/training'];
const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('training');

for (const appearance of ['dark', 'light']) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = [], loaded = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('request', (r) => { const u = r.url(); if (/anim-data\.js|training\/main\.js|training\.css/.test(u)) loaded.push(u.split('/').pop()); });
  await p.goto(srv.url + '/index.html');
  await p.evaluate((a) => { localStorage.clear(); localStorage.setItem('wt_settings', '{"fremd":1}'); localStorage.setItem('tt_settings', JSON.stringify({ appearance: a })); }, appearance);
  await p.reload(); await p.waitForTimeout(500);
  ok(loaded.length === 0, `${appearance}: beim Start kein Trainingscode, keine Animationsdaten`);
  ok(!(await p.evaluate(() => document.body.classList.contains('tt-train'))), `${appearance}: „Heute“ ohne Trainingsstil`);
  await p.evaluate(() => import('./js/features/training/demo.js').then((m) => m.loadTrainingDemo()));

  for (const r of SUBS) {
    await p.goto(srv.url + '/index.html' + r); await p.waitForTimeout(800);
    const t = await p.evaluate(() => document.querySelector('#view').innerText);
    ok(!BAD_TEXT.test(t), `${appearance} ${r}: kein null/undefined/NaN`);
    ok(await p.evaluate(() => document.body.classList.contains('tt-train')), `${appearance} ${r}: Trainingsstil aktiv`);
    if (r !== '#/ich/training') {
      const cur = await p.locator('.tr-sub a[aria-current="page"]').getAttribute('href');
      ok(cur === r, `${appearance} ${r}: Unterreiter aktiv`);
      ok(t.includes('(Beispiel)') || r === '#/training/uebungen' || r === '#/training/fortschritt', `${appearance} ${r}: Beispieldaten sichtbar`);
    }
    await p.screenshot({ path: join(out, `${appearance}${r.replace(/[#/]+/g, '_')}.png`) });
  }
  ok(loaded.includes('main.js') && loaded.includes('training.css') && !loaded.includes('anim-data.js'), `${appearance}: Trainingsbereich geladen, Animationsdaten noch nicht`);

  // Animation erst bei „Technik“
  await p.goto(srv.url + '/index.html#/training/uebungen'); await p.waitForTimeout(700);
  await p.locator('#view').getByText('Kniebeuge', { exact: true }).first().click(); await p.waitForTimeout(600);
  await p.locator('.sheet button', { hasText: 'Technik' }).first().click(); await p.waitForTimeout(1500);
  ok(loaded.includes('anim-data.js'), `${appearance}: Animationsdaten beim Öffnen geladen`);
  const label = await p.evaluate(() => document.querySelector('.sheet .anim-svg')?.getAttribute('aria-label') || '');
  ok(/^Animation: Kniebeuge\. Ablauf: .+ Kernpunkte: 1\./.test(label), `${appearance}: VoiceOver-Beschreibung der Animation`);
  const vis = await p.evaluate(() => document.querySelector('.sheet').innerText);
  ok(!vis.includes('Ablauf:'), `${appearance}: Beschreibung nicht sichtbar`);
  await p.screenshot({ path: join(out, `${appearance}-technik.png`) });

  // Training starten (frei) und Muskelkarte
  await p.goto(srv.url + '/index.html#/training'); await p.waitForTimeout(700);
  await p.locator('#view button', { hasText: 'Freies Training starten' }).first().click(); await p.waitForTimeout(800);
  ok((await p.evaluate(() => document.querySelector('#view').innerText)).includes('Freies Training'), `${appearance}: freies Training läuft`);
  await p.goto(srv.url + '/index.html#/training/fortschritt'); await p.waitForTimeout(600);
  await p.locator('#view button', { hasText: 'Muskeln' }).first().click(); await p.waitForTimeout(800);
  ok(await p.locator('#view svg').count() > 0, `${appearance}: Muskelkarte gezeichnet`);

  // Zurück auf andere Seiten: Trainingsstil aus
  await p.goto(srv.url + '/index.html#/rezepte'); await p.waitForTimeout(500);
  ok(!(await p.evaluate(() => document.body.classList.contains('tt-train'))), `${appearance}: Rezepte ohne Trainingsstil`);
  const keys = await p.evaluate(() => Object.keys(localStorage));
  ok(keys.every((k) => k.startsWith('tt_') || k === 'wt_settings'), `${appearance}: nur eigene Keys (${keys.filter((k) => !k.startsWith('tt_')).join(', ')})`);
  ok((await p.evaluate(() => localStorage.getItem('wt_settings'))) === '{"fremd":1}', `${appearance}: wt_-Key unberührt`);
  ok(errs.length === 0, `${appearance}: keine Konsolenfehler${errs.length ? ' – ' + errs.slice(0, 3).join(' | ') : ''}`);
  await ctx.close();
}
await b.close(); await srv.close();
done();
