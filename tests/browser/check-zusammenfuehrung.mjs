// Phase-5-Ende (0.5.0): Einführung (Rundgang über alle Bereiche, Probetraining in der Sandbox), gespeicherte Mahlzeiten,
// Plan-Vorschlag im Magen-Modell, Snack-Rahmen und Mangel im Vorrat, Mikronährstoffe auf der Rezeptseite, Zyklus-Statistik
// und Hinweis-Einstellungen. Aufruf: node tests/browser/check-zusammenfuehrung.mjs
import { launch, startServer, checker, outDir, settle } from './lib.mjs';
import { join } from 'node:path';

const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('zusammenfuehrung');
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' })).newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
const go = async (hash, ms = 400) => { await p.goto(srv.url + '/index.html#' + hash); await settle(p, ms); };
const text = () => p.evaluate(() => document.getElementById('view').innerText);
const shot = (n) => p.screenshot({ path: join(out, n + '.png') });

// ---------- Einführung: neue Person ----------
await p.goto(srv.url + '/index.html'); await p.evaluate(() => localStorage.clear()); await p.reload(); await settle(p, 300);
ok(/Neu hier\?/.test(await text()), 'Heute: Willkommenskarte für neue Nutzer');
await shot('willkommen');
await p.click('.intro-card .btn.primary'); await settle(p, 400);
let steps = 0;
for (let i = 0; i < 12; i++) {
  const bub = await p.locator('.tour-bub').innerText().catch(() => '');
  if (!bub) break;
  const m = bub.match(/Schritt (\d+) von (\d+)/);
  if (m) {
    steps++;
    const hole = await p.evaluate(() => document.querySelector('.tour-root').classList.contains('tour-hole'));
    if (!hole) errs.push(`Rundgang Schritt ${m[1]} ohne Ziel`);
    if (+m[1] === 1 || +m[1] === 6) await shot(`rundgang-${m[1]}`);
  }
  if (/Fertig/.test(bub) && !m) break;
  await p.click('.tour-bub .btn.primary'); await settle(p, 700);
}
ok(steps === 8, `Rundgang: 8 Schritte mit Ziel (${steps})`);
ok(/Probetraining/.test(await p.locator('.tour-bub').innerText()), 'Ende fragt nach dem Probetraining');
await p.click('.tour-bub .tour-link:has-text("Später")'); await settle(p, 500);
ok(await p.locator('.tour-root').count() === 0 && !/Neu hier\?/.test(await text()), 'nach dem Rundgang: kein Spotlight, keine Willkommenskarte');
ok(await p.evaluate(() => JSON.parse(localStorage.getItem('tt_intro')).tour) === 'done', 'Rundgang als gesehen gespeichert');

// ---------- Beispieldaten ----------
await go('/ich');
await p.click('button:has-text("Beispieldaten laden")');
await p.waitForFunction(() => /Beispiel-Einträge vorhanden/.test(document.body.innerText), null, { timeout: 15000 });
const realBefore = await p.evaluate(() => localStorage.getItem('tt_training_sessions'));

// ---------- Probetraining ----------
await go('/ich/einfuehrung');
await p.click('.cfg-action:has-text("Probetraining starten")');
await p.waitForSelector('.tour-banner', { timeout: 15000 });
await p.waitForSelector('.tour-bub:has-text("Satz abhaken")', { timeout: 10000 });
await shot('probe-1');
await p.click('#view .setrow:not(.done) .ck'); await settle(p, 500);
ok(/Pause/.test(await p.locator('.tour-bub').innerText()), 'Probetraining: nach dem Haken kommt die Pause');
await p.click('.tour-bub .btn.primary'); await settle(p, 400);
ok(/Nächste Übung/.test(await p.locator('.tour-bub').innerText()), 'dann „Nächste Übung“');
ok(await p.evaluate(() => localStorage.getItem('tt_training_sessions')) === realBefore, 'echte Trainingsdaten unverändert');
await p.click('.tour-banner-end'); await settle(p, 600);
ok(await p.locator('.tour-banner').count() === 0 && /unverändert/.test(await p.locator('#toast').innerText()), 'Beenden: Banner weg, Meldung');
ok(await p.evaluate(() => localStorage.getItem('tt_training_sessions')) === realBefore, 'nach dem Probetraining: echte Daten gleich');
ok(!/Probetraining/.test(await p.evaluate(() => localStorage.getItem('tt_training_plans'))), 'kein Probe-Plan in den echten Daten');

