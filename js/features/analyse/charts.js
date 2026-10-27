// Kleine Diagramme der Analyse: Kalorien-Balken mit Zielband und Mini-Kurven. Nach sparkSvg/kcalBarsSvg im
// Calorie-Tracker (js/v2.js, ST0PTV, MIT). Nur Zahlen im SVG, keine Texte aus Einträgen.
import { h } from '../../core/util.js';
import { KEEP_TOL, goalState } from './insights.js';

const SVG = 'http://www.w3.org/2000/svg';
const el = (tag, attrs) => { const e = document.createElementNS(SVG, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v)); return e; };
const f1 = (v) => (Math.round(v * 10) / 10).toString();

/** Mini-Kurve; vals mit null = Lücke. Ohne zwei Werte ein leerer Platzhalter. */
export function spark(vals, { h: H = 36, w: W = 140 } = {}) {
  const box = h('div', { class: 'an-viz' });
  const v = vals.filter((x) => x != null && Number.isFinite(x));
  if (v.length < 2) return box;
  const lo = Math.min(...v), hi = Math.max(...v), rg = hi - lo || 1;
  const pts = [];
  vals.forEach((x, i) => { if (x != null && Number.isFinite(x)) pts.push([(i / Math.max(1, vals.length - 1)) * W, H - 3 - ((x - lo) / rg) * (H - 6)]); });
  const d = 'M' + pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join(' L');
  const svg = el('svg', { class: 'spk', viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', 'aria-hidden': 'true' });
  svg.append(el('path', { class: 'a', d: `${d} L${f1(pts[pts.length - 1][0])} ${H} L${f1(pts[0][0])} ${H} Z` }), el('path', { class: 'l', d }));
  box.append(svg);
  return box;
}

/** Kalorien je Tag als Balken; Band = Ziel ±10 %; Tage ohne Einträge ohne Balken. labels: Wochentage darunter (nur bei 7 Tagen). */
export function kcalBars(days, { h: H = 52, labels = false } = {}) {
  const W = 300, n = days.length;
  const box = h('div', { class: 'an-viz' });
  if (!n) return box;
  const mx = Math.max(...days.map((x) => Math.max(x.k, (x.goal || 0) * (1 + KEEP_TOL))), 1) * 1.05;
  const bw = W / n, y = (v) => H - (v / mx) * H;
  const svg = el('svg', { class: 'kb', viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', role: 'img', 'aria-label': `Kalorien je Tag, ${n} Tage` });
  days.forEach((x, i) => {
    if (x.goal) svg.append(el('rect', { class: 'band', x: f1(i * bw), y: f1(y(x.goal * (1 + KEEP_TOL))), width: f1(bw), height: f1(y(x.goal * (1 - KEEP_TOL)) - y(x.goal * (1 + KEEP_TOL))) }));
    if (x.n) svg.append(el('rect', { class: `b ${goalState(x.k, x.goal) || ''}`, x: f1(i * bw + bw * 0.18), y: f1(y(x.k)), width: f1(bw * 0.64), height: f1(H - y(x.k)), rx: f1(Math.min(3, bw * 0.2)) }));
  });
  box.append(svg);
  if (labels && n <= 7) {
    const wd = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    box.append(h('div', { class: 'kb-lab', style: `grid-template-columns: repeat(${n}, 1fr)` }, ...days.map((x) => h('span', {}, wd[(new Date(x.d + 'T12:00:00').getDay() + 6) % 7]))));
  }
  return box;
}
