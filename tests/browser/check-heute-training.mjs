// Trainingskarte auf „Heute“ (0.3.2, Variante B): sichtbar mit Beispieldaten, Woche Mo–So, Start aus der Karte
// öffnet das laufende Training, dann „Training läuft“ mit „Fortsetzen“; abschaltbar unter „Ich → Training“;
// kein Trainingsbereich (main.js) und keine Animationsdaten beim Start von „Heute“. Hell und dunkel.
import { launch, startServer, checker, outDir, BAD_TEXT, settle } from './lib.mjs';
import { join } from 'node:path';

const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('heute-training');

for (const appearance of ['dark', 'light']) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = [], loaded = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('request', (r) => { const u = r.url(); if (/training\/(main|anim-data|session|plan-duration)\.js|training\.css/.test(u)) loaded.push(u.split('/').pop()); });
  await p.goto(srv.url + '/index.html');
  await p.evaluate((a) => { localStorage.clear(); localStorage.setItem('tt_settings', JSON.stringify({ appearance: a })); }, appearance);
  await p.reload(); await settle(p, 400);
  ok(await p.locator('.tt-today').count() === 1 && /Noch kein Plan/.test(await p.locator('.tt-today').innerText()), `${appearance}: ohne Pläne Karte „Noch kein Plan“`);
  await p.evaluate(() => import('./js/features/training/demo.js').then((m) => m.loadTrainingDemo()));
  loaded.length = 0;
  await p.reload(); await p.waitForFunction(() => /ca\. \d+ min/.test(document.querySelector('.tt-today')?.innerText || ''), null, { timeout: 1200 }).catch(() => {}); await settle(p, 300); // 0.4.0: bis die Dauer nachgeladen ist (letzter Nachlade-Schritt, vorher feste 1200 ms)
  ok(!loaded.includes('main.js') && !loaded.includes('anim-data.js') && !loaded.includes('session.js') && !loaded.includes('training.css'), `${appearance}: Heute lädt keinen Trainingsbereich (${loaded.join(', ')})`);
  const card = p.locator('.tt-today');
  const t = await card.innerText();
  ok(/Training/.test(t) && /\(Beispiel\)/.test(t) && /Diese Woche: \d+ Trainings? · \d+ S/.test(t), `${appearance}: nächster Plan und Wochenzeile`);
  ok(/ca\. \d+ min/.test(t), `${appearance}: Dauer nachgeladen (Schätzung)`);
  ok(await card.locator('.tt-day').count() === 7 && await card.locator('.tt-day.now').count() === 1, `${appearance}: Woche Mo–So mit heute`);
  ok(!BAD_TEXT.test(t) && !/Serie|Ziel/.test(t), `${appearance}: kein null/NaN, keine Serie, kein Ziel`);
  const box = await card.boundingBox(); const btn = await card.locator('.trk-plus').boundingBox();
  ok(btn.x + btn.width <= box.x + box.width - 8, `${appearance}: Startknopf in der Karte`);
  await card.screenshot({ path: join(out, `${appearance}-karte.png`) });
  await card.locator('.trk-plus').click(); await settle(p, 1500);
  ok(p.url().endsWith('#/training') && await p.evaluate(() => JSON.parse(localStorage.getItem('tt_training_sessions')).some((s) => s.endedAt === null)), `${appearance}: Start aus der Karte öffnet laufendes Training`);
  await p.goto(srv.url + '/index.html#/'); await settle(p, 600);
  const run = await p.locator('.tt-today').innerText();
  ok(/Training läuft/.test(run) && /Fortsetzen/.test(run) && /0 von \d Übungen/.test(run), `${appearance}: Karte zeigt „Training läuft“`);
  await p.locator('.tt-today').screenshot({ path: join(out, `${appearance}-laeuft.png`) });
  await p.locator('.tt-today .tt-go').click(); await settle(p, 800);
  ok(p.url().endsWith('#/training'), `${appearance}: „Fortsetzen“ öffnet das Training`);
  await p.evaluate(async () => (await import('./js/features/training/session.js')).discard());
  await p.goto(srv.url + '/index.html#/ich/training'); await settle(p, 800);
  await p.locator('input[aria-label="Karte auf „Heute“"]').click(); await settle(p, 300);
  await p.goto(srv.url + '/index.html#/'); await settle(p, 500);
  ok(await p.locator('.tt-today').count() === 0, `${appearance}: Karte abschaltbar`);
  ok(errs.length === 0, `${appearance}: keine Konsolenfehler${errs.length ? ' – ' + errs.slice(0, 3).join(' | ') : ''}`);
  await ctx.close();
}
await b.close(); await srv.close();
done();
