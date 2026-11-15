// Feinschliff 0.4.3: Trefferflächen ≥ 44 px (ⓘ, Geschmack, Zutat entfernen, Zyklus-Einstellungen, „+“ auf Tracker-Karten,
// „Gewicht eintragen“), keine Platzhalterkarte auf „Heute“, Zyklus-Zeile im Training ohne Rahmen, Wasser in der Theme-Farbe,
// „Begriffe“ als Zeile mit Pfeil. Aufruf: node tests/browser/check-feinschliff.mjs
import { launch, startServer, checker, outDir, settle } from './lib.mjs';
import { join } from 'node:path';

const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('feinschliff');
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' })).newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(srv.url + '/index.html'); await p.evaluate(() => localStorage.clear()); await p.reload(); await settle(p, 300);
await p.goto(srv.url + '/index.html#/ich'); await settle(p, 300);
await p.click('button:has-text("Beispieldaten laden")');
await p.waitForFunction(() => /Beispiel-Einträge vorhanden/.test(document.body.innerText), null, { timeout: 15000 });

const go = async (hash) => { await p.goto(srv.url + '/index.html#' + hash); await settle(p, 400); };
// Trefferfläche: Punkte 21 px über/unter/links/rechts der Mitte treffen noch das Element (sichtbar kleiner ist erlaubt)
const hit = (sel, n = 3) => p.evaluate(([sel, n]) => [...document.querySelectorAll(sel)].filter((e) => e.getBoundingClientRect().width > 0).slice(0, n).map((e) => {
  e.scrollIntoView({ block: 'center' });
  const r = e.getBoundingClientRect(); const cx = r.left + r.width / 2; const cy = r.top + r.height / 2;
  const miss = [[0, -21], [0, 21], [-21, 0], [21, 0]].filter(([dx, dy]) => { const t = document.elementFromPoint(cx + dx, cy + dy); return !(t && (t === e || e.contains(t))); });
  return { label: e.getAttribute('aria-label') || e.innerText.trim().slice(0, 30), size: `${Math.round(r.width)}×${Math.round(r.height)}`, miss: miss.length };
}), [sel, n]);
const allHit = async (what, sel, n) => {
  const r = await hit(sel, n);
  ok(r.length > 0 && r.every((x) => x.miss === 0), `${what}: Trefferfläche ≥ 44 px (${r.map((x) => `${x.label} ${x.size}${x.miss ? ' ✗' : ''}`).join(', ') || 'nicht gefunden'})`);
};

// „Heute“: keine Platzhalterkarte, „+“ auf Tracker-Karten
await go('/');
ok(!/Zieht in Phase/.test(await p.evaluate(() => document.body.innerText)) && await p.locator('.card.placeholder').count() === 0, 'Heute: keine Platzhalterkarte „Analyse“');
await allHit('Heute: „+“ auf Tracker-Karten', '.trk.on .trk-plus', 5);

// ⓘ: einheitlich 36 px, Trefferfläche 44 px
await go('/analyse');
const infoSize = await p.evaluate(() => { const r = document.querySelector('.info-btn').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
ok(infoSize[0] === 36 && infoSize[1] === 36, `Analyse: ⓘ 36 × 36 px (${infoSize.join('×')})`);
await allHit('Analyse: ⓘ', '.info-btn', 2);
await go('/ich/koffein'); await allHit('Koffein: ⓘ', '.info-btn', 1);
await go('/ich/gewichtsziel');
await allHit('Gewichtsziel: ⓘ', '.info-btn', 2);
await allHit('Gewichtsziel: „Gewicht eintragen“', '.cfg-pad .link', 1);
// Untergrenze steht beim Zielgewicht (vor „Als Kalorienziel übernehmen“), nicht unter „Heute“
const order = await p.evaluate(() => { const t = document.querySelector('.view').innerText; return [t.indexOf('Untergrenze ohne'), t.indexOf('Als Kalorienziel'), t.indexOf('Gewichtskarte')]; });
ok(order[0] > 0 && order[0] < order[1] && order[1] < order[2], `Gewichtsziel: Untergrenze beim Zielgewicht (${order.join(', ')})`);
ok(!/Zielgewicht eintragen\./.test(await p.evaluate(() => document.body.innerText)), 'Gewichtsziel: Hilfetext „Zielgewicht eintragen.“ entfällt');
await p.screenshot({ path: join(out, 'gewichtsziel.png'), fullPage: true });

await go('/ich/geschmack'); await allHit('Geschmack: Herz und Kreuz', '.taste-row .icon-btn', 6);
await go('/rezepte/neu'); await allHit('Rezept neu: Zutat entfernen', '.icon-btn.sm[aria-label$="entfernen"]', 2);
await go('/zyklus'); await allHit('Zyklus: „Einstellungen“', '.cy-top .link', 1);

// Training: Zyklus-Zeile ohne Browser-Rahmen; „Begriffe“ links mit Pfeil
await go('/training');
await p.waitForSelector('.cyc-line', { timeout: 15000 });
const border = await p.evaluate(() => getComputedStyle(document.querySelector('.cyc-line')).borderTopWidth);
ok(border === '0px', `Training: Zyklus-Zeile ohne Rahmen (${border})`);
await p.screenshot({ path: join(out, 'training.png') });
await go('/ich/training');
const beg = await p.evaluate(() => { const e = [...document.querySelectorAll('.cfg-row')].find((x) => x.innerText.trim() === 'Begriffe'); if (!e) return null; const s = getComputedStyle(e); return { jc: s.justifyContent, chev: !!e.querySelector('.cfg-chev') }; });
ok(beg && beg.jc !== 'center' && beg.chev, `Ich → Training: „Begriffe“ links mit Pfeil (${JSON.stringify(beg)})`);
await p.click('.cfg-row:has-text("Begriffe")'); await settle(p, 300);
ok(await p.locator('.sheet dt').count() > 3, 'Begriffe öffnet die Liste');

// Wasser in der Theme-Farbe (Apple nativ bleibt blau)
for (const [pal, mode] of [['nativ', 'dark'], ['sand', 'light'], ['sand', 'dark'], ['see', 'light'], ['glas', 'dark']]) {
  await p.evaluate(([pal, mode]) => { const s = JSON.parse(localStorage.getItem('tt_settings') || '{}'); s.palette = pal; s.appearance = mode; localStorage.setItem('tt_settings', JSON.stringify(s)); }, [pal, mode]);
  await p.goto(srv.url + '/index.html#/'); await p.reload(); await settle(p, 400);
  const c = await p.evaluate(() => { const st = getComputedStyle(document.documentElement); return [st.getPropertyValue('--c-water').trim().toUpperCase(), st.getPropertyValue('--accent').trim().toUpperCase()]; });
  ok(pal === 'nativ' ? c[0] !== c[1] : c[0] === c[1], `${pal} ${mode}: Wasser ${pal === 'nativ' ? 'blau' : '= Theme-Farbe'} (${c[0]}, Akzent ${c[1]})`);
  if (pal !== 'nativ') { await p.locator('.trk.k-water, .k-water.trk').first().scrollIntoViewIfNeeded().catch(() => {}); await p.screenshot({ path: join(out, `wasser-${pal}-${mode}.png`) }); }
}

ok(errs.length === 0, `keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
console.log(`Screenshots: ${out}`);
await b.close(); await srv.close();
done();
