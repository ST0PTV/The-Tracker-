// Gemeinsame Helfer für die Browser-Prüfskripte (tests/browser/*.mjs).
// Übernommen aus Workout-Tracker/tests/browser/lib.mjs (MIT, ST0PTV); Workout-spezifische Helfer entfernt.
// Keine Abhängigkeiten im Repo: Playwright und Chromium werden in der Umgebung gesucht.
//   TT_URL        fertiger Server (z. B. http://localhost:8765); sonst startet startServer() einen eigenen
//   TT_OUT        Ausgabeordner für Screenshots/Streifen (Standard: <tmp>/tt-browser)
//   CHROMIUM_PATH Chromium-Programm (Standard: Headless-Shell unter /opt/pw-browsers, sonst Playwright-Standard)
//   PLAYWRIGHT_MODULE  Ordner des Pakets "playwright", falls es nicht über import() gefunden wird
import { readFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
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

export async function launch(args = []) {
  const { chromium } = await loadPlaywright();
  return chromium.launch({ executablePath: chromiumPath(), args });
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };

/** Statischer Server für das Repo-Verzeichnis. Gibt { url, close } zurück; nutzt TT_URL, falls gesetzt. */
export async function startServer() {
  if (process.env.TT_URL) return { url: process.env.TT_URL.replace(/\/$/, ''), close: async () => {} };
  const srv = createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = normalize(join(ROOT, p));
    if (!f.startsWith(ROOT) || !existsSync(f)) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(readFileSync(f));
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${srv.address().port}`, close: () => new Promise((r) => srv.close(r)) };
}

/** Prüfungs-Zähler: ok(bedingung, text) schreibt "ok"/"FAIL"; done() setzt den Exit-Code. */
export function checker() {
  let fails = 0;
  return {
    ok(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + msg); if (!cond) fails++; },
    done() { console.log(fails ? `${fails} Fehler` : 'alle Prüfungen bestanden'); if (fails) process.exitCode = 1; },
  };
}

export const BAD_TEXT = /\bnull\b|undefined|NaN/;

const MEAL_SHORT = { 'Frühstück': 'Frühstück', 'Mittagessen': 'Mittag', 'Abendessen': 'Abend', 'Snacks': 'Snack' };
/** Über das „+“ der Tab-Leiste: Mahlzeit wählen und eine Zeile antippen (z. B. „Lebensmittel“). */
export async function viaPlus(p, row, meal = null) {
  await p.click('.tab-plus'); await p.waitForTimeout(300);
  if (meal) { await p.click(`.qa-meal button:has-text("${MEAL_SHORT[meal] || meal}")`); await p.waitForTimeout(80); }
  await p.click(`.qa-row:has-text("${row}")`); await p.waitForTimeout(450);
}
