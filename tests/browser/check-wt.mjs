// Sammel-Check (0.3.3): führt alle aus dem Workout-Tracker übernommenen Browser-Checks (tests/browser/wt/check-*.mjs)
// nacheinander aus und meldet jeden einzeln. Das Release-Skript ruft diese Datei wie jeden check-*.mjs auf.
// Aufruf: node tests/browser/check-wt.mjs [Teil des Namens, z. B. v3100]
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const DIR = fileURLToPath(new URL('./wt/', import.meta.url));
const only = process.argv[2] || '';
const files = readdirSync(DIR).filter((f) => /^check-.+\.mjs$/.test(f) && f.includes(only)).sort();
let failed = [];
for (const f of files) {
  const t = Date.now();
  const r = spawnSync(process.execPath, [join(DIR, f)], { encoding: 'utf8', timeout: 300000 });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  const oks = (out.match(/^ok /gm) || []).length, fails = (out.match(/^FAIL /gm) || []).length;
  const good = r.status === 0 && fails === 0;
  console.log(`${good ? 'ok  ' : 'FAIL'} wt/${f}: ${oks} ok, ${fails} Fehler, ${Math.round((Date.now() - t) / 1000)} s`);
  if (!good) { failed.push(f); console.log(out.split('\n').filter((l) => /^FAIL|Error|Timeout/.test(l)).slice(0, 8).map((l) => '     ' + l).join('\n')); }
}
console.log(failed.length ? `${failed.length} von ${files.length} Checks fehlgeschlagen: ${failed.join(', ')}` : `alle Prüfungen bestanden (${files.length} Checks)`);
if (failed.length) process.exitCode = 1;
