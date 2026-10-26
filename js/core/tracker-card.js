// Tracker-Karte für „Heute“ (Wasser, Koffein, Alkohol, Gewicht). Aufbau nach trackerFoot / tk-empty im Calorie-Tracker
// (ST0PTV, MIT), vom Nutzer gewählt (Entwürfe V1 + V5, 2026-10-26):
// - ohne Eintrag: Bezeichnung, große Zahl, rundes „+“ mittig auf einer Linie;
// - mit Eintrag: kompakte Kopfzeile (Zahl links, Hinweis und kleines „+“ rechts), darunter Kurve oder Balken;
//   ein Tipp auf die Karte öffnet die Details (Einträge, Tageswerte, Verlauf) als Sheet.
// Farbe je Tracker über die Klasse k-<kind> (Tokens --c-water, --c-caf, --c-alc, --c-wt in css/app.css).
import { h } from './util.js';
import { icon } from './icons.js';
import { openSheet } from './sheet.js';

/**
 * trackerCard({ kind, cls, label, value, unit, filled, pill, pillLate, body, onAdd, addLabel, onOpen })
 * body: Node (Kurve, Balken) nur bei filled. Gibt ein <section> zurück.
 */
export function trackerCard({ kind, cls = '', label, value, unit, filled, pill = null, pillLate = false, body = null, onAdd, addLabel, onOpen }) {
  const plus = h('button', { class: 'trk-plus', type: 'button', 'aria-label': addLabel || `${label} eintragen`,
    onclick: (e) => { e.stopPropagation(); onAdd(); } }, icon('plus', { size: filled ? 20 : 24 }));
  const big = h('div', { class: 'trk-big' }, String(value), unit ? h('small', {}, unit) : null);
  if (!filled) {
    return h('section', { class: `card trk k-${kind} ${cls}`.trim() },
      h('div', { class: 'trk-lbl' }, label), big, h('div', { class: 'trk-div' }, plus));
  }
  const open = () => onOpen && onOpen();
  return h('section', {
    class: `card trk on k-${kind} ${cls}`.trim(), role: 'button', tabindex: '0', 'aria-label': `${label}: ${value} ${unit || ''} – Details öffnen`.trim(),
    onclick: open, onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }
  },
  h('div', { class: 'trk-top' },
    h('div', {}, h('div', { class: 'trk-lbl' }, label), big),
    h('div', { class: 'trk-right' }, pill ? h('span', { class: `trk-pill${pillLate ? ' late' : ''}` }, pill) : null, plus)),
  body ? h('div', { class: 'trk-body' }, body) : null);
}

/**
 * Detail-Sheet einer Tracker-Karte. render() gibt den Inhalt zurück und wird bei jeder Änderung
 * (Ereignisse tt-journal / tt-profile) neu aufgerufen, solange das Sheet offen ist.
 */
export function openTrackerDetails({ kind, title, render }) {
  const box = h('div', { class: `trk-sheet k-${kind}` });
  const draw = () => box.replaceChildren(...[].concat(render()).filter(Boolean));
  draw();
  const evs = ['tt-journal', 'tt-profile'];
  evs.forEach((e) => document.addEventListener(e, draw));
  return openSheet(box, { title, onClose: () => evs.forEach((e) => document.removeEventListener(e, draw)) });
}
