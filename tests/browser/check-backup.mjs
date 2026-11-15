// Daten & Backup + CSP (0.5.0): Sicherung erstellen (Download), ändern, wiederherstellen; feindliche Datei abgelehnt bzw.
// harmlos; keine CSP-Verstöße und keine fremden Anfragen auf allen Seiten. Muster aus Workout-Tracker check-v3140 (MIT, ST0PTV).
// Aufruf: node tests/browser/check-backup.mjs
import { launch, startServer, checker, outDir, settle } from './lib.mjs';
import { join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';

const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('backup');
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block', acceptDownloads: true });
const p = await ctx.newPage();
const errs = [], csp = [], foreign = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
p.on('request', (r) => { const u = new URL(r.url()); if (!['data:', 'blob:'].includes(u.protocol) && u.origin !== new URL(srv.url).origin) foreign.push(r.url()); });
await p.addInitScript(() => { document.addEventListener('securitypolicyviolation', (e) => { (window.__csp = window.__csp || []).push(`${e.violatedDirective} ${e.blockedURI}`); }); });
const go = async (hash) => { await p.goto(srv.url + '/index.html#' + hash); await settle(p, 350); };

await p.goto(srv.url + '/index.html'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ct.v1', '{"fremd":1}'); }); await p.reload(); await settle(p, 300);
ok(await p.evaluate(() => !!document.querySelector('meta[http-equiv="Content-Security-Policy"]')), 'CSP im <head>');
await go('/ich');
await p.click('button:has-text("Beispieldaten laden")');
await p.waitForFunction(() => /Beispiel-Einträge vorhanden/.test(document.body.innerText), null, { timeout: 15000 });
ok(await p.locator('.me-row:has-text("Daten & Backup")').innerText().then((t) => /noch nie gesichert/.test(t)), 'Ich: „Daten & Backup · noch nie gesichert“');

// Alle Seiten ohne CSP-Verstoß (inkl. Training, das nachgeladen wird)
for (const r of ['/', '/rezepte', '/rezepte/woche', '/training', '/training/plaene', '/analyse', '/analyse/magen', '/zyklus', '/ich', '/ich/daten', '/ich/darstellung', '/ich/training']) await go(r);
await p.waitForSelector('.cfg-sec', { timeout: 8000 });
const v1 = await p.evaluate(() => window.__csp || []);
ok(v1.length === 0, `keine CSP-Verstöße auf 12 Seiten (${v1.slice(0, 3).join(' | ')})`);

// Sichern → Download-Datei prüfen
await go('/ich/daten');
await p.screenshot({ path: join(out, 'daten.png'), fullPage: true });
const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 10000 }), p.click('.cfg-action:has-text("Backup erstellen")')]);
ok(/^the-tracker-backup-\d{4}-\d{2}-\d{2}\.json$/.test(dl.suggestedFilename()), `Dateiname ${dl.suggestedFilename()}`);
const file = join(out, 'backup.json');
await dl.saveAs(file);
const bk = JSON.parse(readFileSync(file, 'utf8'));
ok(bk.app === 'the-tracker' && bk.format === 1 && bk.data.days && bk.data.training_sessions?.length > 0 && bk.data.zyklus, 'Datei: Tagebuch, Training und Zyklus enthalten');
ok(!('lock' in bk.data) && !Object.keys(bk.data).some((k) => /^(ct|wt)/.test(k)), 'ohne PIN und ohne fremde Keys');
await settle(p, 200);
ok(/heute|\d{2}\.\d{2}\.\d{4}/.test(await p.locator('.cfg-row:has-text("Letzte Sicherung")').innerText()), 'Letzte Sicherung vermerkt');

