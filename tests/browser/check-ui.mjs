// UI-Wächter (0.5.3, Vorbild QRate 0.2.0): alle Seiten mit Beispieldaten
// - Kontrast in jedem Theme hell und dunkel (Text ≥ 4,5:1, groß ≥ 3:1)
// - Tippflächen ≥ 44 px (Ausnahmen in ALLOW, dort ≥ 24 px) mit echtem Treffertest, Wörter ohne Bruch mitten im Wort,
//   keine Seite breiter als der Bildschirm – bei 390 px und 320 px (iPhone SE 1), hell und dunkel.
// Aufruf: node tests/browser/check-ui.mjs [kontrast|flaechen]   (ohne Teil: beides)
import { launch, startServer, checker, outDir, settle } from './lib.mjs';
import { auditContrast, auditTargets, auditWordBreaks, auditWidth } from './a11y.mjs';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';

const part = process.argv[2] || 'alle';
const ROUTES = ['/', '/analyse', '/analyse/monat', '/analyse/jahr', '/analyse/magen', '/analyse/mikro',
  '/rezepte', '/rezepte/woche', '/rezepte/vorrat', '/rezepte/kochen', '/rezepte/snack', '/rezepte/neu',
  '/zyklus', '/zyklus/verlauf', '/zyklus/wissen', '/zyklus/bericht',
  '/ich', '/ich/ziel', '/ich/gewichtsziel', '/ich/koerper', '/ich/ernaehrung', '/ich/geschmack', '/ich/heute', '/ich/wasser',
  '/ich/koffein', '/ich/alkohol', '/ich/supplements', '/ich/zyklus', '/ich/training', '/ich/darstellung', '/ich/lebensmittel',
  '/ich/sperre', '/ich/daten', '/ich/einfuehrung', '/ich/quellen',
  '/training', '/training/plaene', '/training/routine'];
const TRAIN_TABS = ['Übungen', 'Fortschritt'];
// Sheets, die auf einer Route geöffnet und mitgeprüft werden: [Name, Selektor des Auslösers]
const SHEETS = {
  '/': [['Plus-Menü', '.tab-plus']],
  '/analyse': [['Info', '#view .info-btn']],
};
const PALETTES = ['nativ', 'glas', 'sand', 'see'];
// 0.5.4: Unter 44 px ist ein Fehler, außer hier (je mit Grund). Alles darunter bleibt ≥ 24 px (WCAG 2.2 AA).
// Je Bildschirmbreite, damit eine Ausnahme bei 320 px keinen Rückschritt bei 390 px verdeckt.
const ALLOW = {
  390: [
    '.wk-d', // Wochenstreifen: 7 Tage in einer Reihe, 43 px breit; daneben der Kalender-Knopf mit 44-px-Tagen
  ].join(', '),
  320: [
    '.wk-d',
    '.cal-d', // Monat in der Analyse: 7 Spalten, bei 320 px höchstens 39 px (Fläche bis zur Lückenmitte), 48 px hoch
    '.cy-d', // Zyklus-Kalender: 7 Spalten, 37 px breit, 44 px hoch
  ].join(', '),
};

const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('ui');
const errs = [];
const hints = new Map();

async function page(width, mode, palette) {
  const ctx = await b.newContext({ viewport: { width, height: 760 }, deviceScaleFactor: 1, serviceWorkers: 'block', colorScheme: mode });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(srv.url + '/index.html');
  await p.evaluate(({ mode, palette }) => {
    localStorage.clear();
    localStorage.setItem('tt_settings', JSON.stringify({ appearance: mode, palette }));
    localStorage.setItem('tt_intro', JSON.stringify({ done: true, hints: false }));
  }, { mode, palette });
  await p.reload(); await settle(p, 300);
  await p.goto(srv.url + '/index.html#/ich'); await settle(p, 200);
  await p.click('button:has-text("Beispieldaten laden")');
  await p.waitForFunction(() => /Beispiel-Einträge vorhanden/.test(document.body.innerText), null, { timeout: 10000 });
  return { p, ctx };
}

