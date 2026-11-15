// 0.5.1 weitere Lücken: Wochenstreifen und Monat, Wischen, „Wann gegessen?“, Wochenrückblick, Tagesabschluss,
// „Geplant für heute“ (Teil heute); weitere Teile siehe unten. Uhr fest auf Montag 20:30, damit Rückblick und Abschluss
// erscheinen. Aufruf: node tests/browser/check-luecken.mjs [teil]
import { launch, startServer, checker, outDir, settle } from './lib.mjs';
import { join } from 'node:path';

const only = process.argv[2] || '';
const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('luecken');
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block', acceptDownloads: true });
await ctx.clock.install({ time: new Date('2026-11-16T20:30:00') });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
const go = async (hash, ms = 400) => { await p.goto('about:blank'); await p.goto(srv.url + '/index.html#' + hash); await settle(p, ms); };
const text = () => p.evaluate(() => document.getElementById('view').innerText);
const shot = (n, full = false) => p.screenshot({ path: join(out, n + '.png'), fullPage: full });
const ls = (k) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), k);
const part = (name) => !only || only === name;

// Grunddaten: Beispieldaten, Rundgang gesehen
await p.goto(srv.url + '/index.html#/ich'); await p.evaluate(() => localStorage.clear()); await p.reload(); await settle(p, 300);
await p.click('button:has-text("Beispieldaten laden")');
await p.waitForFunction(() => /Beispiel-Einträge vorhanden/.test(document.body.innerText), null, { timeout: 15000 });
await p.evaluate(() => {
  localStorage.setItem('tt_intro', JSON.stringify({ tour: 'done' }));
  // Abschluss braucht Offenes: heute noch kein Wasser
  const w = JSON.parse(localStorage.getItem('tt_water')); w.enabled = true; delete w.log['2026-11-16']; localStorage.setItem('tt_water', JSON.stringify(w));
});

