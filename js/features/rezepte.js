// Reiter „Rezepte“ mit Unterleiste (Rezepte · Woche · Einkauf). Entwurf A „Liste“ (Nutzerwahl 2026-10-27):
// oben Vorschläge für die nächste Mahlzeit, darunter Suche, Filter und Katalog. Aufbau nach viewRezepte im
// Rezeptbuch (JuliaKelp, MIT). Woche (Entwurf A „Tagesliste“) und Einkauf (Entwurf B „Liste mit Gerichten“) seit 0.2.3.
// Steht für die Mahlzeit ein übernommenes Gericht im Wochenplan, kommt es bei den Vorschlägen zuerst.
import { h } from '../core/util.js';
import { icon } from '../core/icons.js';
import { pageHead } from '../core/ui.js';
import { fmt, isoDate } from '../core/format.js';
import { mealByMin } from './journal/journal.js';
import { portionLines, rs, ideasFor, catalogue, haveMatches, kcalLeft, mealBudget, hasGoal, MEAL_SHORT } from './recipes/recipes.js';
import { FOODS } from './recipes/ingredients.js';
import { ensureReady, recipeRow, qp, subnav, fmtFactor } from './recipes/parts.js';
import { plannedFor } from './recipes/week.js';
import { weekRoutes } from './recipes/week-view.js';
import { shopRoutes } from './recipes/shop-view.js';
import { pantryRoutes } from './recipes/pantry-view.js';
import { pantryInUse, recipeStock } from './recipes/pantry.js';
import { recipeRoutes } from './recipes/recipe-view.js';
import { ownRoutes } from './recipes/own-view.js';
import { startRoutes } from './recipes/start-view.js';

const MEAL_NAME = { breakfast: 'dein Frühstück', lunch: 'dein Mittagessen', dinner: 'dein Abendessen', snack: 'einen Snack' };
const FILTERS = [['all', 'Alle'], ['breakfast', 'Frühstück'], ['lunch', 'Mittag'], ['dinner', 'Abend'], ['snack', 'Snack'], ['fav', 'Favoriten'], ['have', 'Ich habe …']];
const ui = { filter: 'all', query: '', have: [], sugMeal: null, pantryFirst: true };
// Vorrats-Hinweis unter einem Vorschlag (ab 0.2.5, nur wenn der Vorrat benutzt wird)
function stockNote(r, factor = 1) {
  const st = recipeStock(portionLines(r), factor);
  if (!st.have.length && !st.missing.length) return null;
  return st.all ? 'Alles im Vorrat' : `Fehlt: ${st.missing.slice(0, 3).join(', ')}${st.missing.length > 3 ? ' …' : ''}`;
}

const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

function suggestions(rerender) {
  const today = isoDate();
  const meal = ui.sugMeal || mealByMin(nowMin());
  const left = kcalLeft(today);
  const plan = plannedFor(today, meal);
  const stocked = pantryInUse();
  let pool = ideasFor(meal, today);
  if (stocked && ui.pantryFirst) pool = pool.slice(0, 12).sort((a, b) => (recipeStock(portionLines(b.recipe)).all ? 1 : 0) - (recipeStock(portionLines(a.recipe)).all ? 1 : 0)).concat(pool.slice(12));
  const ideas = (plan ? [{ recipe: plan.recipe, mode: null, factor: plan.factor, planned: true }, ...pool.filter((x) => x.recipe.id !== plan.recipe.id)] : pool).slice(0, 3);
  const mealSeg = h('div', { class: 'seg rz-meal', role: 'radiogroup', 'aria-label': 'Mahlzeit für Vorschläge' },
    ...['breakfast', 'lunch', 'dinner', 'snack'].map((m) => h('button', { type: 'button', role: 'radio', 'aria-checked': m === meal ? 'true' : 'false', onclick: () => { ui.sugMeal = m; rerender(); } }, MEAL_SHORT[m])));
  return [
    h('div', { class: 'rz-sug-h' }, h('b', {}, `Für ${MEAL_NAME[meal]}`),
      h('span', {}, left != null ? (left > 0 ? `noch ${fmt(left)} kcal frei` : 'Tagesziel erreicht') : `Rahmen ca. ${fmt(mealBudget(meal, today))} kcal`)),
    mealSeg,
    stocked ? h('div', { class: 'chips rz-pf', role: 'group', 'aria-label': 'Reihenfolge' },
      h('button', { class: `chip${ui.pantryFirst ? ' on' : ''}`, type: 'button', 'aria-pressed': ui.pantryFirst ? 'true' : 'false', onclick: () => { ui.pantryFirst = true; rerender(); } }, 'Mit Vorrat zuerst'),
      h('button', { class: `chip${!ui.pantryFirst ? ' on' : ''}`, type: 'button', 'aria-pressed': !ui.pantryFirst ? 'true' : 'false', onclick: () => { ui.pantryFirst = false; rerender(); } }, 'Beste Passung')) : null,
    ideas.length
      ? h('section', { class: 'card list rz-list' }, ...ideas.map((x) => recipeRow(x.recipe, { meal, mode: x.mode, factor: x.factor || 1,
        extra: [x.planned ? `aus dem Wochenplan${x.factor !== 1 ? ` · ${fmtFactor(x.factor)}× Menge` : ''}` : null, stocked ? stockNote(x.recipe, x.factor || 1) : null].filter(Boolean).join(' · ') || null })))
      : h('section', { class: 'card' }, h('p', { class: 'small muted' }, 'Gerade passt kein Rezept zu deinen Einstellungen und der Zeit für diese Mahlzeit.')),
    hasGoal(today) ? null : h('p', { class: 'small muted page-note' }, 'Ohne Tagesziel rechnet die Auswahl mit 2.000 kcal. ', h('a', { class: 'link', href: '#/ich/ziel' }, 'Tagesziel festlegen'))
  ];
}

