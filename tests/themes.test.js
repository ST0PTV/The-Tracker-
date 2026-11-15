// Themes (0.4.1): Auswahl-Logik, gleiche Leistenfarben in theme.js und index.html, Kontrast jeder Palette aus css/app.css.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { appearanceOf, paletteOf, modeOf, PALETTES, BAR } from '../js/core/theme.js';

const css = readFileSync(new URL('../css/app.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('Auswahl: unbekannte Werte fallen auf Apple nativ / dunkel zurück', () => {
  assert.equal(appearanceOf({}), 'dark');
  assert.equal(appearanceOf({ appearance: 'light' }), 'light');
  assert.equal(appearanceOf({ appearance: 'system' }), 'system');
  assert.equal(appearanceOf({ appearance: 'pink' }), 'dark');
  assert.equal(paletteOf(null), 'nativ');
  assert.equal(paletteOf({ palette: 'sand' }), 'sand');
  assert.equal(paletteOf({ palette: 'neon' }), 'nativ');
  assert.equal(modeOf('system', true), 'light');
  assert.equal(modeOf('system', false), 'dark');
  assert.equal(modeOf('dark', true), 'dark');
});

// Tokens eines Blocks mit genau diesem Selektor (Anfang der Regel)
function block(selector) {
  const i = css.indexOf(selector + ' {');
  assert.ok(i >= 0, `Block fehlt: ${selector}`);
  const body = css.slice(css.indexOf('{', i) + 1, css.indexOf('}', i));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}
const BASE = { dark: block(':root'), light: block(':root[data-theme="light"]') };
const tokens = (pal, mode) => {
  if (pal === 'nativ') return { ...BASE.dark, ...(mode === 'light' ? BASE.light : {}) };
  const d = block(`:root[data-palette="${pal}"], [data-pv="${pal}"]`);
  const l = mode === 'light' ? block(`:root[data-palette="${pal}"][data-theme="light"], :root[data-theme="light"] [data-pv="${pal}"]`) : {};
  return { ...BASE.dark, ...(mode === 'light' ? BASE.light : {}), ...d, ...l };
};

const rgba = (c) => {
  if (c.startsWith('#')) return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)).concat(1);
  const n = c.match(/[\d.]+/g).map(Number); return n.length === 3 ? n.concat(1) : n;
};
const over = (fg, bg) => { const [r, g, b, a] = rgba(fg); const B = rgba(bg); return [r * a + B[0] * (1 - a), g * a + B[1] * (1 - a), b * a + B[2] * (1 - a), 1]; };
const lum = ([r, g, b]) => { const l = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const hexOf = (c) => '#' + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

const TEXT = ['--text', '--muted', '--accent', '--warn', '--danger', '--c-water', '--c-caf', '--c-alc', '--c-wt', '--c-supp', '--c-goal', '--c-body', '--c-app',
  '--c-cyc', '--c-fert', '--c-fsh', '--c-lh', '--c-e2', '--c-p4'];

for (const [pal] of PALETTES) for (const mode of ['dark', 'light']) {
  test(`Kontrast ${pal} ${mode}: Text und Tracker-Farben ≥ 4,5:1, --faint ≥ 3:1`, () => {
    const t = tokens(pal, mode);
    // Grund: die Grundfarbe und bei Glas jede Farbe des Verlaufs (dort kann die Karte liegen)
    const grounds = [t['--bg'], ...((t['--bg-art'] || '').match(/#[0-9A-Fa-f]{6}/g) || [])];
    const bad = [];
    for (const g of grounds) {
      const card = over(t['--surface'], g);
      for (const k of TEXT) { const r = ratio(rgba(t[k]), card); if (r < 4.5) bad.push(`${k} ${r.toFixed(2)} auf ${hexOf(card)}`); }
      const f = ratio(rgba(t['--faint']), card); if (f < 3) bad.push(`--faint ${f.toFixed(2)} auf ${hexOf(card)}`);
    }
    const oa = ratio(rgba(t['--on-accent']), rgba(t['--accent'])); if (oa < 4.5) bad.push(`--on-accent ${oa.toFixed(2)}`);
    assert.deepEqual(bad, []);
  });
}

test('Akzent und 3D-Figur als #rrggbb (body3d.js mischt diese Werte)', () => {
  for (const [pal] of PALETTES) for (const mode of ['dark', 'light']) {
    const t = tokens(pal, mode);
    for (const k of ['--accent', '--fig3d-base', '--fig3d-rest']) assert.match(t[k], /^#[0-9A-Fa-f]{6}$/, `${pal} ${mode} ${k}`);
  }
});

test('Leistenfarbe = Grund des Themes, in theme.js und index.html gleich', () => {
  const m = html.match(/var BAR = (\{[^}]+\})/);
  assert.ok(m, 'BAR in index.html fehlt');
  const inline = Function(`return ${m[1]}`)();
  for (const [pal] of PALETTES) {
    assert.deepEqual(inline[pal], [BAR[pal].dark, BAR[pal].light], pal);
    assert.equal(BAR[pal].dark.toUpperCase(), tokens(pal, 'dark')['--bg'].toUpperCase(), `${pal} dunkel`);
    assert.equal(BAR[pal].light.toUpperCase(), tokens(pal, 'light')['--bg'].toUpperCase(), `${pal} hell`);
  }
});