// ---------- Heute ----------
if (part('heute')) {
  await go('/');
  const t0 = await text();
  ok(await p.locator('.wk-strip .wk-d').count() === 7, 'Wochenstreifen mit 7 Tagen');
  ok(await p.locator('.wk-d.sel.today').count() === 1, 'heute gewählt und markiert');
  ok(await p.locator('.wk-d.fut').count() === 6 && await p.locator('.wk-d[disabled]').count() === 0, 'Montag: 6 Tage in der Zukunft blasser, aber wählbar');
  ok(/Rückblick/i.test(t0) && /Letzte Woche/.test(t0) && /Tage erfasst/.test(t0), 'Montag: Wochenrückblick');
  ok(/Tagesabschluss/.test(t0) && /Noch offen/.test(t0), '20:30: Tagesabschluss mit Offenem');
  await shot('heute-oben');
  // Rückblick „Gelesen“
  await p.click('.rv-card button:has-text("Gelesen")'); await settle(p, 300);
  ok(!/Rückblick/i.test(await text()) && (await ls('tt_review')).seen === '2026-11-09', 'Gelesen: Karte weg, Woche vermerkt');
  // Wischen über den Streifen: Vorwoche
  const box = await p.locator('.wk-strip').boundingBox();
  await p.mouse.move(box.x + 60, box.y + 30); await p.mouse.down(); await p.mouse.move(box.x + 200, box.y + 32, { steps: 6 }); await p.mouse.up(); await settle(p, 300);
  ok(/Mo\., 9\. Nov/.test(await p.locator('.day-head h1').innerText()), `Wischen nach rechts: Vorwoche (${await p.locator('.day-head h1').innerText()})`);
  // Monat: Tag wählen
  await p.click('button[aria-label="Tag im Kalender wählen"]'); await settle(p, 300);
  ok(await p.locator('.mo-d').count() === 30 && await p.locator('.mo-d.on').count() > 10, 'Monat: 30 Tage, Punkte bei Tagen mit Einträgen');
  await shot('monat');
  await p.click('.mo-d:has-text("12")'); await settle(p, 300);
  ok(/Do\., 12\. Nov/.test(await p.locator('.day-head h1').innerText()), 'Monat: Tag gewählt');
  await p.click('.day-nav button:has-text("Heute")'); await settle(p, 300);
  ok(await p.locator('.day-head h1').innerText() === 'Heute', 'zurück zu heute');

  // Wischen auf einem Eintrag: Gestern öffnen (heute hat ggf. wenige Einträge)
  await p.click('.wk-d:nth-child(1)'); await settle(p, 200);
  await go('/');
  await p.click('button[aria-label="Tag im Kalender wählen"]'); await settle(p, 200);
  await p.click('.mo-d:has-text("15")'); await settle(p, 300);
  await p.locator('.meal-toggle').first().click(); await settle(p, 300);
  const n0 = await p.evaluate(() => JSON.parse(localStorage.getItem('tt_days'))['2026-11-15'].length);
  const row = p.locator('.sw-wrap .entry').first();
  let rb = await row.boundingBox();
  await p.mouse.move(rb.x + rb.width - 40, rb.y + rb.height / 2); await p.mouse.down();
  await p.mouse.move(rb.x + rb.width - 100, rb.y + rb.height / 2 + 2, { steps: 4 });
  ok(await p.locator('.sw-wrap.to-del').count() === 1, 'kurz nach links: „Löschen“ sichtbar');
  await shot('wischen-links');
  await p.mouse.move(rb.x + 20, rb.y + rb.height / 2 + 2, { steps: 6 }); await p.mouse.up(); await settle(p, 500);
  const n1 = await p.evaluate(() => JSON.parse(localStorage.getItem('tt_days'))['2026-11-15'].length);
  ok(n1 === n0 - 1 && /gelöscht/.test(await p.locator('#toast').innerText()), `ganz nach links: gelöscht (${n0} → ${n1})`);
  ok(await p.locator('.sheet').count() === 0, 'Wischen öffnet keinen Dialog');
  await p.click('#toast .toast-act'); await settle(p, 300);
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('tt_days'))['2026-11-15'].length) === n0, 'Rückgängig stellt wieder her');
  await p.locator('.meal-toggle').first().click().catch(() => {}); await settle(p, 200);
  if (!(await p.locator('.sw-wrap .entry').count())) { await p.locator('.meal-toggle').first().click(); await settle(p, 200); }
  rb = await p.locator('.sw-wrap .entry').first().boundingBox();
  await p.mouse.move(rb.x + 30, rb.y + rb.height / 2); await p.mouse.down(); await p.mouse.move(rb.x + 260, rb.y + rb.height / 2 + 2, { steps: 6 }); await p.mouse.up(); await settle(p, 400);
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('tt_days'))['2026-11-15'].length) === n0 + 1, 'nach rechts: noch einmal eingetragen');
  // Antippen öffnet weiter den Dialog
  await p.locator('.sw-wrap .entry').first().click(); await settle(p, 300);
  ok(await p.locator('.sheet').count() === 1, 'Antippen öffnet den Eintrag');
  await p.keyboard.press('Escape'); await settle(p, 200);

  // „Wann gegessen?“
  await p.click('.meal-time'); await settle(p, 300);
  ok(/Wann gegessen/.test(await p.locator('.sheet').innerText()), 'Uhrzeit-Dialog');
  await p.fill('.sheet input[type=time]', '07:15');
  await p.click('.sheet .btn.primary'); await settle(p, 300);
  const meal0 = await p.evaluate(() => { const l = JSON.parse(localStorage.getItem('tt_days'))['2026-11-15']; const m = l[0].meal; return l.filter((e) => e.meal === m && !e.link).every((e) => e.t === '07:15'); });
  ok(meal0, 'Uhrzeit gilt für alle Einträge der Mahlzeit');
  ok(/gegessen um 07:15/.test(await text()), 'Mahlzeit zeigt „gegessen um 07:15“');
  await shot('mahlzeit-zeit');

  // Tagesabschluss: Wasser-Chip trägt ein; Ausblenden
  await go('/');
  const w0 = await p.evaluate(() => (JSON.parse(localStorage.getItem('tt_water')).log['2026-11-16'] || []).length);
  if (await p.locator('.cl-chip.k-water').count()) {
    await p.click('.cl-chip.k-water'); await settle(p, 300);
    ok(await p.evaluate(() => (JSON.parse(localStorage.getItem('tt_water')).log['2026-11-16'] || []).length) === w0 + 1, 'Abschluss: Wasser-Chip trägt ein');
  }
  await p.click('.cl-card button:has-text("Ausblenden")'); await settle(p, 300);
  ok(!/Tagesabschluss/.test(await text()), 'Abschluss ausgeblendet');

  // Geplant für heute: Rezepte starten, ein Gericht für heute übernehmen
  await p.evaluate(() => {
    const r = JSON.parse(localStorage.getItem('tt_recipes') || '{}'); r.started = true; localStorage.setItem('tt_recipes', JSON.stringify(r));
    localStorage.setItem('tt_week', JSON.stringify({ meals: ['breakfast', 'lunch', 'dinner'], portions: null, fit: true, seed: 0, bought: {},
      slots: { '2026-11-16|lunch': { id: 'overnight-oats', ok: false }, '2026-11-16|dinner': { id: 'overnight-oats', ok: true } } }));
  });
  await go('/', 900);
  await p.waitForFunction(() => /Geplant für heute/.test(document.getElementById('view').innerText), null, { timeout: 15000 });
  await p.waitForFunction(() => /kcal/.test(document.querySelector('.pl-card')?.innerText || ''), null, { timeout: 15000 });
  const pl = await p.locator('.pl-card').innerText();
  ok(/Overnight Oats/.test(pl) && /Abend/.test(pl) && !/Mittag/.test(pl), 'Geplant: nur übernommene Gerichte');
  await shot('geplant');
  const d0 = await p.evaluate(() => (JSON.parse(localStorage.getItem('tt_days'))['2026-11-16'] || []).length);
  await p.click('.pl-card button:has-text("Eintragen")'); await settle(p, 400);
  ok(await p.evaluate(() => (JSON.parse(localStorage.getItem('tt_days'))['2026-11-16'] || []).length) === d0 + 1, 'Eintragen: im Tagebuch');
  ok(/eingetragen/.test(await p.locator('.pl-card').innerText()) && await p.locator('.pl-card .pl-ok').count() === 1, 'Geplant: als eingetragen markiert');
  await go('/ich/heute');
  ok(/Geplant für heute/.test(await text()), 'Heute anpassen: Karte „Geplant für heute“');
}

