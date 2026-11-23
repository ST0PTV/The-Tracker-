// Service-Worker-Update (0.5.4, Vorbild QRate): Beim ersten Besuch kein Neuladen; übernimmt eine neue Version,
// lädt die Seite genau einmal neu; mit getipptem Text erst, wenn die App in den Hintergrund geht.
// Echter Service Worker (127.0.0.1 ist ein sicherer Kontext). Eigener kleiner Server: Den Update-Abruf von sw.js fängt
// Playwright nicht ab (gemessen 2026-11-21), daher liefert der Server sw.js mit wechselndem Inhalt selbst aus.
// Aufruf: node tests/browser/check-sw-update.mjs
import { launch, checker, settle, serveFile } from './lib.mjs';
import { createServer } from 'node:http';

let swVersion = 1;
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  const r = await serveFile(path);
  // Jede Fassung unterscheidet sich im Text → der Browser sieht ein Update
  if (path === '/sw.js' && r.status === 200) r.body = Buffer.from(r.body.toString('utf8') + '\n// Testfassung ' + swVersion + '\n');
  res.writeHead(r.status, r.headers); res.end(r.body);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}`;

const b = await launch();
const { ok, done } = checker();
const errs = [];
const ctx = await b.newContext({ viewport: { width: 390, height: 760 }, serviceWorkers: 'allow' });
const p = await ctx.newPage();
p.on('pageerror', (e) => errs.push(String(e)));
let loads = 0;
p.on('load', () => { loads++; });

// update() nicht abwarten: Lädt die Seite schon neu, bevor r.update() zurückkommt, wäre der Kontext weg
const update = async () => {
  swVersion++;
  await p.evaluate(() => { navigator.serviceWorker.getRegistration().then((r) => r.update()).catch(() => {}); }).catch(() => {});
};
// Auf das nächste load warten (waitForFunction bricht beim Seitenwechsel sofort ab); null = kam nicht
const nextLoad = () => p.waitForEvent('load', { timeout: 15000 }).catch(() => null);
const countChanges = () => p.evaluate(() => { window.__cc = 0; navigator.serviceWorker.addEventListener('controllerchange', () => { window.__cc++; }); });
const changed = async () => { await p.waitForFunction(() => window.__cc > 0, null, { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(800); return p.evaluate(() => window.__cc); };
const hide = () => p.evaluate(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  document.dispatchEvent(new Event('visibilitychange'));
});

// 1. Erster Besuch: Service Worker übernimmt (clients.claim) – kein Neuladen
await p.goto(url + '/index.html#/ich');
await p.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 15000 });
await settle(p, 800);
ok(loads === 1, `erster Besuch: Service Worker aktiv, kein Neuladen (Ladevorgänge ${loads})`);

// Update ohne Tippen: Seite lädt genau einmal neu (Marker ist danach weg)
const expectOneReload = async (label) => {
  loads = 0;
  await p.evaluate(() => { window.__marker = 1; });
  const l = nextLoad();
  await update();
  await l; await settle(p, 800);
  ok(loads === 1 && !(await p.evaluate(() => window.__marker)), `${label}: einmal neu geladen (Ladevorgänge ${loads})`);
};

// 2. Update in derselben Sitzung wie der erste Besuch (Home-Bildschirm-App bleibt lange offen): einmal neu laden
await expectOneReload('Update in der ersten Sitzung');

// 3. Noch eine neue Version in derselben Sitzung: wieder genau einmal neu laden
await expectOneReload('neue Version');

// 4. Neue Version, während Text getippt ist: kein Neuladen – auch nicht beim Wechsel in den Hintergrund
await p.goto(url + '/index.html#/ich/lebensmittel'); await settle(p, 400);
loads = 0;
const field = p.locator('#view input:not([type=hidden]):not([type=checkbox]):not([type=radio])').first();
await field.fill('Haferflocken');
await p.evaluate(() => { window.__marker = 2; });
await countChanges();
await update();
const cc = await changed();
ok(cc === 1 && loads === 0, `beim Tippen: neue Version übernommen, kein Neuladen (Wechsel ${cc}, Ladevorgänge ${loads})`);
await hide(); await p.waitForTimeout(1500);
ok(loads === 0 && (await p.evaluate(() => window.__marker)) === 2, `Hintergrund mit Text im Feld: Entwurf bleibt, kein Neuladen (Ladevorgänge ${loads})`);

// 5. Feld leer, dann auf eine andere Seite: jetzt einmal neu laden
await field.fill('');
const l = nextLoad();
await p.evaluate(() => { location.hash = '#/ich'; });
await l; await settle(p, 600);
ok(loads === 1 && !(await p.evaluate(() => window.__marker)), `Feld leer + Seitenwechsel: einmal neu geladen (Ladevorgänge ${loads})`);

ok(errs.length === 0, `keine Seitenfehler ${errs.slice(0, 3).join(' | ')}`);
await b.close(); await new Promise((r) => server.close(r));
done();
