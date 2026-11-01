// Gemeinsame Helfer für die Browser-Prüfskripte (tests/browser/*.mjs).
// Übernommen aus Workout-Tracker/tests/browser/lib.mjs (MIT, ST0PTV); Workout-spezifische Helfer entfernt.
// Keine Abhängigkeiten im Repo: Playwright und Chromium werden in der Umgebung gesucht.
//   TT_URL        fertiger Server (z. B. http://localhost:8765); sonst startet startServer() einen eigenen
//   TT_ROUTE=0    Dateien über den echten Server statt über Playwright-Routen laden (siehe launch)
//   TT_OUT        Ausgabeordner für Screenshots/Streifen (Standard: <tmp>/tt-browser)
//   CHROMIUM_PATH Chromium-Programm (Standard: Headless-Shell unter /opt/pw-browsers, sonst Playwright-Standard)
//   PLAYWRIGHT_MODULE  Ordner des Pakets "playwright", falls es nicht über import() gefunden wird
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, extname, normalize } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const rootUrl = (p) => pathToFileURL(join(ROOT, p)).href;

/** App-Version aus js/core/version.js (einzige Quelle). */
export function appVersion() {
  const m = readFileSync(join(ROOT, 'js/core/version.js'), 'utf8').match(/VERSION\s*=\s*'([^']+)'/);
  if (!m) throw new Error('VERSION in js/core/version.js nicht gefunden');
  return m[1];
}

export function outDir(sub = '') {
  const d = join(process.env.TT_OUT || join(tmpdir(), 'tt-browser'), sub);
  mkdirSync(d, { recursive: true });
  return d;
}

export async function loadPlaywright() {
  try { return await import('playwright'); } catch { /* weiter */ }
  const candidates = [process.env.PLAYWRIGHT_MODULE, '/opt/npm-tools/node_modules/playwright', '/opt/node-tools/node_modules/playwright'].filter(Boolean);
  for (const c of candidates) {
    if (existsSync(c)) return await import(pathToFileURL(join(c, 'index.mjs')).href).catch(() => import(pathToFileURL(join(c, 'index.js')).href));
  }
  throw new Error('Playwright nicht gefunden (PLAYWRIGHT_MODULE setzen oder "npm i playwright" außerhalb des Repos).');
}

function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const base = '/opt/pw-browsers';
  if (!existsSync(base)) return undefined;
  const dir = readdirSync(base).find((d) => d.startsWith('chromium_headless_shell-'));
  const exe = dir && join(base, dir, 'chrome-linux/headless_shell');
  return exe && existsSync(exe) ? exe : undefined;
}

// 0.4.0: Jeder neue Kontext bekommt eine Route für die Adressen von startServer(); die Dateien kommen direkt von der Platte.
// Grund (gemessen 2026-11-01, Windows mit Norton 360): ab 4 gleichzeitigen Browsern blieben neue Verbindungen zu 127.0.0.1
// 10–30 s hängen, obwohl der Server in ≤ 13 ms antwortete. Ursprung und Seiten bleiben gleich (sicherer Kontext 127.0.0.1);
// was die Route nicht erfasst, geht weiter an den echten Server.
export async function launch(args = []) {
  const { chromium } = await loadPlaywright();
  const b = await chromium.launch({ executablePath: chromiumPath(), args });
  if (process.env.TT_ROUTE === '0') return b;
  const newContext = b.newContext.bind(b);
  b.newContext = async (opts) => {
    const ctx = await newContext(opts);
    ctx.on('page', trackNet);
    await ctx.route((url) => SERVED.has(url.origin), async (route) => {
      const r = await serveFile(new URL(route.request().url()).pathname);
      await route.fulfill({ status: r.status, body: r.body, headers: r.headers });
    });
    return ctx;
  };
  return b;
}

/**
 * Chromium-Schalter für eine Test-Kamera mit kleinem Bild (160×120, grau, 5 Bilder/s, Y4M-Datei in dir).
 * 0.4.0: Der Standard-Testbildgeber liefert 1080p; der Scanner (ZXing, TRY_HARDER, alle 150 ms) belegt damit
 * den Haupt-Thread, jede Aktion im Scanner dauerte 2–4 s (gemessen 2026-11-01). Die Kamera läuft trotzdem echt.
 */
export function smallFakeCamera(dir) {
  const W = 160, H = 120, file = join(dir, 'fake-camera.y4m');
  const frame = Buffer.concat([Buffer.from('FRAME\n'), Buffer.alloc(W * H * 1.5, 128)]);
  writeFileSync(file, Buffer.concat([Buffer.from(`YUV4MPEG2 W${W} H${H} F5:1 Ip A1:1 C420jpeg\n`), ...Array(5).fill(frame)]));
  return ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-video-capture=${file}`];
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };

const SERVED = new Set(); // Ursprünge von startServer(), die launch() per Route bedient

/** Eine Repo-Datei wie der Server ausliefern: { status, body, headers }. */
async function serveFile(pathname) {
  let p = decodeURIComponent(pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = normalize(join(ROOT, p));
  const missing = { status: 404, body: 'not found', headers: {} };
  if (!f.startsWith(ROOT) || !existsSync(f)) return missing;
  try { return { status: 200, body: await readFile(f), headers: { 'content-type': MIME[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' } }; }
  catch { return missing; }
}

/** Statischer Server für das Repo-Verzeichnis. Gibt { url, close } zurück; nutzt TT_URL, falls gesetzt. */
export async function startServer() {
  if (process.env.TT_URL) {
    const url = process.env.TT_URL.replace(/\/$/, '');
    SERVED.add(new URL(url).origin);
    return { url, close: async () => {} };
  }
  const srv = createServer(async (req, res) => {
    const r = await serveFile(new URL(req.url, 'http://x').pathname);
    res.writeHead(r.status, r.headers); res.end(r.body);
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${srv.address().port}`;
  SERVED.add(url);
  return { url, close: () => new Promise((r) => srv.close(r)) };
}

