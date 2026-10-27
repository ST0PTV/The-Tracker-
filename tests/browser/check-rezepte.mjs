// Rezepte (0.2.1) im Browser: kurzer Start, Vorschläge, Katalog mit Suche und Filtern, „Ich habe …“, Rezeptseite
// (Portionen, Schritte, Favorit, Gekocht → Journal mit Rückgängig, Mag ich nicht), eigenes Rezept, „+“-Menü, Ich.
// Prüft fremde Keys, Konsolenfehler, null/undefined/NaN; Screenshots hell/dunkel.
// Aufruf: node tests/browser/check-rezepte.mjs
import { launch, startServer, checker, outDir, BAD_TEXT } from './lib.mjs';
import { join } from 'node:path';

const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('rezepte');
const FOREIGN = { 'rezeptbuch-v1': '{"x":1}', 'ct.v1': '{"days":{}}', wt_x: '1' };

for (const appearance of ['dark', 'light']) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(srv.url + '/index.html');
  await p.evaluate(([a, f]) => { localStorage.clear(); for (const [k, v] of Object.entries(f)) localStorage.setItem(k, v); localStorage.setItem('tt_settings', JSON.stringify({ appearance: a })); localStorage.setItem('tt_profile', JSON.stringify({ sex: 'f', weightKg: 64, heightCm: 168 })); }, [appearance, FOREIGN]);
  await p.reload(); await p.waitForTimeout(300);
  const shot = (name) => p.screenshot({ path: join(out, `${appearance}-${name}.png`) });
  const text = () => p.evaluate(() => document.body.innerText);
  const hash = () => p.evaluate(() => location.hash);
  const close = async () => { while (await p.locator('.sheet').count()) { await p.locator('.sheet .sheet-close').last().click(); await p.waitForTimeout(250); } };
  const store = () => p.evaluate(() => ({ r: JSON.parse(localStorage.getItem('tt_recipes') || '{}'), d: JSON.parse(localStorage.getItem('tt_diet') || '{}'), days: JSON.parse(localStorage.getItem('tt_days') || '{}') }));

  // Start beim ersten Öffnen
  await p.click('.tab:has-text("Rezepte")'); await p.waitForTimeout(400);
  ok((await hash()) === '#/rezepte/start', `${appearance}: erstes Öffnen führt zum kurzen Start`);
  await shot('1-start');
  await p.click('.seg button:has-text("Vegetarisch")'); await p.click('.chip:has-text("Erdnuss")'); await p.waitForTimeout(100);
  let s = await store();
  ok(s.d.form === 'vegetarian' && s.d.allergens.includes('er'), `${appearance}: Ernährungsform und Allergen im Profil (tt_diet)`);
  await p.click('button:has-text("Weiter")'); await p.waitForTimeout(250);
  ok(await p.locator('.taste-row').filter({ hasText: 'Hähnchen' }).count() === 0, `${appearance}: vegetarisch → kein Hähnchen in der Geschmacksabfrage`);
  await p.click('button[aria-label="Linsen mag ich sehr"]'); await p.click('button[aria-label="Pilze mag ich nicht"]'); await p.waitForTimeout(100);
  await p.click('button:has-text("Weiter")'); await p.waitForTimeout(250);
  await p.click('.seg[aria-label="Portionen"] button:has-text("2")'); await p.waitForTimeout(100);
  await p.click('button:has-text("Fertig")'); await p.waitForTimeout(600);
  s = await store();
  ok((await hash()) === '#/rezepte' && s.r.started && s.r.taste.Linsen === 'like' && s.r.taste.Pilze === 'no' && s.r.portions === 2, `${appearance}: Start gespeichert (tt_recipes)`);

  // Tab: Vorschläge und Katalog
  let t = await text();
  ok(!BAD_TEXT.test(t), `${appearance}: Rezepte ohne null/undefined/NaN`);
  ok(await p.locator('.rz-sug-h').count() === 1 && await p.locator('.rz-list').first().locator('.rz-row').count() >= 1, `${appearance}: Vorschläge für die nächste Mahlzeit`);
  const kcalLine = await p.locator('.rz-list .rz-row small').first().innerText();
  ok(/(\d+ Min|vorkochen) · [\d.]+ kcal · E \d+ · KH \d+ · F \d+ g/.test(kcalLine), `${appearance}: Zeile mit Zeit, kcal und Makros (${kcalLine})`);
  const names = await p.locator('.rz-list').nth(1).locator('.rz-row b').allInnerTexts();
  ok(names.every((n) => !/Hähnchen|Lachs|Thunfisch|Speck|Hack|Schinken|Pilz|Champignon/i.test(n)), `${appearance}: Katalog ohne Fleisch, Fisch und Pilze`);
  ok(names.slice(0, 3).some((n) => /Linsen/.test(n)), `${appearance}: Lieblingszutat Linsen vorne (${names.slice(0, 3).join(' | ')})`);
  await shot('2-tab');
  await p.fill('.rz-search', 'curry'); await p.waitForTimeout(150);
  const hits = await p.locator('.rz-list').nth(1).locator('.rz-row b').allInnerTexts();
  ok(hits.length > 0 && hits.length < names.length && hits.some((n) => /curry/i.test(n)) && /mit „curry“/.test(await text()), `${appearance}: Suche nach „curry“ grenzt ein (${hits.length} von ${names.length})`);
  await p.fill('.rz-search', ''); await p.waitForTimeout(100);
  await p.click('.rz-chips .chip:has-text("Ich habe")'); await p.waitForTimeout(200);
  await p.fill('.rz-have input', 'Zucchini'); await p.click('.rz-have button'); await p.waitForTimeout(200);
  ok(await p.locator('.rz-row .rz-extra').count() > 0 && /mit Zucchini/.test(await text()), `${appearance}: „Ich habe …“ findet Rezepte mit Zucchini`);
  await p.click('.rz-chips .chip:has-text("Alle")'); await p.waitForTimeout(150);

  // Rezeptseite
  await p.locator('.rz-list').nth(1).locator('.rz-row').first().click(); await p.waitForTimeout(400);
  ok(/#\/rezepte\/rezept\?id=/.test(await hash()), `${appearance}: Rezeptseite geöffnet`);
  ok((await p.innerText('.rp-stp b')) === '2 Portionen', `${appearance}: Portionen aus dem Start (2)`);
  const ing1 = await p.locator('.rp-ing li span').first().innerText();
  await p.click('button[aria-label="Eine Portion weniger"]'); await p.waitForTimeout(150);
  const ing0 = await p.locator('.rp-ing li span').first().innerText();
  ok(ing0 !== ing1, `${appearance}: Zutaten skalieren (${ing1} → ${ing0})`);
  await p.locator('.rp-step').first().click(); await p.waitForTimeout(100);
  ok((await p.locator(".rp-step.done").count()) === 1 && /1 von/i.test(await text()), `${appearance}: Schritt abgehakt`);
  await p.click('.rp-acts button:has-text("Zu Favoriten")'); await p.waitForTimeout(100);
  ok((await p.locator('.rp-acts .chip.on').innerText()).includes('Favorit'), `${appearance}: Favorit gesetzt`);
  await shot('3-rezept');
  await p.click('.rp-cook .seg button:has-text("Abend")');
  const name = await p.innerText('.rp h1');
  await p.click('button:has-text("Gekocht")'); await p.waitForTimeout(300);
  s = await store();
  const today = await p.evaluate(async () => (await import('./js/core/format.js')).isoDate());
  const e = (s.days[today] || []).find((x) => x.n === name);
  ok(e && e.meal === 'dinner' && e.src === 'recipe' && e.ref.startsWith('rcp:'), `${appearance}: Gekocht → Eintrag im Journal (Abend)`);
  ok(!(s.r.cooking || {})[e?.ref?.slice(4)], `${appearance}: Schritte nach dem Kochen zurückgesetzt`);
  await p.click('.toast-act'); await p.waitForTimeout(200);
  s = await store();
  ok(!(s.days[today] || []).some((x) => x.n === name), `${appearance}: Rückgängig entfernt den Eintrag`);
  await p.click('button:has-text("Gekocht")'); await p.waitForTimeout(300);
  await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(400);
  ok((await text()).includes('Abendessen') && (await text()).includes(name.split(' ')[0]), `${appearance}: Heute zeigt das Rezept unter Abendessen`);

  // Mag ich nicht
  await p.goto(srv.url + '/index.html#/rezepte'); await p.waitForTimeout(300);
  await p.locator('.rz-list').nth(1).locator('.rz-row').nth(1).click(); await p.waitForTimeout(300);
  const rej = await p.innerText('.rp h1');
  await p.click('.rp-acts button:has-text("Mag ich nicht")'); await p.waitForTimeout(250);
  await p.click('.sheet button:has-text("Nur dieses Rezept")'); await p.waitForTimeout(300);
  ok((await hash()) === '#/rezepte' && !(await p.locator('.rz-row b').allInnerTexts()).includes(rej), `${appearance}: abgelehntes Rezept verschwindet`);
  await p.click('.toast-act'); await p.waitForTimeout(200);
  ok((await p.locator('.rz-row b').allInnerTexts()).includes(rej), `${appearance}: Rückgängig holt es zurück`);

  // Favoriten-Filter
  await p.click('.rz-chips .chip:has-text("Favoriten")'); await p.waitForTimeout(150);
  ok(await p.locator('.rz-list .rz-row').count() >= 1 && await p.locator('.rz-list .rz-fav').count() >= 1, `${appearance}: Favoriten-Filter zeigt den Favoriten`);
  await p.click('.rz-chips .chip:has-text("Alle")'); await p.waitForTimeout(100);

  // Eigenes Rezept
  await p.click('a[aria-label="Eigenes Rezept anlegen"]'); await p.waitForTimeout(300);
  await p.fill('input[aria-label="Name"]', 'Kartoffelsuppe Test');
  await p.fill('input[aria-label="Menge Zutat 1"]', '600'); await p.fill('input[aria-label="Zutat 1"]', 'Kartoffeln');
  await p.fill('input[aria-label="Menge Zutat 2"]', '1'); await p.selectOption('select[aria-label="Einheit Zutat 2"]', 'stueck'); await p.fill('input[aria-label="Zutat 2"]', 'Zwiebel');
  await p.fill('input[aria-label="Menge Zutat 3"]', '30'); await p.fill('input[aria-label="Zutat 3"]', 'Zauberpulver'); await p.waitForTimeout(100);
  ok(await p.locator('.own-kbox:not([hidden])').count() === 1 && /Unbekannt: Zauberpulver/.test(await text()), `${appearance}: unbekannte Zutat fragt nach kcal/100 g`);
  await p.fill('input[aria-label="kcal pro 100 g Zutat 3"]', '300'); await p.waitForTimeout(100);
  ok(/≈ \d+/.test(await p.innerText('.own-sum b')), `${appearance}: Rechnung pro Portion`);
  await shot('4-eigen');
  await p.click('button:has-text("Rezept speichern")'); await p.waitForTimeout(400);
  ok((await p.innerText('.rp h1')) === 'Kartoffelsuppe Test' && /eigenes Rezept/.test(await text()), `${appearance}: eigenes Rezept gespeichert und geöffnet`);
  await p.click('button:has-text("Rezept löschen")'); await p.waitForTimeout(300);
  await p.click('.toast-act'); await p.waitForTimeout(200);
  ok((await store()).r.own.some((x) => x.name === 'Kartoffelsuppe Test'), `${appearance}: Löschen rückgängig`);

  // „+“-Menü → Rezept
  await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(300);
  await p.click('.tab-plus'); await p.waitForTimeout(300);
  await p.click('.qa-meal button:has-text("Mittag")'); await p.waitForTimeout(100);
  await p.click('.qa-row:has-text("Rezept")'); await p.waitForTimeout(500);
  ok((await hash()) === '#/rezepte?m=lunch' && (await p.innerText('.rz-sug-h b')) === 'Für dein Mittagessen', `${appearance}: „+“ → Rezept zeigt Vorschläge fürs Mittagessen`);

  // Ich → Ernährung & Rezepte
  await p.goto(srv.url + '/index.html#/ich'); await p.waitForTimeout(250);
  ok((await text()).includes('Ernährung & Rezepte') && (await text()).includes('Vegetarisch'), `${appearance}: Ich zeigt Ernährung & Rezepte`);
  await p.click('a[href="#/ich/ernaehrung"]'); await p.waitForTimeout(300);
  ok(await p.locator('.taste-row').count() > 10 && await p.locator('.seg[aria-label="Ernährungsform"]').count() === 1, `${appearance}: Einstellungen auf einer Seite`);
  await shot('5-ich');

  const keys = await p.evaluate(() => ({ all: Object.keys(localStorage), rb: localStorage.getItem('rezeptbuch-v1'), ct: localStorage.getItem('ct.v1') }));
  ok(keys.all.every((k) => k.startsWith('tt_') || k in { 'rezeptbuch-v1': 1, 'ct.v1': 1, wt_x: 1 }), `${appearance}: nur tt_-Keys geschrieben`);
  ok(keys.rb === FOREIGN['rezeptbuch-v1'] && keys.ct === FOREIGN['ct.v1'], `${appearance}: Rezeptbuch- und Tracker-Speicher unverändert`);
  ok(errs.length === 0, `${appearance}: keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
  await close();
  await ctx.close();
}

console.log(`Screenshots: ${out}`);
await b.close(); await srv.close();
done();
