// Tagesabschluss auf „Heute“ (0.5.1, Mockup 4B, Nutzerwahl 2026-11-15): ab 20 Uhr am heutigen Tag eine kleine Karte,
// die nur zeigt, was noch offen ist (Wasser unter dem Ziel, fällige Supplements). Nichts offen → keine Karte.
// Idee aus der Tagesabschluss-Karte im Calorie-Tracker (v2.js, ST0PTV, MIT); dort mit Mahlzeiten und Makros (Variante A).
// Neutral: kein Abhak-Zwang, „Ausblenden“ gilt für den Tag.
import { h } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import * as store from '../../core/store.js';
import { waterSettings, waterRows, waterTotal } from '../drinks/water.js';
import { caffWaterRows } from '../drinks/caffeine.js';
import { quickWater } from '../drinks/water-card.js';
import { suppSettings, itemsFor, isTaken, setTaken } from '../supp/supplements.js';

store.define('closing', { hidden: null }); // Tag, an dem die Karte ausgeblendet wurde
export const CLOSING_FROM = 20; // Uhr

const litres = (ml) => (ml / 1000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Offene Punkte eines Tags: [{ kind: 'water'|'supp', … }]. */
export function openItems(iso) {
  const out = [];
  const W = waterSettings();
  if (W.enabled) {
    const goal = W.goal || 1500;
    const ml = waterTotal(waterRows(iso, caffWaterRows(iso)));
    if (ml < goal) out.push({ kind: 'water', ml, goal, step: W.step || 250 });
  }
  if (suppSettings().enabled) for (const x of itemsFor(iso)) if (!isTaken(iso, x.id)) out.push({ kind: 'supp', id: x.id, name: x.name });
  return out;
}

/** Karte oder null (nur heute, ab 20 Uhr, nicht ausgeblendet, mindestens ein offener Punkt). */
export function closingCard(iso, today, now = new Date()) {
  if (iso !== today || now.getHours() < CLOSING_FROM || store.get('closing').hidden === today) return null;
  const items = openItems(iso);
  if (!items.length) return null;
  const chip = (x) => (x.kind === 'water'
    ? h('button', { class: 'chip cl-chip k-water', type: 'button', 'aria-label': `${x.step} ml Wasser eintragen, bisher ${litres(x.ml)} von ${litres(x.goal)} Liter`,
      onclick: () => quickWater(iso, x.step) }, icon('drop', { size: 16 }), `Wasser ${litres(x.ml)} / ${litres(x.goal)} l`)
    : h('button', { class: 'chip cl-chip k-supp', type: 'button', 'aria-label': `${x.name} abhaken`,
      onclick: () => setTaken(iso, x.id, true) }, icon('pill', { size: 16 }), x.name));
  return h('section', { class: 'card cl-card' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Tagesabschluss'),
      h('button', { class: 'link', type: 'button', onclick: () => { store.update('closing', (c) => { c.hidden = today; }); document.dispatchEvent(new CustomEvent('tt-journal')); } }, 'Ausblenden')),
    h('p', { class: 'muted cl-sub' }, 'Noch offen für heute:'),
    h('div', { class: 'cl-chips' }, ...items.map(chip)));
}
