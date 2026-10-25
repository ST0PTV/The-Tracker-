// ⓘ-Erklärungen als Sheet: kurzer Text, optional Punkte und Quellen mit Links. Nach INFO/openInfo im Kalorien-Tracker.
import { h } from './util.js';
import { openSheet } from './sheet.js';
import { icon } from './icons.js';

/**
 * openInfo({ title, body: [Text, …], points: [[Begriff, Text], …], src: [[Titel, URL|null], …], note })
 * Alle Texte werden als Text eingesetzt (kein HTML).
 */
export function openInfo({ title, body = [], points = [], src = [], note = '' }) {
  const content = h('div', { class: 'info' },
    note ? h('p', { class: 'info-note' }, note) : null,
    ...body.map((t) => h('p', {}, t)),
    points.length ? h('dl', { class: 'info-pts' }, ...points.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])) : null,
    src.length ? h('div', { class: 'info-src' }, h('h3', { class: 'sec' }, 'Quellen'),
      h('ul', {}, ...src.map(([t, u]) => h('li', {}, u ? h('a', { href: u, target: '_blank', rel: 'noopener' }, t) : t)))) : null);
  return openSheet(content, { title });
}

/** Kleiner ⓘ-Knopf. */
export function infoBtn(label, onClick) {
  return h('button', { class: 'info-btn', type: 'button', 'aria-label': `Info: ${label}`, onclick: (e) => { e.stopPropagation(); onClick(); } }, icon('info', { size: 18 }));
}
