// Paralleler Runner für alle Browser-Checks (0.4.0): tests/browser/check-*.mjs und tests/browser/wt/check-*.mjs.
// Jeder Check läuft als eigener Prozess mit eigenem Server (Port 0) und eigenem TT_OUT-Ordner. Die Seiten kommen über Playwright-Routen
// (tests/browser/lib.mjs, launch): unter Windows mit Norton hingen sonst ab 4 Browsern die Verbindungen zu 127.0.0.1 (gemessen 2026-11-01).
// Ausgabe wird pro Check gepuffert; am Ende eine Tabelle, ausführlich nur die Fehlschläge.
//
//   node scripts/run-browser-checks.mjs [Filter] [--jobs N] [--version x.y.z]
//     Filter      Teil des Dateinamens, z. B. v31 oder rezepte (ohne Filter: alle)
//     --jobs N    gleichzeitige Checks (Standard: halbe Kernzahl, höchstens 4; --jobs 1 = seriell)
//     --version   Version für check-tabs (Standard: js/core/version.js)
//
// Reihenfolge: die langsamsten zuerst (Zeiten vom letzten Lauf in <TT_OUT>/timings.json), damit kein langer Check zuletzt allein läuft.
// check-wt.mjs (serieller Sammel-Check der wt/-Checks) wird hier nicht gestartet: seine Checks laufen einzeln.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir, availableParallelism } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv.splice(i, 2)[1] : undefined; };
const jobsArg = opt('--jobs');
const version = opt('--version');
const filter = argv.find((a) => !a.startsWith('--')) || '';
const jobs = Math.max(1, Number(jobsArg) || Math.min(4, Math.floor(availableParallelism() / 2)));
const TIMEOUT_MS = 600000;

const BASE = process.env.TT_OUT || join(tmpdir(), 'tt-browser');
mkdirSync(BASE, { recursive: true });
const TIMINGS = join(BASE, 'timings.json');
const last = existsSync(TIMINGS) ? JSON.parse(readFileSync(TIMINGS, 'utf8')) : {};

const list = (dir, prefix) => readdirSync(join(ROOT, dir)).filter((f) => /^check-.+\.mjs$/.test(f) && f !== 'check-wt.mjs').map((f) => prefix + f);
const checks = [...list('tests/browser', ''), ...list('tests/browser/wt', 'wt/')]
  .filter((c) => c.includes(filter))
  .sort((a, b) => (last[b] || 0) - (last[a] || 0) || a.localeCompare(b));
if (!checks.length) { console.error(`Kein Check passt zu „${filter}“.`); process.exit(1); }

console.log(`${checks.length} Browser-Checks, ${jobs} gleichzeitig${filter ? `, Filter „${filter}“` : ''}`);
const t0 = Date.now();
const results = [];

function runOne(c) {
  return new Promise((resolve) => {
    const t = Date.now();
    const out = join(BASE, c.replace(/[^\w-]+/g, '_').replace(/_mjs$/, ''));
    const args = [join(ROOT, 'tests/browser', c)];
    if (c === 'check-tabs.mjs' && version) args.push(version);
    const child = spawn(process.execPath, args, { cwd: ROOT, env: { ...process.env, TT_OUT: out } });
    let buf = '';
    child.stdout.on('data', (d) => { buf += d; });
    child.stderr.on('data', (d) => { buf += d; });
    const kill = setTimeout(() => { buf += `\nAbbruch nach ${TIMEOUT_MS / 1000} s`; child.kill(); }, TIMEOUT_MS);
    child.on('close', (code) => {
      clearTimeout(kill);
      const oks = (buf.match(/^ok /gm) || []).length, fails = (buf.match(/^FAIL /gm) || []).length;
      const r = { check: c, good: code === 0 && fails === 0, oks, fails, sec: (Date.now() - t) / 1000, out: buf };
      console.log(`${r.good ? 'ok  ' : 'FAIL'} ${c}: ${oks} ok, ${fails} Fehler, ${r.sec.toFixed(1)} s`);
      results.push(r); resolve();
    });
  });
}

const queue = [...checks];
await Promise.all(Array.from({ length: Math.min(jobs, queue.length) }, async () => { while (queue.length) await runOne(queue.shift()); }));

const total = (Date.now() - t0) / 1000;
for (const r of results) last[r.check] = +r.sec.toFixed(1);
writeFileSync(TIMINGS, JSON.stringify(last, null, 1));

const failed = results.filter((r) => !r.good);
for (const r of failed) {
  console.log(`\n---- FAIL ${r.check} ----`);
  const lines = r.out.split(/\r?\n/);
  const hits = lines.filter((l) => /^FAIL |Error|Timeout|Abbruch/.test(l));
  console.log([...hits.slice(0, 20), '…letzte Zeilen:', ...lines.slice(-15)].join('\n'));
}
console.log('\nCheck'.padEnd(31) + 'Ergebnis    ok      s');
for (const r of [...results].sort((a, b) => b.sec - a.sec)) {
  console.log(`${r.check.padEnd(30)}${(r.good ? 'ok' : 'FAIL').padEnd(8)}${String(r.oks).padStart(6)}${r.sec.toFixed(1).padStart(7)}`);
}
const sum = results.reduce((a, r) => a + r.sec, 0);
console.log(`\nGesamt: ${total.toFixed(1)} s (Summe der Einzelzeiten ${sum.toFixed(1)} s, ${jobs} Jobs), ${results.reduce((a, r) => a + r.oks, 0)} ok-Zeilen`);
console.log(failed.length ? `${failed.length} von ${results.length} Checks fehlgeschlagen: ${failed.map((r) => r.check).join(', ')}` : `alle Prüfungen bestanden (${results.length} Checks)`);
console.log(`Screenshots: ${BASE}`);
if (failed.length) process.exitCode = 1;