// ---------- Tagesziel ----------
if (part('ziel')) {
  await go('/ich/ziel');
  ok(await p.locator('.gl-hist').count() >= 1 && /gilt jetzt/.test(await text()), 'Tagesziel: Liste der Ziele mit „gilt jetzt“');
  await p.click('.seg button:has-text("Eigene")'); await settle(p, 200);
  ok(await p.locator('.gl-custom').isVisible(), 'Eigene: g/kg-Felder sichtbar');
  await p.fill('input[aria-label="Eiweiß pro kg"]', '5'); await p.fill('input[aria-label="Kalorienziel"]', '2000');
  await p.click('button:has-text("Speichern")'); await settle(p, 300);
  ok(/zwischen 0,6 und 3 g pro kg/.test(await p.locator('#toast').innerText()), 'Bereichsprüfung g/kg');
  await p.fill('input[aria-label="Eiweiß pro kg"]', '1,8'); await p.fill('input[aria-label="Fett pro kg"]', '0,9');
  await p.click('.cfg-row:has-text("Selbst festlegen") .cfg-sw'); await settle(p, 200);
  await p.fill('input[aria-label="Ballaststoffe"]', '35');
  await p.fill('input[aria-label="Gilt ab"]', '2026-11-20'); await p.dispatchEvent('input[aria-label="Gilt ab"]', 'change'); await settle(p, 200);
  ok(/Bis dahin gilt das bisherige Ziel/.test(await text()), '„Gilt ab“ in der Zukunft erklärt');
  await shot('ziel', true);
  await p.click('button:has-text("Speichern")'); await settle(p, 300);
  const goals = await ls('tt_goals');
  const ng = goals.find((x) => x.from === '2026-11-20');
  ok(ng && ng.preset === 'custom' && ng.pf === 1.8 && ng.fiber === 35 && ng.goal === 2000, `Ziel ab 20.11. mit eigenen Werten (${JSON.stringify(ng)})`);
  await go('/ich/ziel');
  ok(/geplant ab/.test(await text()), 'Liste: geplantes Ziel');
  const n0 = (await ls('tt_goals')).length;
  await p.locator('.gl-hist .gl-del').first().click(); await settle(p, 300);
  ok((await ls('tt_goals')).length === n0 - 1, 'Ziel gelöscht');
  await p.click('#toast .toast-act'); await settle(p, 300);
  ok((await ls('tt_goals')).length === n0, 'Rückgängig');
}

