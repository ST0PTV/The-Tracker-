// Vorabcheck vor jedem Commit: Tests, Check und Datenschutz-Prüfung (parallel).
// Übernommen aus QRate/scripts/vorab.mjs (MIT, ST0PTV); Browser-Schritt hier = paralleler Lauf aller Checks.
// Aufruf: npm run vorab              (vor jedem Commit)
//         npm run vorab -- --browser (vor Vorabcheck/Release, zusätzlich alle Browser-Checks parallel)
// Bewertet wird der Exit-Code jedes Schritts, nicht die Ausgabe. Nur wenn alle bestehen,
// steht am Ende die Zeile „VORABCHECK BESTANDEN“. Erst danach committen.
import { spawn } from 'node:child_process';

// Tests, Check und Datenschutz hängen nicht voneinander ab: parallel, Ausgabe gepuffert und danach in fester Reihenfolge.
// Der Browser-Schritt läuft danach allein, weil er selbst schon mehrere Checks gleichzeitig startet.
const quick = [['Tests', 'test'], ['Check', 'check'], ['Datenschutz', 'privacy']];

const run = ([name, script]) => new Promise((resolve) => {
  let out = '';
  const c = spawn(`npm run --silent ${script}`, { shell: true });
  c.stdout.on('data', (d) => { out += d; });
  c.stderr.on('data', (d) => { out += d; });
  c.on('close', (status) => resolve({ name, script, status, out }));
});
const show = ({ name, script, out }) => { console.log(`\n=== ${name} (npm run ${script}) ===`); process.stdout.write(out); };

const results = await Promise.all(quick.map(run));
results.forEach(show);
if (process.argv.includes('--browser')) {
  console.log('\n=== Browser (npm run test:browser:fast) ===');
  const status = await new Promise((resolve) => spawn('npm run --silent test:browser:fast', { stdio: 'inherit', shell: true }).on('close', resolve));
  results.push({ name: 'Browser', status });
}

console.log('\n=== Ergebnis ===');
for (const { name, status } of results) console.log(`${status === 0 ? 'ok    ' : 'FEHLER'} ${name}${status === 0 ? '' : ` (Exit ${status})`}`);
if (results.every((r) => r.status === 0)) {
  console.log('VORABCHECK BESTANDEN');
} else {
  console.log('Vorabcheck NICHT bestanden – nicht committen.');
  process.exit(1);
}