function haveBox(rerender) {
  const inp = h('input', { class: 'input', type: 'search', list: 'rz-foods', placeholder: 'z. B. Zucchini', 'aria-label': 'Lebensmittel, das weg muss', autocomplete: 'off' });
  const add = () => { const v = inp.value.trim(); if (v && !ui.have.includes(v)) { ui.have.push(v); rerender(); } };
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
  const res = ui.have.length ? haveMatches(ui.have) : [];
  return [
    h('p', { class: 'small muted page-note' }, 'Was muss weg oder worauf hast du Lust? Rezepte mit möglichst vielen davon kommen zuerst.'),
    h('div', { class: 'rz-have' }, inp, h('button', { class: 'btn', type: 'button', onclick: add }, 'Dazu')),
    h('datalist', { id: 'rz-foods' }, ...FOODS.filter((x) => x.name !== 'Gewürze').map((x) => h('option', { value: x.name }))),
    ui.have.length ? h('div', { class: 'chips' }, ...ui.have.map((t) => h('button', { class: 'chip on', type: 'button', 'aria-label': `${t} entfernen`, onclick: () => { ui.have = ui.have.filter((x) => x !== t); rerender(); } }, `${t} ✕`))) : null,
    ui.have.length
      ? (res.length ? h('section', { class: 'card list rz-list' }, ...res.slice(0, 30).map((x) => recipeRow(x.recipe, { extra: `${ui.have.length > 1 ? `${x.hit.length} von ${ui.have.length}: ` : 'mit '}${x.hit.join(', ')}` })))
        : h('section', { class: 'card' }, h('p', { class: 'small muted' }, 'Dazu gibt es kein passendes Rezept. Versuch ein anderes Lebensmittel.')))
      : null
  ];
}

function rezepteView(rerender) {
  const m = qp('m');
  if (m && ['breakfast', 'lunch', 'dinner', 'snack'].includes(m)) ui.sugMeal = m;
  if (!rs().started) { setTimeout(() => { location.hash = '#/rezepte/start'; }, 0); return h('div', {}); }
  if (!ensureReady(rerender)) return h('div', {}, pageHead('Rezepte'), subnav('/rezepte'), h('section', { class: 'card' }, h('p', { class: 'small muted' }, 'Nährwerte werden geladen …')));

  const search = h('input', { class: 'input rz-search', type: 'search', placeholder: 'Rezept oder Zutat suchen', value: ui.query, 'aria-label': 'Rezept oder Zutat suchen', autocomplete: 'off' });
  const listBox = h('div', {});
  const drawList = () => {
    const list = catalogue({ filter: ui.filter, query: ui.query });
    listBox.replaceChildren(
      h('p', { class: 'small muted rz-count' }, ui.filter === 'fav' && !list.length ? 'Noch keine Favoriten. Tipp in einem Rezept auf „Favorit“.' : `${list.length} ${list.length === 1 ? 'Rezept' : 'Rezepte'}${ui.query.trim() ? ` mit „${ui.query.trim()}“` : ''}`),
      list.length ? h('section', { class: 'card list rz-list' }, ...list.map((r) => recipeRow(r))) : null);
  };
  search.addEventListener('input', () => { ui.query = search.value; drawList(); });
  const chips = h('div', { class: 'chips rz-chips', role: 'group', 'aria-label': 'Filter' },
    ...FILTERS.map(([k, l]) => h('button', { class: `chip${ui.filter === k ? ' on' : ''}`, type: 'button', 'aria-pressed': ui.filter === k ? 'true' : 'false', onclick: () => { ui.filter = k; rerender(); } }, l)));
  if (ui.filter !== 'have') drawList();

  return h('div', { class: 'rz' },
    h('header', { class: 'page-head rz-head' }, h('h1', {}, 'Rezepte'),
      h('a', { class: 'icon-btn', href: '#/rezepte/neu', 'aria-label': 'Eigenes Rezept anlegen' }, icon('plus', { size: 20 }))),
    subnav('/rezepte'),
    ...suggestions(rerender),
    h('h3', { class: 'sec' }, 'Alle Rezepte'),
    ui.filter === 'have' ? null : search,
    chips,
    ...(ui.filter === 'have' ? haveBox(rerender) : [listBox]),
    h('p', { class: 'small muted page-note' }, `Gefiltert nach deiner Ernährungsform, Allergenen und Geschmack. `, h('a', { class: 'link', href: '#/ich/ernaehrung' }, 'Ändern')));
}

export const rezepteRoutes = {
  '/rezepte': rezepteView,
  ...weekRoutes, ...shopRoutes, ...pantryRoutes, ...recipeRoutes, ...ownRoutes, ...startRoutes
};
