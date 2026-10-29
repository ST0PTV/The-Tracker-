// Reiter „Rezepte → Einkauf“, Entwurf B „Liste mit Gerichten“ (Nutzerwahl 2026-10-29): oben die übernommenen Gerichte,
// Filter Alles / Offen / Erledigt, eine Liste mit Menge und Gericht je Zutat, Kreis zum Abhaken; Grundzutaten getrennt.
// Aufbau nach viewEinkauf im Rezeptbuch (JuliaKelp, MIT). Ab 0.2.5 mit Vorrat: was reicht, steht unter „Schon im
// Vorrat“; bei zu wenig steht nur der Rest auf der Liste; „Gekauftes in den Vorrat“ legt abgehakte Zutaten dazu.
import { h } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { toast } from '../../core/ui.js';
import { isoDate } from '../../core/format.js';
import { rs, MEAL_SHORT } from './recipes.js';
import { ensureReady, recipeHref, subnav } from './parts.js';
import { ensureWeek, wk, toggleBought, clearBought } from './week.js';
import { shoppingList } from './shopping.js';
import { addLoose } from './pantry.js';
import { findFood } from './ingredients.js';

const FILTERS = [['all', 'Alles'], ['open', 'Offen'], ['done', 'Erledigt']];
const ui = { filter: 'all' };
const shortDay = (iso, today) => (iso === today ? 'Heute' : new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', ''));

function shopView(rerender) {
  if (!rs().started) { setTimeout(() => { location.hash = '#/rezepte/start'; }, 0); return h('div', {}); }
  const head = h('header', { class: 'page-head' }, h('h1', {}, 'Einkauf'));
  if (!ensureReady(rerender)) return h('div', {}, head, subnav('/rezepte/einkauf'), h('section', { class: 'card' }, h('p', { class: 'small muted' }, 'Nährwerte werden geladen …')));
  const today = isoDate();
  ensureWeek(today);
  const { items, staples, dishes, portions } = shoppingList(today);
  const bought = wk().bought;
  const inStock = items.filter((x) => x.stock === 'full');
  const toBuy = items.filter((x) => x.stock !== 'full');
  const doneN = toBuy.filter((x) => bought[x.key]).length;
  // Abgehakte Zutaten mit bekannter Menge in den Vorrat legen (als lose Zutat, Gramm)
  const toPantry = () => {
    let n = 0;
    for (const x of toBuy.filter((y) => bought[y.key] && y.food && y.needG > 0)) {
      const f = findFood(x.food);
      if (!f) continue;
      try { addLoose(f.name, Math.round(x.needG), 'g'); n++; } catch { /* Zutat ohne Wert: überspringen */ }
    }
    clearBought();
    toast(n ? `${n} Zutaten in den Vorrat gelegt` : 'Nichts mit bekannter Menge abgehakt');
    rerender();
  };

  if (!dishes.length) {
    return h('div', { class: 'sh' }, head, subnav('/rezepte/einkauf'),
      h('section', { class: 'card' },
        h('p', {}, 'Noch keine Gerichte übernommen.'),
        h('p', { class: 'small muted' }, 'Übernimm unter „Woche“ die Gerichte, die du kochen willst. Ihre Zutaten landen dann hier, zusammengezählt.'),
        h('a', { class: 'btn primary block', href: '#/rezepte/woche' }, 'Zur Woche')));
  }

  const list = toBuy.filter((x) => ui.filter === 'all' || (ui.filter === 'done') === !!bought[x.key]);
  return h('div', { class: 'sh' },
    head, subnav('/rezepte/einkauf'),
    h('div', { class: 'wk-sum' },
      h('b', {}, `${toBuy.length} Zutaten · ${doneN} erledigt`),
      h('span', {}, `aus ${dishes.length} übernommenen ${dishes.length === 1 ? 'Gericht' : 'Gerichten'} · ${portions} ${portions === 1 ? 'Portion' : 'Portionen'}`)),
    h('div', { class: 'sh-dishes', role: 'list', 'aria-label': 'Übernommene Gerichte' },
      ...dishes.map((d) => h('a', { class: 'sh-dish', role: 'listitem', href: recipeHref(d.recipe, d.meal, d.factor), style: `--t:${d.recipe.tint || '#E3DCF2'}` },
        h('span', { class: 'sw', 'aria-hidden': 'true' }), h('b', {}, d.recipe.name), h('small', {}, `${shortDay(d.day, today)} · ${MEAL_SHORT[d.meal]}`)))),
    h('div', { class: 'chips sh-chips', role: 'group', 'aria-label': 'Filter' },
      ...FILTERS.map(([k, l]) => h('button', { class: `chip${ui.filter === k ? ' on' : ''}`, type: 'button', 'aria-pressed': ui.filter === k ? 'true' : 'false', onclick: () => { ui.filter = k; rerender(); } }, l))),
    list.length
      ? h('section', { class: 'card list sh-list' }, ...list.map((x) => {
        const on = !!bought[x.key];
        return h('button', { class: `sh-row${on ? ' done' : ''}`, type: 'button', role: 'checkbox', 'aria-checked': on ? 'true' : 'false', onclick: () => { toggleBought(x.key); rerender(); } },
          h('i', {}, on ? icon('check', { size: 14 }) : null),
          h('span', { class: 't' }, h('b', {}, x.text), h('small', {}, x.recipes.join(', ')),
            x.stock ? h('small', { class: 'sh-stock' }, x.stockText) : null));
      }))
      : h('section', { class: 'card' }, h('p', { class: 'small muted' }, ui.filter === 'done' ? 'Noch nichts abgehakt.' : 'Alles erledigt.')),
    doneN ? h('button', { class: 'btn primary block sh-topantry', type: 'button', onclick: toPantry }, 'Gekauftes in den Vorrat legen') : null,
    inStock.length ? h('h3', { class: 'sec' }, 'Schon im Vorrat') : null,
    inStock.length ? h('section', { class: 'card' }, h('p', { class: 'small muted' }, inStock.map((x) => `${x.text} (${x.stockText})`).join(', '))) : null,
    staples.length ? h('h3', { class: 'sec' }, 'Hast du meistens da') : null,
    staples.length ? h('section', { class: 'card' }, h('p', { class: 'small muted' }, staples.join(', '))) : null,
    doneN ? h('button', { class: 'btn block sh-reset', type: 'button', onclick: () => { const prev = { ...bought }; clearBought(); toast('Haken entfernt', { action: { label: 'Rückgängig', onClick: () => { for (const k of Object.keys(prev)) toggleBought(k); rerender(); } } }); rerender(); } }, 'Alle Haken entfernen') : null,
    h('p', { class: 'small muted page-note' }, 'Mengen aus den Rezepten zusammengezählt, mit Portionen und Mengen aus dem Wochenplan, abzüglich Vorrat. Gleiche Zutaten mit verschiedenen Einheiten stehen getrennt.'));
}

export const shopRoutes = { '/rezepte/einkauf': shopView };
