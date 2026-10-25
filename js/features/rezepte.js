// Reiter „Rezepte“ mit Unterleiste (Rezepte · Woche · Einkauf), Aufbau wie im Rezeptbuch.
// Phase 3 bringt Rezepte, Wochenplan und Einkauf. Die Planung liest das Tagesziel aus core/profile.js.
import { h } from '../core/util.js';
import { pageHead, comingSoon } from '../core/ui.js';
import { getGoals } from '../core/profile.js';

const SUB = [['/rezepte', 'Rezepte'], ['/rezepte/woche', 'Woche'], ['/rezepte/einkauf', 'Einkauf']];

function subnav(active) {
  return h('nav', { class: 'seg', 'aria-label': 'Rezepte-Bereiche' },
    ...SUB.map(([path, label]) => h('a', { href: `#${path}`, 'aria-current': path === active ? 'page' : false }, label)));
}

function goalHint() {
  const g = getGoals();
  const text = g && g.goal
    ? `Geplant wird mit deinem Tagesziel: ${Math.round(g.goal).toLocaleString('de-DE')} kcal.`
    : 'Ohne Tagesziel kann noch nicht geplant werden. Lege es unter „Ich“ fest.';
  return h('p', { class: 'sub' }, text);
}

const page = (path, title, what) => () => h('div', {}, pageHead(title), subnav(path), goalHint(), comingSoon(what, 3));

export const rezepteRoutes = {
  '/rezepte': page('/rezepte', 'Rezepte', 'Rezeptsammlung'),
  '/rezepte/woche': page('/rezepte/woche', 'Woche', 'Wochenplan'),
  '/rezepte/einkauf': page('/rezepte/einkauf', 'Einkauf', 'Einkauf & Vorrat')
};