// Jede Route (und die Trainings-Reiter) besuchen und fn(where) aufrufen
async function visit(p, tag, fn) {
  for (const r of ROUTES) {
    await p.goto(srv.url + '/index.html#' + r); await settle(p, r.startsWith('/training') ? 600 : 250);
    await fn(`${tag} ${r}`);
    if (r === '/training') for (const t of TRAIN_TABS) {
      const tab = p.locator(`button:has-text("${t}")`).first();
      if (await tab.count()) { await tab.click(); await settle(p, 400); await fn(`${tag} /training ${t}`); }
    }
    // 0.5.4: häufige Sheets – „+“-Menü und das erste Info-Sheet der Seite
    for (const [name, opener] of SHEETS[r] || []) {
      const o = p.locator(opener).first();
      // Fehlt der Auslöser, ist das ein Fehler im Check (sonst würde still nichts geprüft)
      if (!(await o.count())) { errs.push(`Sheet-Auslöser fehlt: ${r} ${name} (${opener})`); continue; }
      await o.click(); await settle(p, 400);
      if (!(await p.locator('.sheet[role="dialog"]').count())) { errs.push(`Sheet öffnet nicht: ${r} ${name}`); continue; }
      await fn(`${tag} ${r} [${name}]`);
      await p.keyboard.press('Escape'); await settle(p, 300);
    }
  }
}

if (part === 'alle' || part === 'kontrast') {
  for (const palette of PALETTES) for (const mode of ['light', 'dark']) {
    const { p, ctx } = await page(390, mode, palette);
    const found = [];
    await visit(p, `${palette}-${mode}`, async (where) => { found.push(...await auditContrast(p, where)); });
    writeFileSync(join(out, `kontrast-${palette}-${mode}.txt`), found.join('\n'));
    ok(found.length === 0, `Kontrast ${palette} ${mode}: ${found.length ? found.length + ' Stellen\n    ' + [...new Set(found)].slice(0, 12).join('\n    ') : 'alle Texte ausreichend'}`);
    await ctx.close();
  }
}

if (part === 'alle' || part === 'flaechen') {
  for (const width of [390, 320]) for (const mode of ['light', 'dark']) {
    const { p, ctx } = await page(width, mode, 'nativ');
    const tgt = [], brk = [], wid = [], u44 = [];
    await visit(p, `${width}-${mode}`, async (where) => {
      const t = await auditTargets(p, where, ALLOW[width]);
      tgt.push(...t.errors);
      u44.push(...t.under);
      for (const h of t.hints) hints.set(h, (hints.get(h) || 0) + 1);
      brk.push(...await auditWordBreaks(p, where));
      wid.push(...await auditWidth(p, where));
      if (width === 320 && mode === 'light') await p.screenshot({ path: join(out, `320-${where.split(' ').slice(1).join('_').replace(/\//g, '_') || 'heute'}.png`) });
    });
    writeFileSync(join(out, `flaechen-${width}-${mode}.txt`), [...tgt, ...u44, ...brk, ...wid].join('\n'));
    ok(tgt.length === 0, `Tippflächen ${width} px ${mode}: ${tgt.length ? tgt.length + ' Fehler\n    ' + [...new Set(tgt)].slice(0, 12).join('\n    ') : 'alle ≥ 24 px und treffbar'}`);
    ok(u44.length === 0, `Tippflächen ≥ 44 px ${width} px ${mode}: ${u44.length ? u44.length + ' darunter\n    ' + [...new Set(u44)].slice(0, 12).join('\n    ') : 'alle (außer begründeten Ausnahmen)'}`);
    ok(brk.length === 0, `Wortbrüche ${width} px ${mode}: ${brk.length ? brk.length + '\n    ' + [...new Set(brk)].slice(0, 12).join('\n    ') : 'keine'}`);
    ok(wid.length === 0, `Breite ${width} px ${mode}: ${wid.length ? wid.join('; ') : 'keine Seite zu breit'}`);
    await ctx.close();
  }
  writeFileSync(join(out, 'hinweise-44.tsv'), [...hints.keys()].join('\n'));
  if (hints.size) console.log(`Ausnahmen unter 44 px (ALLOW): ${hints.size} Arten, z. B. ${[...hints.keys()].slice(0, 5).join(' | ')}`);
}

ok(errs.length === 0, `keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
console.log(`Screenshots: ${out}`);
await b.close(); await srv.close();
done();
