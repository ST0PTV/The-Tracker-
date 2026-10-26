// Foto der Nährwerttabelle im Browser: Etikett als Bild erzeugen (Screenshot einer Tabelle), über die Datei-Auswahl
// einreichen, tesseract.js aus vendor/ lesen lassen, Werte im Formular prüfen, Häkchen-Pflicht, speichern.
// Läuft offline; dauert wegen der Texterkennung etwa 20–60 s. Aufruf: node tests/browser/check-ocr.mjs
import { launch, startServer, checker, outDir, viaPlus } from './lib.mjs';
import { join } from 'node:path';

const LABEL = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#fff;font:28px Arial,sans-serif;color:#000">
<table style="border-collapse:collapse;margin:24px" cellpadding="10">
<tr><th align="left">Nährwerte</th><th align="right">pro 100 g</th><th align="right">pro Portion (30 g)</th></tr>
<tr><td>Brennwert</td><td align="right">1580 kJ / 375 kcal</td><td align="right">474 kJ / 113 kcal</td></tr>
<tr><td>Fett</td><td align="right">7,0 g</td><td align="right">2,1 g</td></tr>
<tr><td>davon gesättigte Fettsäuren</td><td align="right">1,2 g</td><td align="right">0,4 g</td></tr>
<tr><td>Kohlenhydrate</td><td align="right">60 g</td><td align="right">18 g</td></tr>
<tr><td>davon Zucker</td><td align="right">1,0 g</td><td align="right">0,3 g</td></tr>
<tr><td>Ballaststoffe</td><td align="right">10 g</td><td align="right">3,0 g</td></tr>
<tr><td>Eiweiß</td><td align="right">13 g</td><td align="right">3,9 g</td></tr>
<tr><td>Salz</td><td align="right">0,02 g</td><td align="right">0,01 g</td></tr></table></body>`;

const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('ocr');

// 1) Etikett als PNG
const lp = await (await b.newContext({ viewport: { width: 900, height: 560 } })).newPage();
await lp.setContent(LABEL);
const labelPng = join(out, 'etikett.png');
await lp.screenshot({ path: labelPng });

// 2) App: Neu → Nährwerttabelle fotografieren → Datei wählen
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(srv.url + '/index.html');
await p.evaluate(() => localStorage.clear());
await p.reload(); await p.waitForTimeout(300);
await viaPlus(p, 'Lebensmittel', 'Snacks');
await p.click('.sheet .seg button:has-text("Neu")'); await p.waitForTimeout(200);
const chooser = p.waitForEvent('filechooser');
await p.click('.sheet button.row:has-text("Nährwerttabelle fotografieren")');
await (await chooser).setFiles(labelPng);
await p.waitForFunction(() => /Vom Foto gelesen|Keine Nährwerte erkannt|nicht geklappt/.test(document.body.innerText), null, { timeout: 120000 });
const val = (label) => p.inputValue(`input[aria-label="${label}"]`);
const got = { k: await val('kcal in kcal'), f: await val('Fett in g'), c: await val('Kohlenhydrate in g'), p: await val('Eiweiß in g'), su: await val('davon Zucker in g'), fi: await val('Ballaststoffe in g') };
console.log('gelesen:', JSON.stringify(got));
// Brennwert: entweder kcal direkt (375) oder aus kJ umgerechnet (1580 / 4,184 = 378), beides innerhalb 1 %
ok(Math.abs(Number(got.k) - 375) <= 4 && got.f === '7' && got.c === '60' && got.p === '13', 'Brennwert (±1 %) und Makros richtig vom Bild gelesen');
ok(/Vom Foto gelesen/.test(await p.evaluate(() => document.body.innerText)), 'Hinweis „Vom Foto gelesen“ mit Aufforderung zum Vergleichen');
ok(got.su === '1' && got.fi === '10', 'Zucker und Ballaststoffe richtig gelesen');
await p.screenshot({ path: join(out, 'formular.png') });

// 3) Ohne Häkchen kein Speichern; mit Häkchen und Name → Mengen-Dialog
await p.fill('input[aria-label="Name"]', 'Haferkekse vom Foto');
await p.click('.sheet button:has-text("Speichern & eintragen")'); await p.waitForTimeout(200);
ok(await p.locator('.sheet[aria-label="Eigenes Lebensmittel"]').count() === 1, 'ohne „mit Packung verglichen“ wird nicht gespeichert');
await p.check('input[aria-label="Mit der Packung verglichen"]');
await p.click('.sheet button:has-text("Speichern & eintragen")'); await p.waitForTimeout(400);
ok((await p.evaluate(() => document.body.innerText)).includes('Haferkekse vom Foto'), 'nach dem Speichern Mengen-Dialog');
const custom = await p.evaluate(() => JSON.parse(localStorage.getItem('tt_custom') || '[]'));
ok(custom.length === 1 && custom[0].ns === 'foto' && Math.abs(custom[0].k - 375) <= 4, 'als eigenes Lebensmittel mit Herkunft „foto“ gespeichert');
ok(errs.length === 0, `keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
console.log(`Screenshots: ${out}`);
await b.close(); await srv.close();
done();
