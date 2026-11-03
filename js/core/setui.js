// Bausteine der Einstellungsseiten (0.4.2): ein Muster für alle Unterseiten unter „Ich“.
// Abschnittstitel über einer Liste, Zeilen mit Name links und Bedienelement rechts, graue Fußnote darunter.
// Einstellungen speichern sofort; einen „Speichern“-Knopf haben nur Formulare, die einen Eintrag anlegen.
import { h } from './util.js';
import { icon } from './icons.js';
import { toast } from './ui.js';
import { infoBtn } from './info.js';
import { num } from './format.js';

/** Zurück-Link oben links (Standard: „Ich“). */
export function backLink(href = '#/ich', label = 'Ich') {
  return h('a', { class: 'back', href }, icon('chevron', { size: 16, cls: 'flip' }), label);
}

/** Abschnittstitel; mit info = [Titel, onClick] steht rechts ein ⓘ. */
export function sec(title, info = null) {
  return h('h3', { class: 'st-sec' }, h('span', {}, title), info ? infoBtn(info[0], info[1]) : null);
}

/** Liste mit Zeilen (leere Einträge fallen weg). */
export function list(...rows) {
  return h('div', { class: 'st-list' }, ...rows.flat().filter(Boolean));
}

/** Graue Fußnote unter einer Liste. */
export function note(...children) {
  return h('p', { class: 'st-note' }, ...children);
}

// Linke Seite einer Zeile: optional Plakette, Name, Untertitel
function label(title, sub, badge) {
  return [badge ? h('span', { class: `qa-badge k-${badge[0]}` }, icon(badge[1], { size: 17 })) : null,
    h('span', { class: 't' }, h('b', {}, title), sub ? h('small', {}, sub) : null)];
}

/** Freie Zeile: Name links, beliebiges Element rechts. */
export function row({ title, sub = '', badge = null, right = null, cls = '' }) {
  return h('div', { class: `st-row ${cls}`.trim() }, ...label(title, sub, badge), right);
}

/** Schalter (iOS-Stil). Die ganze Zeile ist antippbar. */
export function switchRow({ title, sub = '', badge = null, on, set, disabled = false }) {
  const inp = h('input', { type: 'checkbox', role: 'switch', class: 'sw', 'aria-label': title, disabled: disabled || undefined });
  inp.checked = !!on;
  inp.addEventListener('change', () => set(inp.checked));
  return h('label', { class: 'st-row' }, ...label(title, sub, badge), inp);
}

/** Zahl mit Einheit, rechtsbündig eintippbar. Speichert bei Änderung, wenn der Wert im Bereich liegt; sonst Hinweis und alter Wert. */
export function numRow({ title, sub = '', value, lo, hi, unit, dec = false, set, placeholder = '' }) {
  const dp = dec === true ? 1 : dec || 0;
  const show = (v) => (v == null || v === '' ? '' : dp ? v.toLocaleString('de-DE', { maximumFractionDigits: dp, useGrouping: false }) : String(Math.round(v)));
  const inp = h('input', { class: 'st-in', type: 'text', inputmode: dp ? 'decimal' : 'numeric', value: show(value), placeholder, 'aria-label': `${title} (${unit})` });
  inp.addEventListener('change', () => {
    const v = num(inp.value);
    if (v == null || v < lo || v > hi) { toast(`Bitte einen Wert zwischen ${show(lo)} und ${show(hi)} ${unit} eingeben.`, { error: true }); inp.value = show(value); return; }
    value = Math.round(v * 10 ** dp) / 10 ** dp;
    inp.value = show(value);
    set(value);
  });
  return h('label', { class: 'st-row' }, ...label(title, sub, null), h('span', { class: 'st-val' }, inp, h('span', { class: 'st-unit' }, unit)));
}

/** Uhrzeit rechtsbündig (input type=time). */
export function timeRow({ title, sub = '', value, set }) {
  const inp = h('input', { class: 'st-in st-time', type: 'time', value, 'aria-label': title });
  inp.addEventListener('change', () => { if (inp.value) set(inp.value); });
  return h('label', { class: 'st-row' }, ...label(title, sub, null), h('span', { class: 'st-val' }, inp));
}

/** Zeile, die zu einer anderen Seite führt: Wert grau und ›. */
export function linkRow({ title, sub = '', badge = null, value = '', href }) {
  return h('a', { class: 'st-row st-link', href }, ...label(title, sub, badge),
    h('span', { class: 'st-val' }, value, h('span', { class: 'st-chev' }, icon('chevron', { size: 15 }))));
}

/** Auswahl aus wenigen Möglichkeiten: Name oben, Segmente darunter. options = [[key, label], …]. */
export function segRow({ title, sub = '', options, value, set }) {
  return h('div', { class: 'st-row st-segrow' },
    h('span', { class: 't' }, h('b', {}, title), sub ? h('small', {}, sub) : null),
    h('div', { class: 'seg', role: 'radiogroup', 'aria-label': title },
      ...options.map(([key, text]) => h('button', {
        type: 'button', role: 'radio', 'aria-checked': key === value ? 'true' : 'false',
        onclick: () => { if (key !== value) set(key); }
      }, text))));
}

/** Knopf als ganze Zeile in Akzentfarbe (z. B. „Supplement hinzufügen“). */
export function actionRow({ title, onClick, danger = false }) {
  return h('button', { type: 'button', class: `st-row st-action${danger ? ' danger' : ''}`, onclick: onClick }, h('span', { class: 't' }, h('b', {}, title)));
}
