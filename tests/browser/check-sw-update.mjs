// Service-Worker-Update (0.5.4, Vorbild QRate): Beim ersten Besuch kein Neuladen; übernimmt eine neue Version,
// lädt die Seite genau einmal neu; mit getipptem Text erst, wenn die App in den Hintergrund geht.
// Echter Service Worker (127.0.0.1 ist ein sicherer Kontext). Eigener kleiner Server: Den Update-Abruf von sw.js fängt
// Playwright nicht ab (gemessen 2026-11-21), daher liefert der Server sw.js mit wechselndem Inhalt selbst aus.
// Aufruf: node tests/browser/check-sw-update.mjs
import { launch, checker, settle, ROOT } from './lib.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { createServer } from 'node:http';

let swVersion = 1;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path.endsWith('/')) path += 'index.html';
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(normalize(ROOT)) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
  let body = readFileSync(file);
  // Jede Fassung unterscheidet sich im Text → der Browser sieht ein Update
  if (path === '/sw.js') body = Buffer.from(body.toString('utf8') + '\n// Testfassung ' + swVersion + '\n');
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  res.end(body);
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

// 2. Update in derselben Sitzung wie der erste Besuch (Home-Bildschirm-App bleibt lange offen): einmal neu laden
loads = 0;
await p.evaluate(() => { window.__marker = 1; });
let l = nextLoad();
await update();
await l; await settle(p, 800);
ok(loads === 1 && !(await p.evaluate(() => window.__marker)), `Update in der ersten Sitzung: einmal neu geladen (Ladevorgänge ${loads})`);

// 3. Späterer Start, neue Version ohne Tippen: genau einmal neu laden
loads = 0;
await p.evaluate(() => { window.__marker = 1; });
l = nextLoad();
await update();
await l; await settle(p, 800);
ok(loads === 1 && !(await p.evaluate(() => window.__marker)), `neue Version: einmal neu geladen (Ladevorgänge ${loads})`);

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
l = nextLoad();
await p.evaluate(() => { location.hash = '#/ich'; });
await l; await settle(p, 600);
ok(loads === 1 && !(await p.evaluate(() => window.__marker)), `Feld leer + Seitenwechsel: einmal neu geladen (Ladevorgänge ${loads})`);

ok(errs.length === 0, `keine Seitenfehler ${errs.slice(0, 3).join(' | ')}`);
await b.close(); await new Promise((r) => server.close(r));
done();