// ---------- Meine Lebensmittel ----------
if (part('lebensmittel')) {
  await p.evaluate(() => {
    localStorage.setItem('tt_custom', JSON.stringify([{ src: 'custom', id: 'custom:a1', n: 'Proteinriegel Haus', brand: '', k: 355, p: 30, c: 35, f: 10, fi: 3, su: 8, fs: null, serving: 62, barcode: null, liq: false, ns: 'hand' }]));
    localStorage.setItem('tt_offcache', JSON.stringify({ '4000000000001': { src: 'off', id: 'off:4000000000001', barcode: '4000000000001', n: 'Skyr Natur', brand: 'Testmarke', k: 63, p: 11, c: 4, f: 0.2, fi: 0, su: 4, fs: null, serving: null, liq: false } }));
  });
  await go('/ich');
  ok(/Meine Lebensmittel/.test(await text()), 'Ich: Zeile „Meine Lebensmittel“');
  await go('/ich/lebensmittel', 600);
  let t = await text();
  ok(/Proteinriegel Haus/.test(t) && /Skyr Natur/.test(t) && /Einkauf erfassen/.test(t) && /Teilen/.test(t), 'Liste mit eigenem und gescanntem Produkt, Aktionen oben');
  await shot('lebensmittel');
  await p.click('.mf-chips .chip:has-text("Gescannt")'); await settle(p, 300);
  t = await text();
  ok(/Skyr/.test(t) && !/Proteinriegel/.test(t), 'Filter „Gescannt“');
  await p.click('.mf-chips .chip:has-text("Alle")'); await settle(p, 300);
  await p.fill('input[aria-label="Meine Lebensmittel durchsuchen"]', 'riegel'); await settle(p, 200);
  ok(await p.locator('.mf-list .row').count() === 1, 'Suche');
  await p.fill('input[aria-label="Meine Lebensmittel durchsuchen"]', ''); await settle(p, 200);
  await p.click('.mf-list .row:has-text("Skyr")'); await settle(p, 300);
  await p.click('.sheet .cfg-row:has-text("Als Favorit merken")'); await settle(p, 300);
  ok((await ls('tt_favs')).some((x) => x.id === 'off:4000000000001'), 'Favorit gemerkt');
  // Teilen → Datei
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 10000 }), p.click('.mf-top .btn:has-text("Teilen")')]);
  const file = join(out, 'lebensmittel.json'); await dl.saveAs(file);
  const { readFileSync, writeFileSync } = await import('node:fs');
  const fd = JSON.parse(readFileSync(file, 'utf8'));
  ok(fd.kind === 'foods' && fd.custom.length === 1 && fd.scanned.length === 1 && fd.favs.includes('off:4000000000001') && !('days' in fd), 'Datei: eigene, gescannte, Favoriten, kein Tagebuch');
  // Löschen + Rückgängig
  await p.click('.mf-list .row:has-text("Proteinriegel")'); await settle(p, 300);
  await p.click('.sheet .cfg-row:has-text("Löschen")'); await settle(p, 300);
  ok((await ls('tt_custom')).length === 0, 'eigenes Lebensmittel gelöscht');
  await p.click('#toast .toast-act'); await settle(p, 300);
  ok((await ls('tt_custom')).length === 1, 'Rückgängig');
  // Laden: Datei mit einem neuen und einem vorhandenen Lebensmittel
  fd.custom.push({ ...fd.custom[0], id: 'custom:b2', n: 'Nussmischung', k: 610 });
  fd.custom.push({ id: 'custom:x', n: '<img src=x onerror=alert(1)>', k: 'viel' });
  writeFileSync(file, JSON.stringify(fd));
  await p.setInputFiles('input[aria-label="Lebensmittel-Datei wählen"]', file); await settle(p, 500);
  const conf = await p.locator('.sheet').innerText();
  ok(/1 eigene/.test(conf) && /1 fehlerhafte/.test(conf), `Laden: nur Neues, Fehlerhaftes übersprungen (${conf.replace(/\s+/g, ' ').slice(0, 80)})`);
  await p.click('.sheet .btn.primary'); await settle(p, 300);
  ok((await ls('tt_custom')).length === 2 && /Nussmischung/.test(await text()), 'Laden: Nussmischung übernommen');
  // Einkauf erfassen: Barcode eintippen (bekanntes Produkt) → gemerkt, nichts eingetragen
  await p.evaluate(() => localStorage.setItem('tt_favs', '[]')); await go('/ich/lebensmittel', 500);
  const days0 = await p.evaluate(() => localStorage.getItem('tt_days'));
  await p.click('.mf-top .btn:has-text("Einkauf erfassen")'); await settle(p, 500);
  await p.fill('input[aria-label="Barcode eintippen"]', '4000000000001'); await p.click('.sheet button:has-text("Suchen")'); await settle(p, 600);
  ok((await ls('tt_favs')).some((x) => x.id === 'off:4000000000001') && await p.evaluate(() => localStorage.getItem('tt_days')) === days0, 'Einkauf erfassen: gemerkt, nicht eingetragen');
  await p.keyboard.press('Escape'); await settle(p, 300);

  // Eigenes Rezept je 100 g
  await go('/ich/lebensmittel/rezept', 500);
  await p.fill('input[aria-label="Name des Rezepts"]', 'Mein Müsli');
  await p.click('.cfg-action:has-text("Zutat hinzufügen")'); await settle(p, 500);
  await p.waitForFunction(() => /Bundeslebensmittelschlüssel/.test(document.body.innerText), null, { timeout: 15000 });
  await p.fill('input[aria-label="Lebensmittel suchen"]', 'haferflocken'); await settle(p, 400);
  const oats = await p.locator('.sheet .results .row').first().innerText();
  const oatsK = Number(oats.match(/([\d.]+) kcal/)[1].replace('.', ''));
  await p.locator('.sheet .results .row').first().click(); await settle(p, 400);
  await p.fill('.sheet input[aria-label^="Menge"]', '100'); await p.click('.sheet .btn.primary:has-text("Hinzufügen")'); await settle(p, 400);
  await p.fill('input[aria-label="Endgewicht"]', '200'); await p.press('input[aria-label="Endgewicht"]', 'Tab'); await settle(p, 300);
  await p.fill('input[aria-label="Portionen"]', '2'); await p.press('input[aria-label="Portionen"]', 'Tab'); await settle(p, 300);
  await shot('rezept-100g');
  await p.click('button:has-text("Speichern")'); await settle(p, 400);
  const rf = (await ls('tt_custom')).find((x) => x.n === 'Mein Müsli');
  ok(rf && rf.ns === 'rezept' && Math.abs(rf.k - oatsK / 2) <= 1 && rf.serving === 100 && rf.parts.length === 1, `Rezept je 100 g: halbe kcal der Haferflocken (${rf && rf.k} / ${oatsK})`);
  ok(/Mein Müsli/.test(await text()) && /Rezept/.test(await text()), 'Rezept in „Meine Lebensmittel“');
}

