// Reiter „Rezepte → Einkauf“, Entwurf B „Liste mit Gerichten“ (Nutzerwahl 2026-10-29): oben die übernommenen Gerichte,
// Filter Alles / Offen / Erledigt, eine Liste mit Menge und Gericht je Zutat, Kreis zum Abhaken; Grundzutaten getrennt.
// Aufbau nach viewEinkauf im Rezeptbuch (JuliaKelp, MIT). Ab 0.2.5 mit Vorrat: was reicht, steht unter „Schon im
// Vorrat“; bei zu wenig steht nur der Rest auf der Liste; „Gekauftes in den Vorrat“ legt abgehakte Zutaten dazu.
// 0.5.1 (nach der Einkaufsliste im Rezeptbuch, app.js 872ff.): nach Vorratsgruppen sortiert, eigene Punkte, Abschnitt
// „Im Vorrat aufgebraucht“, „Als Text kopieren“.
import { h } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { toast } from '../../core/ui.js';
import { isoDate } from '../../core/format.js';
import { rs, MEAL_SHORT } from './recipes.js';
import { ensureReady, recipeHref, subnav } from './parts.js';
import { ensureWeek, wk, toggleBought, clearBought, extras, addExtra, removeExtra, clearBoughtExtras } from './week.js';
import { shoppingList } from './shopping.js';
import { addLoose, pantry, foodOf, groupOf, GROUPS } from './pantry.js';
import { findFood } from './ingredients.js';

const FILTERS = [['all', 'Alles'], ['open', 'Offen'], ['done', 'Erledigt']];
const ui = { filter: 'all' };
// Gruppe einer Zutat der Liste wie im Vorrat (Zutat bekannt → Gruppe der Zutat, sonst „Sonstiges“)
export const shopGroup = (food) => (food ? groupOf({ fn: food, n: food, ref: '' }) : 'sonst');

