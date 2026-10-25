// Syntaxprüfung aller JS-Dateien (node --check) und Abgleich: Jede App-Datei muss im Precache von sw.js stehen.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = new URL('..', import.meta.url).pathname;
const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

let failed = 0;
const files = [...walk(join(root, 'js')), ...walk(join(root, 'tests')), ...walk(join(root, 'scripts')), join(root, 'sw.js')]
  .filter((f) => /\.m?js$/.test(f));
for (const f of files) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); } catch (e) {
    failed++;
    console.error(`Syntaxfehler: ${relative(root, f)}\n${e.stderr}`);
  }
}

const sw = readFileSync(join(root, 'sw.js'), 'utf8');
for (const f of walk(join(root, 'js'))) {
  const rel = relative(root, f);
  if (!sw.includes(`'${rel}'`)) { failed++; console.error(`Fehlt im Precache von sw.js: ${rel}`); }
}

console.log(failed ? `${failed} Problem(e).` : `OK: ${files.length} Dateien geprüft.`);
process.exit(failed ? 1 : 0);
