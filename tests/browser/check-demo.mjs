// Beispieldaten im Browser: unter „Ich“ laden, gestern im Journal sehen, wieder entfernen; echte Einträge und
// fremde Keys bleiben. Aufruf: node tests/browser/check-demo.mjs
import { launch, startServer, checker, outDir } from './lib.mjs';
import { join } from 'node:path';

const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('demo');
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' })).newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(srv.url + '/index.html');
await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ct.v1', '{"fremd":1}'); });
await p.reload(); await p.waitForTimeout(300);

await p.goto(srv.url + '/index.html#/ich'); await p.waitForTimeout(200);
await p.click('button:has-text("Beispieldaten laden")');
await p.waitForFunction(() => /Beispiel-Einträge vorhanden/.test(document.body.innerText), null, { timeout: 10000 });
ok(true, 'Beispieldaten geladen');
await p.screenshot({ path: join(out, 'ich.png') });

await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(200);
let t = await p.evaluate(() => document.body.innerText);
ok(/2\.150/.test(t), 'Beispielziel 2.150 kcal gesetzt');
await p.click('button[aria-label="Vorheriger Tag"]'); await p.waitForTimeout(200);
t = await p.evaluate(() => document.body.innerText);
ok(t.includes('Gestern') && /Einträge · /.test(t), 'gestern hat Mahlzeiten mit Einträgen');
await p.screenshot({ path: join(out, 'gestern.png') });

await p.goto(srv.url + '/index.html#/ich'); await p.waitForTimeout(200);
await p.click('button:has-text("Entfernen")'); await p.waitForTimeout(200);
const days = await p.evaluate(() => JSON.parse(localStorage.getItem('tt_days') || '{}'));
ok(Object.keys(days).length === 0, 'nach dem Entfernen keine Beispiel-Einträge');
ok(await p.evaluate(() => localStorage.getItem('ct.v1')) === '{"fremd":1}', 'ct.v1 unverändert');
ok(errs.length === 0, `keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
console.log(`Screenshots: ${out}`);
await b.close(); await srv.close();
done();