/** Text zum Kopieren: offene Punkte nach Gruppen. Rein (Tests). items = [{ text, group }], extra = [Text]. */
export function shopText(items, extra = []) {
  const out = ['Einkaufsliste'];
  for (const [g, l] of GROUPS) {
    const xs = items.filter((x) => x.group === g);
    if (xs.length) out.push('', l, ...xs.map((x) => `- ${x.text}`));
  }
  if (extra.length) out.push('', 'Außerdem', ...extra.map((t) => `- ${t}`));
  return out.join('\n');
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Einkaufsliste kopiert'); }
  catch { toast('Kopieren geht hier nicht. Bitte lange auf die Liste tippen.', { error: true }); }
}

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
    const nx = clearBoughtExtras();
    clearBought();
    toast(n ? `${n} Zutaten in den Vorrat gelegt${nx ? `, ${nx === 1 ? '1 eigener Punkt' : `${nx} eigene Punkte`} erledigt` : ''}` : nx ? `${nx === 1 ? '1 eigener Punkt' : `${nx} eigene Punkte`} erledigt` : 'Nichts mit bekannter Menge abgehakt');
    rerender();
  };

  const ex = extras();
  const exOpen = ex.filter((x) => !bought[x.key]);
  const onList = new Set([...ex.map((x) => x.text.toLowerCase()), ...toBuy.map((x) => (x.food || '').toLowerCase())]);
  const usedUp = [...new Set(pantry().filter((x) => x.qty === 0).map((x) => foodOf(x) || x.n))].filter((n) => !onList.has(n.toLowerCase()));
  const exDone = ex.filter((x) => bought[x.key]).length;
  const check = (key, on, text, sub, extra = null) => h('div', { class: `sh-line${on ? ' done' : ''}` },
    h('button', { class: `sh-row${on ? ' done' : ''}`, type: 'button', role: 'checkbox', 'aria-checked': on ? 'true' : 'false', onclick: () => { toggleBought(key); rerender(); } },
      h('i', {}, on ? icon('check', { size: 14 }) : null),
      h('span', { class: 't' }, h('b', {}, text), ...[].concat(sub).filter(Boolean))),
    extra);
  const addIn = h('input', { class: 'input', type: 'text', maxlength: 80, placeholder: 'z. B. Kaffee', 'aria-label': 'Eigenen Punkt hinzufügen', autocomplete: 'off' });
  const addOwn = () => { if (addExtra(addIn.value)) { addIn.value = ''; rerender(); } else if (addIn.value.trim()) toast('Steht schon auf der Liste'); };
  addIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') addOwn(); });
  const copy = () => copyText(shopText(toBuy.filter((x) => !bought[x.key]).map((x) => ({ text: x.text, group: shopGroup(x.food) })), exOpen.map((x) => x.text)));

  const list = toBuy.filter((x) => ui.filter === 'all' || (ui.filter === 'done') === !!bought[x.key]);
  const grouped = GROUPS.map(([g, l]) => [l, list.filter((x) => shopGroup(x.food) === g)]).filter(([, xs]) => xs.length);
  const exShown = ex.filter((x) => ui.filter === 'all' || (ui.filter === 'done') === !!bought[x.key]);
  return h('div', { class: 'sh' },
    head, subnav('/rezepte/einkauf'),
    dishes.length ? h('div', { class: 'wk-sum' },
      h('b', {}, `${toBuy.length + ex.length} Punkte · ${doneN + exDone} erledigt`),
      h('span', {}, `aus ${dishes.length} übernommenen ${dishes.length === 1 ? 'Gericht' : 'Gerichten'} · ${portions} ${portions === 1 ? 'Portion' : 'Portionen'}`)) : null,
    dishes.length ? h('div', { class: 'sh-dishes', role: 'list', 'aria-label': 'Übernommene Gerichte' },
      ...dishes.map((d) => h('a', { class: 'sh-dish', role: 'listitem', href: recipeHref(d.recipe, d.meal, d.factor), style: `--t:${d.recipe.tint || '#E3DCF2'}` },
        h('span', { class: 'sw', 'aria-hidden': 'true' }), h('b', {}, d.recipe.name), h('small', {}, `${shortDay(d.day, today)} · ${MEAL_SHORT[d.meal]}`))))
      : h('section', { class: 'card' },
        h('p', {}, 'Noch keine Gerichte übernommen.'),
        h('p', { class: 'small muted' }, 'Übernimm unter „Woche“ die Gerichte, die du kochen willst. Ihre Zutaten landen dann hier, zusammengezählt.'),
        h('a', { class: 'btn primary block', href: '#/rezepte/woche' }, 'Zur Woche')),
    toBuy.length || ex.length ? h('div', { class: 'sh-bar' },
      h('div', { class: 'chips sh-chips', role: 'group', 'aria-label': 'Filter' },
        ...FILTERS.map(([k, l]) => h('button', { class: `chip${ui.filter === k ? ' on' : ''}`, type: 'button', 'aria-pressed': ui.filter === k ? 'true' : 'false', onclick: () => { ui.filter = k; rerender(); } }, l))),
      h('button', { class: 'btn small-btn sh-copy', type: 'button', onclick: copy }, 'Als Text kopieren')) : null,
    ...grouped.flatMap(([l, xs]) => [h('h3', { class: 'sec' }, l), h('section', { class: 'card list sh-list' }, ...xs.map((x) => check(x.key, !!bought[x.key], x.text,
      [h('small', {}, x.recipes.join(', ')), x.stock ? h('small', { class: 'sh-stock' }, x.stockText) : null])))]),
    dishes.length && !list.length ? h('section', { class: 'card' }, h('p', { class: 'small muted' }, ui.filter === 'done' ? 'Noch nichts abgehakt.' : 'Alles erledigt.')) : null,
    h('h3', { class: 'sec' }, 'Außerdem'),
    h('section', { class: 'card list sh-list' }, ...exShown.map((x) => check(x.key, !!bought[x.key], x.text, null,
      h('button', { class: 'icon-btn sm sh-x', type: 'button', 'aria-label': `${x.text} entfernen`, onclick: () => { removeExtra(x.key); rerender(); } }, icon('close', { size: 14 })))),
    h('div', { class: 'sh-add' }, addIn, h('button', { class: 'btn small-btn', type: 'button', onclick: addOwn }, 'Dazu'))),
    doneN || exDone ? h('button', { class: 'btn primary block sh-topantry', type: 'button', onclick: toPantry }, 'Gekauftes in den Vorrat legen') : null,
    usedUp.length ? h('h3', { class: 'sec' }, 'Im Vorrat aufgebraucht') : null,
    usedUp.length ? h('section', { class: 'card sh-used' }, h('div', { class: 'chips' }, ...usedUp.map((n) => h('button', { class: 'chip', type: 'button', 'aria-label': `${n} auf die Liste`, onclick: () => { addExtra(n); rerender(); } }, `+ ${n}`)))) : null,
    inStock.length ? h('h3', { class: 'sec' }, 'Schon im Vorrat') : null,
    inStock.length ? h('section', { class: 'card' }, h('p', { class: 'small muted' }, inStock.map((x) => `${x.text} (${x.stockText})`).join(', '))) : null,
    staples.length ? h('h3', { class: 'sec' }, 'Hast du meistens da') : null,
    staples.length ? h('section', { class: 'card' }, h('p', { class: 'small muted' }, staples.join(', '))) : null,
    doneN || exDone ? h('button', { class: 'btn block sh-reset', type: 'button', onclick: () => { const prev = { ...bought }; clearBought(); toast('Haken entfernt', { action: { label: 'Rückgängig', onClick: () => { for (const k of Object.keys(prev)) toggleBought(k); rerender(); } } }); rerender(); } }, 'Alle Haken entfernen') : null,
    h('p', { class: 'small muted page-note' }, 'Mengen aus den Rezepten zusammengezählt, mit Portionen und Mengen aus dem Wochenplan, abzüglich Vorrat. Gleiche Zutaten mit verschiedenen Einheiten stehen getrennt.'));
}

export const shopRoutes = { '/rezepte/einkauf': shopView };
