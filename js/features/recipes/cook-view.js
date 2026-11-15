// „Rezepte → Vorrat → Kochen mit dem Vorrat“ (0.5.1, Mockup 6A, Nutzerwahl 2026-11-15): Rezepte, für die alles da ist,
// und Rezepte, denen nur 1–2 Zutaten fehlen (mit „Auf die Liste“). Sortiert nach dem Rest des Tages (kcal, Makros).
// Nach „Kochen mit dem Vorrat“ im Rezeptbuch (app.js, Alles da / Fehlt nur wenig, Makro-Ranking; Copyright (c) 2026
// JuliaKelp, MIT). Grundzutaten (Gewürze, Öl, Brühe) zählen nicht; „vorhanden, Menge unbekannt“ zählt als da.
import { h } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { toast } from '../../core/ui.js';
import { fmt, isoDate } from '../../core/format.js';
import { mealByMin } from '../journal/journal.js';
import { rs, allRecipes, suitable, portionLines, kcalOfRecipe, recipeNutrients, macroScore, mealBudget, kcalLeft } from './recipes.js';
import { ensureReady, thumb, recipeHref } from './parts.js';
import { backLink } from '../../core/setui.js';
import { pantryInUse, recipeStock } from './pantry.js';
import { addExtra, extras } from './week.js';

export const FEW_MAX = 2;

/**
 * Teilt Rezepte nach Vorrat: { all: [{ r, missing }], few: [{ r, missing }] }, jeweils nach score (höher = besser).
 * stockOf(r) → { missing, have, all }; score(r) → Zahl. Rein (Tests).
 */
export function splitByPantry(recipes, stockOf, score) {
  const all = [], few = [];
  for (const r of recipes) {
    const st = stockOf(r);
    if (!st.have.length && !st.missing.length) continue; // keine zählbaren Zutaten
    if (st.all) all.push({ r, missing: [], s: score(r) });
    else if (st.missing.length <= FEW_MAX && st.have.length >= 1) few.push({ r, missing: st.missing, s: score(r) });
  }
  const by = (a, b) => b.s - a.s || a.r.name.localeCompare(b.r.name, 'de');
  return { all: all.sort(by), few: few.sort(by) };
}

let showAll = false;

function cookView(rerender) {
  if (!rs().started) { setTimeout(() => { location.hash = '#/rezepte/start'; }, 0); return h('div', {}); }
  const back = backLink('#/rezepte/vorrat', 'Vorrat');
  const head = h('header', { class: 'page-head' }, h('h1', {}, 'Kochen mit dem Vorrat'));
  if (!ensureReady(rerender)) return h('div', {}, back, head, h('section', { class: 'card' }, h('p', { class: 'small muted' }, 'Nährwerte werden geladen …')));
  const today = isoDate();
  const now = new Date();
  const meal = mealByMin(now.getHours() * 60 + now.getMinutes());
  const left = kcalLeft(today);
  const target = left != null && left > 0 ? Math.min(left, mealBudget(meal, today) * 1.3) : mealBudget(meal, today);
  const score = (r) => -Math.abs(kcalOfRecipe(r) - target) / 80 + macroScore(r, today);
  const { all, few } = pantryInUse() ? splitByPantry(allRecipes().filter(suitable), (r) => recipeStock(portionLines(r)), score) : { all: [], few: [] };
  const onList = new Set(extras().map((x) => x.text.toLowerCase()));

  const row = ({ r, missing }) => {
    const n = recipeNutrients(r);
    const listed = missing.length && missing.every((m) => onList.has(m.toLowerCase()));
    return h('div', { class: `ck-row${missing.length ? ' few' : ''}` },
      h('a', { class: 'ck-main', href: recipeHref(r) }, thumb(r, { size: 44, peek: 38 }),
        h('span', { class: 't' }, h('b', {}, r.name),
          h('small', {}, `${r.time} min · ${fmt(kcalOfRecipe(r))} kcal · ${fmt(n.protein)} g Eiweiß`)),
        missing.length ? null : h('span', { class: 'cfg-chev', 'aria-hidden': 'true' }, icon('chevron', { size: 15 }))),
      missing.length ? h('div', { class: 'ck-foot' },
        h('span', { class: 'ck-miss' }, `fehlt: ${missing.join(', ')}`),
        h('button', { class: 'btn small-btn', type: 'button', disabled: listed, 'aria-label': `${missing.join(', ')} auf die Einkaufsliste`,
          onclick: () => { const k = missing.filter((m) => addExtra(m)).length; toast(k ? `${missing.join(', ')} auf der Einkaufsliste` : 'Steht schon auf der Liste'); rerender(); } },
        listed ? 'Auf der Liste' : 'Auf die Liste')) : null);
  };
  const cut = (l) => (showAll ? l : l.slice(0, 8));
  const sub = left != null
    ? (left > 0 ? `Sortiert nach deinem Rest für heute: ${fmt(left)} kcal.` : 'Tagesziel erreicht – sortiert nach den Makros.')
    : 'Ohne Tagesziel sortiert nach einem Rahmen von 2.000 kcal.';
  return h('div', { class: 'ck' },
    back, head, h('p', { class: 'sub' }, `Rezepte aus dem, was da ist. ${sub}`),
    !pantryInUse() ? h('section', { class: 'card' }, h('p', { class: 'small muted' }, 'Noch nichts im Vorrat. Scanne Einkäufe oder lege Zutaten dazu.'), h('a', { class: 'btn block', href: '#/rezepte/vorrat' }, 'Zum Vorrat')) : null,
    pantryInUse() ? h('h3', { class: 'sec' }, `Alles da · ${all.length}`) : null,
    pantryInUse() ? (all.length ? h('section', { class: 'card list' }, ...cut(all).map(row)) : h('section', { class: 'card' }, h('p', { class: 'small muted' }, 'Für kein Rezept ist gerade alles da.'))) : null,
    pantryInUse() ? h('h3', { class: 'sec' }, `Fehlt wenig · ${few.length}`) : null,
    pantryInUse() ? (few.length ? h('section', { class: 'card list' }, ...cut(few).map(row)) : h('section', { class: 'card' }, h('p', { class: 'small muted' }, 'Kein Rezept, dem nur ein oder zwei Zutaten fehlen.'))) : null,
    all.length > 8 || few.length > 8 ? h('button', { class: 'btn block', type: 'button', onclick: () => { showAll = !showAll; rerender(); } }, showAll ? 'Weniger zeigen' : 'Alle zeigen') : null,
    h('p', { class: 'small muted page-note' }, 'Gewürze, Öl und Brühe zählen nicht. Mengen sind Schätzungen; „im Vorrat, Menge offen“ zählt als da.'));
}

export const cookRoutes = { '/rezepte/kochen': cookView };