// Daten ändern, dann wiederherstellen
const before = await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('tt_days'))).length);
await p.evaluate(() => { localStorage.setItem('tt_days', '{}'); localStorage.setItem('tt_lock', '{"pin":null,"decoy":null,"salt":null}'); });
await go('/ich/daten');
await p.setInputFiles('input[type=file]', file); await settle(p, 300);
const conf = await p.evaluate(() => document.querySelector('.backup-confirm')?.innerText || '');
ok(/Sicherung vom/.test(conf) && /Tage im Tagebuch/.test(conf) && /Trainings/.test(conf), `Bestätigung zeigt Inhalt (${conf.replace(/\s+/g, ' ').slice(0, 90)})`);
await p.screenshot({ path: join(out, 'bestaetigen.png') });
ok(await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('tt_days'))).length) === 0, 'vor „Ersetzen“ nichts geändert');
await Promise.all([p.waitForEvent('load', { timeout: 10000 }), p.click('.cfg-action:has-text("Alle Daten ersetzen")')]);
await settle(p, 400);
ok(await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('tt_days'))).length) === before, `Tagebuch wiederhergestellt (${before} Tage)`);
ok(await p.evaluate(() => localStorage.getItem('ct.v1')) === '{"fremd":1}', 'ct.v1 unverändert');

// Feindliche Datei: falsche App → Meldung, nichts geändert
const evil = join(out, 'evil.json');
writeFileSync(evil, JSON.stringify({ app: 'workout-tracker', format: 1, data: {} }));
await go('/ich/daten');
await p.setInputFiles('input[type=file]', evil); await settle(p, 300);
ok(/keine Sicherung von The Tracker/.test(await p.locator('#toast').innerText()), 'fremde Datei: Meldung');
// Gültige Datei mit Skript-Namen → nur Text, kein Ausführen, keine Verschmutzung
const xss = '<img src=x onerror="window.__pwned=1">';
const hostile = { ...bk, data: { ...bk.data, custom: [{ id: 'x1', name: xss, k: 100, p: 1, c: 1, f: 1 }],
  training_plans: [...bk.data.training_plans, { id: 'evil', name: xss, items: [] }] } };
writeFileSync(evil, JSON.stringify(hostile).replace('"data":{', '"data":{"__proto__":{"polluted":1},'));
await p.setInputFiles('input[type=file]', evil); await settle(p, 300);
ok(/Unbekannter Bereich/.test(await p.locator('#toast').innerText()), '__proto__ als Bereich abgelehnt');
writeFileSync(evil, JSON.stringify(hostile));
await p.setInputFiles('input[type=file]', evil); await settle(p, 300);
await Promise.all([p.waitForEvent('load', { timeout: 10000 }), p.click('.cfg-action:has-text("Alle Daten ersetzen")')]);
await settle(p, 300);
await go('/training/plaene'); await p.waitForSelector('text=Ganzkörper', { timeout: 8000 }).catch(() => {});
await settle(p, 300);
const pwn = await p.evaluate(() => ({ pwned: window.__pwned, polluted: ({}).polluted, js: [...document.querySelectorAll('a[href]')].filter((a) => /^\s*javascript:/i.test(a.getAttribute('href'))).length }));
ok(pwn.pwned === undefined && pwn.polluted === undefined && pwn.js === 0, `Skript im Namen wird nicht ausgeführt (${JSON.stringify(pwn)})`);

// Alles löschen (zweistufig)
await go('/ich/daten');
await p.click('.cfg-action:has-text("Alle Daten löschen")'); await settle(p, 200);
ok(await p.locator('.cfg-action:has-text("Ja, alles löschen")').count() === 1, 'Löschen fragt nach');
await Promise.all([p.waitForEvent('load', { timeout: 10000 }), p.click('.cfg-action:has-text("Ja, alles löschen")')]);
await settle(p, 300);
const left = await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('tt_') && k !== 'tt_schema'));
ok(left.length === 0 && await p.evaluate(() => localStorage.getItem('ct.v1')) === '{"fremd":1}', `alle tt_-Daten gelöscht, fremde bleiben (${left.join(',')})`);

const v2 = await p.evaluate(() => window.__csp || []);
ok(v2.length === 0, `keine CSP-Verstöße insgesamt (${v2.slice(0, 3).join(' | ')})`);
ok(foreign.length === 0, `keine fremden Anfragen (${foreign.slice(0, 3).join(' | ')})`);
ok(errs.length === 0, `keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
console.log(`Screenshots: ${out}`);
await b.close(); await srv.close();
done();
