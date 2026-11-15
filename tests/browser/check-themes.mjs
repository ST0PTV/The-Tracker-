// Themes (0.4.1): jedes Theme hell und dunkel ohne Konsolenfehler, Attribute und Leistenfarbe vor dem ersten Zeichnen,
// „System“ folgt dem Gerät (auch beim Wechsel), Auswahl unter „Ich → Darstellung“. Aufruf: node tests/browser/check-themes.mjs
import { launch, startServer, checker, outDir, settle } from './lib.mjs';
import { join } from 'node:path';

const PAL = { nativ: ['#000000', '#F2F2F7'], glas: ['#0B0E1A', '#EEF1F8'], sand: ['#14110E', '#F3EDE3'], see: ['#0A1114', '#EEF4F5'] };
const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('themes');
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block', colorScheme: 'dark' });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
const state = () => p.evaluate(() => ({
  pal: document.documentElement.getAttribute('data-palette'), theme: document.documentElement.getAttribute('data-theme'),
  bar: document.querySelector('meta[name="theme-color"]').getAttribute('content'),
  bg: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
}));
const seed = (settings) => p.evaluate((s) => { localStorage.clear(); localStorage.setItem('tt_settings', JSON.stringify(s)); }, settings);

await p.goto(srv.url + '/index.html'); await settle(p, 300);
// Jedes Theme in beiden Modi: nach dem Neuladen sofort richtig (Skript in index.html), Heute ohne Fehler
for (const [pal, [dark, light]] of Object.entries(PAL)) for (const mode of ['dark', 'light']) {
  await seed({ appearance: mode, palette: pal });
  await p.goto(srv.url + '/index.html#/'); await p.reload(); await settle(p, 400);
  const s = await state();
  const want = mode === 'light' ? light : dark;
  ok(s.pal === (pal === 'nativ' ? null : pal) && s.theme === (mode === 'light' ? 'light' : null), `${pal} ${mode}: Attribute ${s.pal}/${s.theme}`);
  ok(s.bar.toUpperCase() === want && s.bg.toUpperCase() === want, `${pal} ${mode}: Leiste und Grund ${want} (${s.bar}, ${s.bg})`);
  await p.screenshot({ path: join(out, `heute-${pal}-${mode}.png`) });
}
// Glas: Karten mit Unschärfe, Verlauf auf body
await seed({ appearance: 'dark', palette: 'glas' }); await p.reload(); await settle(p, 400);
const glas = await p.evaluate(() => ({ blur: getComputedStyle(document.querySelector('.card')).backdropFilter, bg: getComputedStyle(document.body).backgroundImage }));
ok(/blur/.test(glas.blur) && /radial-gradient/.test(glas.bg), `Glas: Unschärfe und Verlauf (${glas.blur})`);

// System: folgt dem Gerät beim Start und beim Wechsel
await seed({ appearance: 'system', palette: 'see' });
await p.emulateMedia({ colorScheme: 'light' }); await p.reload(); await settle(p, 300);
let s = await state();
ok(s.theme === 'light' && s.bar === '#EEF4F5', `System + Gerät hell → hell (${s.theme}, ${s.bar})`);
await p.emulateMedia({ colorScheme: 'dark' }); await settle(p, 200);
s = await state();
ok(s.theme === null && s.bar === '#0A1114', `Gerät wechselt auf dunkel → dunkel ohne Neuladen (${s.theme}, ${s.bar})`);

// Auswahl unter „Ich → Darstellung“
await seed({}); await p.goto(srv.url + '/index.html#/ich'); await p.reload(); await settle(p, 300);
ok(await p.locator('.me-row:has-text("Darstellung")').innerText().then((t) => /Apple nativ · Dunkel/.test(t)), 'Ich: Darstellung zeigt „Apple nativ · Dunkel“');
await p.click('.me-row:has-text("Darstellung")'); await settle(p, 300);
ok(await p.locator('.pal-card').count() === 4, 'vier Theme-Karten');
ok(await p.locator('.pal-card[aria-checked="true"]').innerText().then((t) => /Apple nativ/.test(t)), 'Apple nativ ist gewählt');
await p.screenshot({ path: join(out, 'darstellung-nativ-dark.png') });
await p.click('.pal-card:has-text("Sand")'); await settle(p, 300);
s = await state();
ok(s.pal === 'sand' && s.bar === '#14110E', `Sand gewählt → data-palette sand (${s.pal})`);
ok(await p.locator('.pal-card[aria-checked="true"]').innerText().then((t) => /Sand/.test(t)), 'Sand-Karte markiert');
await p.click('[aria-label="Erscheinung"] button:has-text("Hell")'); await settle(p, 300);
s = await state();
ok(s.theme === 'light' && s.bar === '#F3EDE3', `Hell gewählt → Sand hell (${s.theme}, ${s.bar})`);
const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('tt_settings')));
ok(saved.palette === 'sand' && saved.appearance === 'light', `gespeichert: ${JSON.stringify(saved)}`);
await p.screenshot({ path: join(out, 'darstellung-sand-light.png') });
// Vorschau zeigt jedes Theme in seinen eigenen Farben, unabhängig vom aktiven Theme
const pv = await p.evaluate(() => [...document.querySelectorAll('.pal-card')].map((c) => getComputedStyle(c).getPropertyValue('--bg').trim().toUpperCase()));
ok(JSON.stringify(pv) === JSON.stringify(Object.values(PAL).map((v) => v[1])), `Vorschau hell in eigenen Farben (${pv.join(' ')})`);
await p.click('.pal-card:has-text("Glas")'); await settle(p, 300);
ok(/Transparenz reduzieren/.test(await p.innerText('body')), 'Glas: Hinweis zu „Transparenz reduzieren“');
await p.click('a.back'); await settle(p, 300);
ok(/Glas · Hell/.test(await p.locator('.me-row:has-text("Darstellung")').innerText()), 'Ich zeigt „Glas · Hell“');
// Trainingsbereich lädt im Theme (eigene CSS-Datei, gleiche Tokens)
await p.goto(srv.url + '/index.html#/training'); await settle(p, 800);
await p.screenshot({ path: join(out, 'training-glas-light.png') });
ok((await state()).pal === 'glas', 'Training: Theme bleibt');

ok(errs.length === 0, `keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
console.log(`Screenshots: ${out}`);
await b.close(); await srv.close();
done();
