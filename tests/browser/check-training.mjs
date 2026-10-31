// Trainingsbereich (0.3.1): Unterreiter mit Beispieldaten, spätes Laden (Bereich beim Öffnen, Animationsdaten erst bei „Technik“),
// Animation mit VoiceOver-Beschreibung, Training starten, Muskelkarte; keine Konsolenfehler, nur tt_-Keys,
// Stil des Trainingsbereichs nur auf dessen Seiten (body.tt-train). Ab 0.3.2: Zykluskarte aus dem Zyklus von The Tracker
// (Beispiel-Zyklen, Sheet schreibt in tt_zyklus, wt_cycle unberührt, PIN sperrt die ganze App, Schein-PIN leer). Hell und dunkel.
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

  // Zyklus (0.3.2): aus ohne Profil-Angabe, mit Beispiel-Zyklen „Tag 10“, Sheet schreibt in den Zyklus von The Tracker
  await p.evaluate(async () => { localStorage.setItem('wt_cycle', '{"enabled":true}'); (await import('./js/features/training/session.js')).discard(); }); // freies Training von oben beenden
  await p.goto(srv.url + '/index.html#/training'); await p.waitForTimeout(600);
  ok(await p.locator('.cyc-line').count() === 0, `${appearance}: ohne Zyklus keine Zykluszeile`);
  await p.evaluate(async () => {
    const P = await import('./js/core/profile.js'); P.setProfile({ sex: 'f' });
    const C = await import('./js/features/cycle/cycle.js'); const D = await import('./js/features/dev/demo.js'); const F = await import('./js/core/format.js');
    C.loadDemoCycle(D.generateDemoCycle({ today: F.isoDate() }));
  });
  await p.goto(srv.url + '/index.html#/training/plaene'); await p.goto(srv.url + '/index.html#/training'); await p.waitForTimeout(700);
  ok(/Zyklus: Tag 10/.test(await p.locator('.cyc-line').innerText().catch(() => '')), `${appearance}: Zykluszeile „Tag 10“ aus Beispiel-Zyklen`);
  await p.locator('.cyc-line').click(); await p.waitForTimeout(600);
  const sheetText = await p.locator('.sheet').innerText();
  ok(/Periode/.test(sheetText) && /Schätzung/.test(sheetText) && /Leichter Tag/.test(sheetText), `${appearance}: Sheet mit Vorhersage und leichtem Tag`);
  await p.screenshot({ path: join(out, `${appearance}-zyklus-sheet.png`) });
  await p.locator('.sheet .chip', { hasText: 'Krämpfe' }).click(); await p.waitForTimeout(300);
  const today = await p.evaluate(async () => (await import('./js/core/format.js')).isoDate());
  const z = await p.evaluate((t) => JSON.parse(localStorage.getItem('tt_zyklus')).days[t] || {}, today);
  ok((z.body || []).includes('Unterleibskrämpfe'), `${appearance}: „Krämpfe“ landet als Unterleibskrämpfe im Tageseintrag`);
  ok(await p.locator('.sheet .chip.on', { hasText: 'Krämpfe' }).count() === 1, `${appearance}: Chip zeigt den Zustand`);
  await p.locator('.sheet a', { hasText: 'Alle Angaben für heute' }).click(); await p.waitForTimeout(600);
  ok(p.url().includes('#/zyklus/tag') && /Unterleibskrämpfe/.test(await p.evaluate(() => document.querySelector('#view').innerText)), `${appearance}: „Alle Angaben“ öffnet den Tageseintrag`);
  ok((await p.evaluate(() => localStorage.getItem('wt_cycle'))) === '{"enabled":true}', `${appearance}: wt_cycle unberührt`);
  // PIN: ganze App gesperrt, auch Training; Schein-PIN zeigt leeren Zyklus
  await p.evaluate(async () => { const L = await import('./js/core/lock.js'); await L.setPin('pin', '2580'); await L.setPin('decoy', '1357'); });
  await p.reload(); await p.waitForTimeout(500);
  await p.goto(srv.url + '/index.html#/training'); await p.waitForTimeout(500);
  ok(/The Tracker ist gesperrt/.test(await p.evaluate(() => document.body.innerText)) && await p.locator('.cyc-line').count() === 0, `${appearance}: mit PIN auch Training gesperrt`);
  ok(!(await p.evaluate(() => document.body.classList.contains('tt-train'))), `${appearance}: Sperrbildschirm ohne Trainingsstil`);
  await p.fill('.lock input', '1357'); await p.click('.lock button:has-text("Entsperren")'); await p.waitForTimeout(900);
  ok(/Zyklus: Ersten Periodentag eintragen/.test(await p.locator('.cyc-line').innerText().catch(() => '')), `${appearance}: Schein-PIN zeigt leeren Zyklus`);
  await p.reload(); await p.waitForTimeout(400);
  await p.fill('.lock input', '2580'); await p.click('.lock button:has-text("Entsperren")'); await p.waitForTimeout(400);
  await p.evaluate(async () => { (await import('./js/core/lock.js')).clearPin('pin'); });

  // Zurück auf andere Seiten: Trainingsstil aus
  await p.goto(srv.url + '/index.html#/rezepte'); await p.waitForTimeout(500);
  ok(!(await p.evaluate(() => document.body.classList.contains('tt-train'))), `${appearance}: Rezepte ohne Trainingsstil`);
  const keys = await p.evaluate(() => Object.keys(localStorage));
  ok(keys.every((k) => k.startsWith('tt_') || k === 'wt_settings' || k === 'wt_cycle'), `${appearance}: nur eigene Keys (${keys.filter((k) => !k.startsWith('tt_')).join(', ')})`);
  ok((await p.evaluate(() => localStorage.getItem('wt_settings'))) === '{"fremd":1}', `${appearance}: wt_-Key unberührt`);
  ok(errs.length === 0, `${appearance}: keine Konsolenfehler${errs.length ? ' – ' + errs.slice(0, 3).join(' | ') : ''}`);
  await ctx.close();
}
await b.close(); await srv.close();
done();