// ---------- Rezepte und Vorrat ----------
if (part('rezepte')) {
  await p.evaluate(() => {
    const r = JSON.parse(localStorage.getItem('tt_recipes') || '{}'); r.started = true; localStorage.setItem('tt_recipes', JSON.stringify(r));
    const it = (id, fn, qty, qu, k, extra = {}) => ({ id, n: fn, brand: '', ref: 'rb:' + fn, src: 'rb', fn, qty, qu, ug: 1, k, p: 5, c: 50, f: 5, fi: 3, su: 5, added: '2026-11-01T10:00:00Z', ...extra });
    localStorage.setItem('tt_vorrat', JSON.stringify([
      it('v1', 'Haferflocken', 500, 'g', 370), it('v2', 'Joghurt', 500, 'g', 60), it('v3', 'Milch', 1000, 'ml', 64, { liq: true }), it('v4', 'Beeren', 300, 'g', 40), it('v5', 'Honig', 200, 'g', 300),
      it('v6', 'Banane', 0, 'stk', 93, { ug: 120 }),
      { id: 'v7', n: 'Riegel', brand: 'X', ref: 'off:1', src: 'off', fn: '', qty: 2, qu: 'pkg', ug: 40, k: 450, p: 6, c: 60, f: 20, serving: 40, snack: true, added: '2026-11-01T10:00:00Z' }]));
    localStorage.setItem('tt_week', JSON.stringify({ meals: ['breakfast', 'lunch', 'dinner'], portions: null, fit: true, seed: 0, bought: {}, slots: {} }));
  });
  await go('/rezepte/vorrat', 900);
  await p.waitForFunction(() => /Kochen mit dem Vorrat/.test(document.getElementById('view').innerText), null, { timeout: 15000 });
  await p.click('a:has-text("Kochen mit dem Vorrat")'); await settle(p, 900);
  await p.waitForFunction(() => /Alles da/i.test(document.getElementById('view').innerText), null, { timeout: 15000 });
  const ck = await text();
  ok(/Overnight Oats/.test(ck.split(/Fehlt wenig/i)[0]), 'Kochen: Overnight Oats unter „Alles da“');
  await shot('kochen');
  if (await p.locator('.ck-row button:has-text("Auf die Liste")').count()) {
    await p.locator('.ck-row button:has-text("Auf die Liste")').first().click(); await settle(p, 300);
    ok((await ls('tt_week')).extra.length >= 1, 'Fehlt wenig: auf die Einkaufsliste');
  } else ok(false, 'Kochen: kein Rezept unter „Fehlt wenig“');
  // Vorrat: Herz, Nährwerte, Wegwerfen
  await go('/rezepte/vorrat', 600);
  await p.click('.vr-main:has-text("Haferflocken")'); await settle(p, 300);
  await p.click('.sheet .cfg-row:has-text("Favorit") .cfg-sw'); await settle(p, 300);
  ok((await ls('tt_vorrat')).find((x) => x.id === 'v1').fav === true, 'Vorrat: Herz gesetzt');
  await p.click('.sheet .vr-nut summary'); await settle(p, 200);
  ok(/Kohlenhydrate/.test(await p.locator('.sheet .vr-nut').innerText()), 'Nährwerte aufgeklappt');
  const days0 = await p.evaluate(() => localStorage.getItem('tt_days'));
  await p.fill('.sheet input[aria-label^="Weggeworfen"]', '100'); await p.click('.sheet .btn:has-text("Abziehen")'); await settle(p, 300);
  ok((await ls('tt_vorrat')).find((x) => x.id === 'v1').qty === 400 && await p.evaluate(() => localStorage.getItem('tt_days')) === days0, 'Wegwerfen: 100 g ab, nicht im Tagebuch');
  ok(/weggeworfen/.test(await p.locator('#toast').innerText()), 'Wegwerfen: Meldung mit Rückgängig');
  ok(await p.locator('.vr-fav').count() === 1, 'Herz in der Liste');
  await shot('vorrat-herz');
  // Einkaufsliste
  await p.addInitScript(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { window.__clip = t; } }, configurable: true }); });
  await go('/rezepte/einkauf', 900);
  await p.waitForFunction(() => /Außerdem|AUSSERDEM/.test(document.getElementById('view').innerText), null, { timeout: 15000 });
  let sh = await text();
  ok(/aufgebraucht/i.test(sh) && /\+ Banane/.test(sh), 'Einkauf: Banane unter „Im Vorrat aufgebraucht“');
  await p.click('.sh-used .chip:has-text("Banane")'); await settle(p, 300);
  await p.fill('input[aria-label="Eigenen Punkt hinzufügen"]', 'Kaffee'); await p.press('input[aria-label="Eigenen Punkt hinzufügen"]', 'Enter'); await settle(p, 300);
  ok((await ls('tt_week')).extra.some((x) => x.text === 'Kaffee') && (await ls('tt_week')).extra.some((x) => x.text === 'Banane'), 'eigene Punkte: Kaffee und Banane');
  await p.click('.sh-copy'); await settle(p, 300);
  const clip = await p.evaluate(() => window.__clip || '');
  ok(/^Einkaufsliste/.test(clip) && /- Kaffee/.test(clip), `Als Text kopiert (${clip.split('\n').length} Zeilen)`);
  await p.click('.sh-line:has-text("Kaffee") .sh-row'); await settle(p, 200);
  await p.click('.sh-topantry'); await settle(p, 300);
  ok(!(await ls('tt_week')).extra.some((x) => x.text === 'Kaffee'), 'abgehakter eigener Punkt nach dem Einkauf weg');
  await shot('einkauf');
  // Snack-Produkt zwischen den Vorschlägen
  await go('/rezepte?m=snack', 900);
  await p.waitForSelector('.rz-prod', { timeout: 15000 }).catch(() => {});
  ok(/Riegel/.test(await p.locator('.rz-list').first().innerText()) && /aus dem Vorrat/.test(await text()), 'Snack-Vorschläge: Riegel aus dem Vorrat');
}

