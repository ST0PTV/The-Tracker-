// Kalorien-Karte: Ring nach Herkunft der kcal (Eiweiß, Kohlenhydrate, Fett; Rest z. B. Alkohol grau) und Makro-Balken.
// Nach heroHtml im Kalorien-Tracker bzw. dayCard im Rezeptbuch (ST0PTV/JuliaKelp, MIT).
// Bewusst neutral: keine Farben oder Texte, die niedrige Zufuhr belohnen oder ein Überschreiten dramatisieren.
import { h } from '../../core/util.js';
import { fmt, r0 } from '../../core/format.js';
import { getGoals } from '../../core/profile.js';
import { dayTotals, prefs, setPrefs } from './journal.js';

const SVG = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs) => {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
};

/**
 * Ringsegmente: Anteil am Ring = gegessen / Ziel (ohne Ziel voll, sobald etwas gegessen ist),
 * aufgeteilt nach kcal aus Eiweiß (4), Kohlenhydraten (4) plus Ballaststoffen (2), Fett (9) und Rest.
 * Ballaststoffe mit 2 kcal/g: Energiefaktor der EU-Kennzeichnung (LMIV); ohne ihn erschienen z. B. Haferflocken
 * mit einem grauen „Rest“ (Abweichung vom Tracker, dort ohne Ballaststoffe; Annahme, dass der BLS-Energiewert
 * Ballaststoffe so einrechnet – in „Unverified“ vermerkt). Rest = z. B. Alkohol.
 * Gibt [{ cls, len }] in Anteilen des Umfangs (0..1) zurück.
 */
export function ringParts(t, goal) {
  const parts = [['p', t.p * 4], ['c', t.c * 4 + (t.fi || 0) * 2], ['f', t.f * 9]];
  const mk = parts.reduce((x, y) => x + y[1], 0);
  if (t.k - mk > Math.max(20, t.k * 0.03)) parts.push(['o', t.k - mk]); // kleine Rundungsreste ignorieren
  const tot = parts.reduce((x, y) => x + y[1], 0) || 1;
  const full = goal ? Math.min(1, t.k / goal) : (t.k > 0 ? 1 : 0);
  return parts.map(([cls, kc]) => ({ cls, len: (kc / tot) * full })).filter((p) => p.len > 0.002);
}

function ring(t, goal, big, cap) {
  const R = 46, L = 2 * Math.PI * R;
  const root = svg('svg', { viewBox: '0 0 112 112', class: 'ring-svg', 'aria-hidden': 'true' });
  root.append(svg('circle', { class: 'ring-track', cx: 56, cy: 56, r: R }));
  const g = svg('g', { transform: 'rotate(-90 56 56)' });
  const parts = ringParts(t, goal);
  const gap = parts.length > 1 ? 1.5 : 0;
  let off = 0;
  for (const p of parts) {
    const len = p.len * L;
    g.append(svg('circle', { class: `ring-seg m-${p.cls}`, cx: 56, cy: 56, r: R, 'stroke-dasharray': `${Math.max(0.5, len - gap).toFixed(1)} ${L.toFixed(1)}`, 'stroke-dashoffset': (-off).toFixed(1) }));
    off += len;
  }
  root.append(g);
  return h('div', { class: 'ring', role: 'img', 'aria-label': goal ? `${fmt(t.k)} von ${fmt(goal)} kcal gegessen` : `${fmt(t.k)} kcal gegessen` },
    root, h('div', { class: 'ring-c' }, h('b', {}, big), h('small', {}, cap)));
}

function macroRow(cls, label, val, target) {
  const pct = target ? Math.min(100, (val / target) * 100) : 0;
  return h('div', { class: 'mrow' },
    h('div', { class: 'mrow-h' }, h('span', {}, h('i', { class: `dot m-${cls}` }), label),
      h('b', {}, `${r0(val)}`, h('small', {}, target ? ` / ${r0(target)} g` : ' g'))),
    h('div', { class: 'mbar' }, h('span', { class: `m-${cls}`, style: `width:${pct.toFixed(1)}%` })));
}

/** Karte für einen Tag. Frühere Tage zeigen immer „gegessen“. */
export function dayCard(iso, today) {
  const g = getGoals(iso) || {};
  const goal = g.goal || null;
  const t = dayTotals(iso);
  const past = iso < today;
  const left = !past && goal && prefs().heroMode !== 'eaten';
  const over = goal && t.k > goal;
  const big = left ? fmt(Math.abs(goal - t.k)) : fmt(t.k);
  const cap = left ? (over ? 'kcal über Ziel' : 'kcal übrig') : 'kcal gegessen';
  const foot = !goal ? 'Kein Tagesziel festgelegt' : `${fmt(t.k)} von ${fmt(goal)} kcal`;

  const toggle = !past && goal ? h('div', { class: 'seg seg-mini', role: 'radiogroup', 'aria-label': 'Anzeige' },
    ...[['left', 'Übrig'], ['eaten', 'Gegessen']].map(([k, label]) => h('button', {
      type: 'button', role: 'radio', 'aria-checked': (k === 'left') === !!left ? 'true' : 'false',
      onclick: () => setPrefs({ heroMode: k })
    }, label))) : null;

  return h('section', { class: 'card day-card' },
    toggle,
    h('div', { class: 'day-body' },
      h('div', { class: 'ring-wrap' }, ring(t, goal, big, cap), h('div', { class: 'ring-foot small muted' }, foot)),
      h('div', { class: 'macros' },
        macroRow('p', 'Eiweiß', t.p, g.protein),
        macroRow('c', 'Kohlenhydrate', t.c, g.carbs),
        macroRow('f', 'Fett', t.f, g.fat))),
    !goal ? h('a', { class: 'btn block', href: '#/ich/ziel' }, 'Tagesziel festlegen') : null);
}
