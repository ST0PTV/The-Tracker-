// Klickt durch alle Reiter und Unterseiten: keine Konsolenfehler, kein "null/undefined/NaN" im Text,
// Version unter „Ich“, nur eigene Speicher-Keys (tt_), hell und dunkel.
// Nach Workout-Tracker/tests/browser/check-tabs.mjs (MIT, ST0PTV).
// Aufruf: node tests/browser/check-tabs.mjs [erwartete-Version]   (Standard: VERSION aus js/core/version.js)
import { launch, startServer, checker, appVersion, outDir, BAD_TEXT } from './lib.mjs';
import { join } from 'node:path';

const ROUTES = ['#/', '#/rezepte', '#/rezepte/woche', '#/rezepte/einkauf', '#/training', '#/ich', '#/ich/ziel', '#/ich/quellen', '#/ich/koerper', '#/ich/wasser', '#/ich/koffein', '#/ich/alkohol', '#/ich/supplements', '#/ich/gewichtsziel', '#/analyse', '#/analyse/mikro', '#/analyse/monat', '#/analyse/jahr', '#/analyse/magen'];
const want = process.argv[2] || appVersion();
const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('tabs');

for (const appearance of ['dark', 'light']) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  // Fremde Keys derselben Origin simulieren: Sie dürfen nicht verändert werden.
  await p.goto(srv.url + '/index.html');
  await p.evaluate((a) => {
    localStorage.clear();
    localStorage.setItem('ct.v1', '{"fremd":1}');
    localStorage.setItem('wt_settings', '{"fremd":1}');
    localStorage.setItem('tt_settings', JSON.stringify({ appearance: a }));
  }, appearance);
  await p.reload(); await p.waitForTimeout(400); // neu starten, damit die App mit diesem Speicherstand bootet
  const theme = await p.evaluate(() => document.documentElement.getAttribute('data-theme'));
  ok((theme === 'light') === (appearance === 'light'), `${appearance}: Erscheinung beim Start gesetzt`);

  for (const r of ROUTES) {
    await p.goto(srv.url + '/index.html' + r); await p.waitForTimeout(400);
    const t = await p.evaluate(() => document.body.innerText);
    ok(!BAD_TEXT.test(t), `${appearance} ${r}: kein null/undefined/NaN im Text`);
    const active = await p.locator('.tab[aria-current="page"]').count();
    ok(active === 1, `${appearance} ${r}: genau ein aktiver Reiter`);
    if (r === '#/ich') ok(t.includes(want), `Version ${want} unter „Ich“ sichtbar`);
    await p.screenshot({ path: join(out, `${appearance}-${r.replace(/[#/]+/g, '_') || 'root'}.png`) });
  }

  // Tab-Leiste wie im Workout-Tracker: volle Breite, deckend in der Streifenfarbe, vier Tabs, erhöhter Knopf mit „+“ in der Mitte
  await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(300);
  const bar = async () => p.evaluate(() => {
    const t = document.querySelector('.tabbar').getBoundingClientRect(), k = document.querySelector('.tab-plus').getBoundingClientRect();
    const cs = getComputedStyle(document.querySelector('.tabbar')), tabs = [...document.querySelectorAll('.tabbar .tab')].map((e) => e.getBoundingClientRect());
    const strip = getComputedStyle(document.documentElement).getPropertyValue('--strip').trim();
    return { left: t.left, right: t.right, h: Math.round(t.height), bg: cs.backgroundColor, strip, kw: Math.round(k.width), kh: Math.round(k.height), raised: Math.round(t.top - k.top),
      centre: Math.round(Math.abs((k.left + k.right) / 2 - innerWidth / 2)), n: tabs.length, overlap: tabs.some((e) => e.right > k.left + 1 && e.left < k.right - 1) };
  });
  const bb = await bar();
  ok(bb.left === 0 && bb.right === 390 && bb.n === 4, `${appearance}: Leiste über die ganze Breite mit vier Tabs (${bb.left}–${bb.right}, ${bb.n})`);
  ok(bb.kw === 58 && bb.kh === 58 && bb.raised >= 10 && bb.raised <= 16 && bb.centre <= 1 && !bb.overlap, `${appearance}: Knopf 58 px, erhöht (${bb.raised} px), mittig, ohne Überlappung mit Tabs`);
  ok(bb.bg !== 'rgba(0, 0, 0, 0)' && bb.strip === (appearance === 'light' ? '#F2F2F7' : '#000000'), `${appearance}: Leiste deckend in der Streifenfarbe (${bb.bg}, ${bb.strip})`);
  await p.evaluate(() => document.documentElement.classList.add('tt-gap')); // Lücke im iOS-Home-Bildschirm: kein Abstand für den Home-Balken
  ok((await bar()).h === 58, `${appearance}: mit Lücke (tt-gap) ist die Leiste 58 px hoch`);
  await p.evaluate(() => document.documentElement.classList.remove('tt-gap'));

  const keys = await p.evaluate(() => ({ all: Object.keys(localStorage), ct: localStorage.getItem('ct.v1'), wt: localStorage.getItem('wt_settings') }));
  ok(keys.all.includes('tt_schema'), `${appearance}: Schema-Version angelegt`);
  ok(keys.all.every((k) => k.startsWith('tt_') || k === 'ct.v1' || k === 'wt_settings'), `${appearance}: nur eigene Keys angelegt (${keys.all.join(', ')})`);
  ok(keys.ct === '{"fremd":1}' && keys.wt === '{"fremd":1}', `${appearance}: fremde Keys unverändert`);
  ok(errs.length === 0, `${appearance}: keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

console.log(`Screenshots: ${out}`);
await b.close(); await srv.close();
done();
