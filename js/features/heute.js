// Reiter „Heute“: Tagesübersicht. Phase 2 bringt das Journal (Mahlzeiten, Wasser, Koffein, Supplements).
import { h } from '../core/util.js';
import { pageHead, comingSoon } from '../core/ui.js';
import { getGoals, PRESETS } from '../core/profile.js';

const fmt = (n) => Math.round(n).toLocaleString('de-DE');

/** Karte mit dem heute geltenden Tagesziel aus dem gemeinsamen Profil. */
export function goalCard() {
  const g = getGoals();
  if (!g || !g.goal) {
    return h('section', { class: 'card' },
      h('h2', {}, 'Tagesziel'),
      h('p', { class: 'muted' }, 'Noch kein Ziel festgelegt.'),
      h('a', { class: 'btn primary block', href: '#/ich/ziel' }, 'Ziel festlegen'));
  }
  const macro = (label, v) => h('div', { class: 'stat' }, h('b', {}, v == null ? '–' : `${fmt(v)} g`), h('span', {}, label));
  return h('section', { class: 'card' },
    h('div', { class: 'card-head' },
      h('h2', {}, 'Tagesziel'),
      h('a', { class: 'link', href: '#/ich/ziel' }, 'Ändern')),
    h('p', { class: 'big-num' }, `${fmt(g.goal)}`, h('small', {}, ' kcal')),
    h('p', { class: 'muted small' }, PRESETS[g.preset]?.label || ''),
    h('div', { class: 'stats' }, macro('Eiweiß', g.protein), macro('Kohlenhydrate', g.carbs), macro('Fett', g.fat)));
}

export function heuteView() {
  const date = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  return h('div', {},
    pageHead('Heute', date),
    goalCard(),
    comingSoon('Journal', 2),
    comingSoon('Wasser, Koffein & Supplements', 2));
}