// ---------- Gespeicherte Mahlzeit ----------
await go('/');
await p.click('button:has-text("Vorheriger Tag")').catch(() => {});
await go('/');
await p.locator('.meal-toggle').first().click(); await settle(p, 300);
await p.click('.meal-save'); await settle(p, 300);
await p.fill('.sheet input[aria-label="Name der Mahlzeit"]', 'Mein Frühstück');
await p.click('.sheet .btn.primary:has-text("Speichern")'); await settle(p, 300);
ok(await p.evaluate(() => JSON.parse(localStorage.getItem('tt_meals'))[0].name) === 'Mein Frühstück', 'Mahlzeit gespeichert');
const nBefore = await p.evaluate(() => Object.values(JSON.parse(localStorage.getItem('tt_days'))).flat().length);
await p.click('.tab-plus'); await settle(p, 300);
await p.click('.qa-row:has-text("Gespeicherte Mahlzeit")'); await settle(p, 300);
await p.click('.sheet .entry:has-text("Mein Frühstück")'); await settle(p, 300);
await shot('mahlzeit');
await p.click('.sheet .btn.primary:has-text("Alle eintragen")'); await settle(p, 300);
const nAfter = await p.evaluate(() => Object.values(JSON.parse(localStorage.getItem('tt_days'))).flat().length);
ok(nAfter > nBefore, `gespeicherte Mahlzeit eingetragen (${nBefore} → ${nAfter})`);

// ---------- Plan-Vorschlag ----------
await go('/analyse/magen');
await p.click('.st-mode button:has-text("Plan-Vorschlag")'); await settle(p, 300);
const plan = await text();
ok(/Essfenster/.test(plan) && /Frühstück/.test(plan) && /Abendessen/.test(plan) && /kcal/.test(plan), 'Plan-Vorschlag mit Essfenster und Mahlzeiten');
await shot('plan');
await p.click('button:has-text("Plan anpassen")'); await settle(p, 300);
await p.click('.sheet .chip:has-text("Abends mehr")'); await settle(p, 300);
ok(await p.evaluate(() => JSON.parse(localStorage.getItem('tt_mealplan')).split.dinner) === 40, 'Vorlage „Abends mehr“ gespeichert');
await p.keyboard.press('Escape'); await settle(p, 200);

