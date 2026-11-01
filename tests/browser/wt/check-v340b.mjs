// Übernommen aus dem Workout-Tracker 3.14.0 (tests/browser/check-v340b.mjs, MIT, ST0PTV), angepasst für The Tracker:
// Pfade #/training/…, Module unter js/features/training/, Speicher tt_training_…; Abweichungen unten mit „The Tracker:“ markiert.
// v3.4.0: Vorlage „Beweglichkeit Arme & Hände 5 min“ unter Pläne → Routinen; ohne Plan startbar. Dunkel und hell.
// Aufruf: node tests/browser/check-v340b.mjs [Ordner für Screenshots]
import { launch, startServer, checker, settle } from './lib.mjs';

const shots = process.argv[2] || null;
const srv = await startServer();
const b = await launch();
const { ok, done } = checker();

for (const theme of ['dark', 'light']) {
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })).newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(srv.url + '/index.html#/training/plaene'); await settle(p, 400);
  if (theme === 'light') await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await p.getByRole('tab', { name: 'Routinen' }).click(); await settle(p, 300);
  const list = await p.evaluate(() => document.getElementById('view').innerText);
  ok(/Mobilitätsprogramm 15 min/.test(list) && /13 Übungen/.test(list) || /Mobilitätsprogramm 15 min/.test(list), `${theme}: Mobilitätsprogramm in der Liste`);
  ok(/Beweglichkeit Arme & Hände 5 min/.test(list), `${theme}: Vorlage in der Liste`);
  await p.getByText('Beweglichkeit Arme & Hände 5 min').first().click(); await settle(p, 300);
  const sh = await p.evaluate(() => [...document.querySelectorAll('.sheet')].pop()?.innerText || '');
  ok(/7 Übungen/.test(sh) && /Schulterdrücken ohne Gewicht/.test(sh) && /Umgekehrter Unterarm-Curl ohne Gewicht/.test(sh), `${theme}: Detail mit 7 Übungen`);
  ok(!/object HTML/.test(sh), `${theme}: kein [object HTML…]`);
  if (shots) await p.screenshot({ path: `${shots}/v340b-${theme}-detail.png` });
  await p.getByRole('button', { name: 'Starten', exact: true }).click(); await settle(p, 400);
  const run = await p.evaluate(() => document.body.innerText);
  ok(/Armkreisen/.test(run), `${theme}: startet ohne Plan mit Armkreisen`);
  if (shots) await p.screenshot({ path: `${shots}/v340b-${theme}-run.png` });
  ok(errs.length === 0, `${theme}: keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
  await p.context().close();
}
await b.close(); await srv.close();
done();