// ---------- Tipps im Training ----------
if (part('tipps')) {
  await go('/training/fortschritt', 1500);
  await p.waitForSelector('.tip-box', { timeout: 8000 }).catch(() => {});
  ok(/4 Wochen/.test(await p.locator('.tip-box').innerText().catch(() => '')), 'Fortschritt: Tipp zu „4 Wochen“');
  await shot('tipp');
  await p.click('.tip-box .tip-ok'); await settle(p, 200);
  ok((await ls('tt_intro')).tips['progress-4w'] === true && await p.locator('.tip-box').count() === 0, 'Verstanden: Tipp gemerkt');
  await go('/training/fortschritt', 1500);
  ok(await p.locator('.tip-box').count() === 0, 'gesehener Tipp kommt nicht wieder');
  await go('/ich/einfuehrung');
  await p.click('.cfg-row:has-text("Tipps im Training") .cfg-sw'); await settle(p, 200);
  ok((await ls('tt_intro')).hints === false, 'Tipps abschaltbar');
  await go('/training/plaene', 1500);
  ok(await p.locator('.tip-box').count() === 0, 'abgeschaltet: kein Tipp');
}

ok(errs.length === 0, `keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
console.log(`Screenshots: ${out}`);
await b.close(); await srv.close();
done();