// ---------- Vorrat: Snack, Mangel; Rezeptseite: Mikronährstoffe ----------
await p.evaluate(() => {
  const r = JSON.parse(localStorage.getItem('tt_recipes') || '{}'); r.started = true; localStorage.setItem('tt_recipes', JSON.stringify(r));
  const pr = JSON.parse(localStorage.getItem('tt_profile') || '{}'); pr.deficits = ['fe']; localStorage.setItem('tt_profile', JSON.stringify(pr));
  localStorage.setItem('tt_vorrat', JSON.stringify([
    { id: 'v1', n: 'Banane', brand: '', ref: 'rb:Banane', src: 'rb', fn: 'Banane', qty: 3, qu: 'stk', ug: 120, k: 93, p: 1, c: 20, f: 0.2, added: '2026-11-01T10:00:00Z' },
    { id: 'v2', n: 'Riegel', brand: 'X', ref: 'off:1', src: 'off', fn: '', qty: 2, qu: 'pkg', ug: 40, k: 450, p: 6, c: 60, f: 20, serving: 40, added: '2026-11-01T10:00:00Z' },
    { id: 'v3', n: 'Linsen', brand: '', ref: 'rb:Linsen', src: 'rb', fn: 'Linsen', qty: 500, qu: 'g', ug: 1, k: 320, p: 24, c: 50, f: 1.5, added: '2026-11-01T10:00:00Z' }]));
});
await p.reload(); await go('/rezepte/vorrat', 800);
await p.waitForFunction(() => /Banane/.test(document.getElementById('view').innerText), null, { timeout: 15000 });
await p.click('.vr-main:has-text("Riegel")'); await settle(p, 300);
await p.click('.sheet .cfg-row:has-text("Als Snack vorschlagen")'); await settle(p, 300);
ok(await p.evaluate(() => JSON.parse(localStorage.getItem('tt_vorrat')).find((x) => x.id === 'v2').snack) === true, 'Riegel als Snack markiert');
await p.keyboard.press('Escape'); await settle(p, 300);
ok(/viel Eisen/.test(await text()), 'Vorrat: „viel Eisen“ bei Linsen (Mangel eingetragen)');
await p.click('.vr-rich .chip:has-text("Eisen")'); await settle(p, 300);
const rich = await text();
ok(/Linsen/.test(rich) && !/Riegel/.test(rich), 'Filter Eisen zeigt nur Reiches');
await shot('vorrat-mangel');
await p.click('.vr-rich .chip:has-text("Alle")'); await settle(p, 200);
await p.click('.vr-snacklink'); await settle(p, 500);
const sn = await text();
ok(/frei für Snacks/.test(sn) && /Riegel/.test(sn) && /Banane/.test(sn) && !/Linsen/.test(sn.split('Snack-Rezepte')[0]), 'Snack-Seite: Rahmen, Riegel und Banane, keine Linsen');
await shot('snack');
await go('/rezepte', 800);
await p.waitForSelector('#view a[href*="rezept?id"]', { timeout: 15000 });
await p.locator('#view a[href*="rezept?id"]').first().click(); await settle(p, 600);
const rp = await text();
ok(/Mineralstoffe und Vitamine/.test(rp) && /★ Eisen/.test(rp), 'Rezeptseite: Mikronährstoffe mit ★ beim eigenen Mangel');
await p.locator('.rp-micro').scrollIntoViewIfNeeded(); await shot('rezept-mikro');

// ---------- Zyklus ----------
await p.evaluate(() => {
  const z = JSON.parse(localStorage.getItem('tt_zyklus'));
  const keys = Object.keys(z.days).sort();
  for (const k of keys.slice(0, 6)) z.days[k] = { ...z.days[k], body: ['Kopfweh'], mood: ['Gereizt'] };
  localStorage.setItem('tt_zyklus', JSON.stringify(z));
});
await p.reload(); await go('/zyklus/verlauf');
// innerText liefert Abschnittstitel in Großbuchstaben (text-transform) → ohne Groß/klein vergleichen
{ const t = await text(); ok(/Beschwerden und Stimmung/i.test(t) && /Kopfweh/.test(t), 'Zyklus → Verlauf: Beschwerden und Stimmung'); }
await p.locator('.cy-stats').scrollIntoViewIfNeeded(); await shot('zyklus-statistik');
await go('/ich/zyklus');
await p.fill('input[aria-label="Mein Fenster"]', '3'); await p.keyboard.press('Tab'); await settle(p, 300);
ok(await p.evaluate(() => JSON.parse(localStorage.getItem('tt_zyklus')).tol) === 3, 'eigenes Fenster gespeichert');
await p.click('.cfg-row:has-text("Zyklen schwanken stark") .cfg-sw, .cfg-row:has-text("Zyklen schwanken stark")'); await settle(p, 300);
ok(await p.evaluate(() => JSON.parse(localStorage.getItem('tt_zyklus')).warn.spread) === false, 'Hinweis „schwanken“ abgeschaltet');
await p.locator('.cfg-sec:has-text("Hinweise zum Ansprechen")').scrollIntoViewIfNeeded(); await shot('zyklus-hinweise');

ok(errs.length === 0, `keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
console.log(`Screenshots: ${out}`);
await b.close(); await srv.close();
done();