/**
 * 0.4.0: Statt fester Pause warten, bis die Seite ruhig ist – höchstens max ms (der alte Pausenwert), also nie länger als vorher.
 * Ruhig heißt: keine offene Anfrage der Seite, seit QUIET ms keine DOM-Änderung, keine laufende endliche Animation/Transition,
 * und ein Idle-Callback ist gelaufen (Nachladen per requestIdleCallback, z. B. Dauer auf der Trainingskarte) – zweimal hintereinander.
 * Vor Prüfungen auf „etwas fehlt“ nach Nachladen lieber auf das letzte erwartete Ereignis warten (siehe check-heute-training).
 * Nicht für Pausen, in denen bewusst Zeit vergehen soll (Timer, langes Drücken): dort bleibt waitForTimeout.
 */
const QUIET = 100;
/** Offene Anfragen und Zeit der letzten Netz-Aktivität einer Seite mitzählen (launch() hängt das an jede neue Seite). */
function trackNet(p) {
  if (p.__ttInflight) return;
  p.__ttInflight = new Set(); p.__ttNet = Date.now();
  p.on('request', (r) => { p.__ttInflight.add(r); p.__ttNet = Date.now(); });
  for (const ev of ['requestfinished', 'requestfailed']) p.on(ev, (r) => { p.__ttInflight.delete(r); p.__ttNet = Date.now(); });
  p.on('framenavigated', (fr) => { if (fr === p.mainFrame()) p.__ttNet = Date.now(); }); // abgebrochene Anfragen melden sich über requestfailed
}
export async function settle(p, max = 300) {
  const t0 = Date.now();
  trackNet(p);
  // Netz-Ruhe: seit der letzten Anfrage (Start oder Ende) so lange nichts. Nach Laden/Navigation (lange Pausen) länger,
  // weil Module nacheinander geladen und geparst werden (unter Last gemessen: Lücken > 140 ms ohne Anfrage und DOM-Änderung).
  const NET_QUIET = max >= 400 ? 300 : 150;
  let calmSince = 0; // zweimal ruhig im Abstand von ≥ 40 ms: eine gerade gestartete Anfrage meldet Playwright etwas später
  while (Date.now() - t0 < max) {
    if (p.__ttInflight.size !== 0 || Date.now() - p.__ttNet < NET_QUIET) calmSince = 0;
    else {
      const quiet = await p.evaluate(async (q) => {
        if (!window.__ttMut) {
          window.__ttMut = { last: performance.now() };
          new MutationObserver(() => { window.__ttMut.last = performance.now(); })
            .observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
          return false;
        }
        const anim = document.getAnimations().some((a) => a.playState === 'running' && Number.isFinite(a.effect?.getComputedTiming().endTime));
        if (anim || performance.now() - window.__ttMut.last < q) return false;
        await new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(r, { timeout: 50 }) : setTimeout(r, 0)));
        return performance.now() - window.__ttMut.last >= q;
      }, QUIET).catch(() => false); // Navigation läuft: weiter warten
      if (!quiet) calmSince = 0;
      else if (!calmSince) calmSince = Date.now();
      else if (Date.now() - calmSince >= 40 && p.__ttInflight.size === 0) return Date.now() - t0;
    }
    await new Promise((r) => setTimeout(r, 20));
  }
  return Date.now() - t0;
}

/** Prüfungs-Zähler: ok(bedingung, text) schreibt "ok"/"FAIL"; done() setzt den Exit-Code. */
export function checker() {
  let fails = 0;
  // TT_TIMES=1: Zeit seit dem letzten ok/FAIL anhängen (zum Finden langsamer Stellen)
  let lastT = Date.now();
  const since = () => { if (!process.env.TT_TIMES) return ''; const n = Date.now(), d = n - lastT; lastT = n; return `  [+${d} ms]`; };
  return {
    ok(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + msg + since()); if (!cond) fails++; },
    done() { console.log(fails ? `${fails} Fehler` : 'alle Prüfungen bestanden'); if (fails) process.exitCode = 1; },
  };
}

export const BAD_TEXT = /\bnull\b|undefined|NaN/;

const MEAL_SHORT = { 'Frühstück': 'Frühstück', 'Mittagessen': 'Mittag', 'Abendessen': 'Abend', 'Snacks': 'Snack' };
/** Über das „+“ der Tab-Leiste: Mahlzeit wählen und eine Zeile antippen (z. B. „Lebensmittel“). */
export async function viaPlus(p, row, meal = null) {
  await p.click('.tab-plus'); await settle(p, 300);
  if (meal) { await p.click(`.qa-meal button:has-text("${MEAL_SHORT[meal] || meal}")`); await settle(p, 80); }
  await p.click(`.qa-row:has-text("${row}")`); await settle(p, 450);
}
