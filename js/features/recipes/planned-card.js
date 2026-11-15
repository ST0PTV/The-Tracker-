// Karte „Geplant für heute“ auf „Heute“ (0.5.1, Mockup 2A, Nutzerwahl 2026-11-15): übernommene Gerichte des
// Wochenplans für heute; „Eintragen“ trägt die Portion aus dem Plan ein (wie „Gekocht“ auf der Rezeptseite, mit Vorrat).
// Nach der Karte „Geplant für heute“ im Rezeptbuch (app.js; Copyright (c) 2026 JuliaKelp, MIT). Geändert: ohne
// Wochentag-Streifen (Variante C nicht gewählt); eingetragen = Journal hat das Rezept in dieser Mahlzeit.
import { h } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { toast } from '../../core/ui.js';
import { fmt } from '../../core/format.js';
import { getSettings } from '../../core/settings.js';
import { entriesOf } from '../journal/journal.js';
import { rs, kcalOfRecipe, cookRecipe, undoCook, redoCook, MEAL_SHORT } from './recipes.js';
import { wk, planMeals, slotKey, plannedFor } from './week.js';
import { ensureReady, recipeHref } from './parts.js';

export const plannedCardOn = () => getSettings().plannedCard !== false;

/** Übernommene Gerichte eines Tags: [{ meal, recipe, factor, done }]. */
export function plannedToday(iso) {
  if (!rs().started) return [];
  const slots = wk().slots || {};
  if (!planMeals().some((m) => slots[slotKey(iso, m)]?.ok)) return [];
  const entries = entriesOf(iso);
  return planMeals().map((meal) => {
    const p = plannedFor(iso, meal);
    if (!p) return null;
    const done = entries.some((e) => e.meal === meal && e.ref === 'rcp:' + p.recipe.id);
    return { meal, recipe: p.recipe, factor: p.factor, done };
  }).filter(Boolean);
}

export function plannedCard(iso, today, rerender) {
  if (iso !== today || !plannedCardOn()) return null;
  const list = plannedToday(iso);
  if (!list.length) return null;
  ensureReady(rerender); // kcal brauchen die BLS-Werte; bis dahin ohne Zahl
  const log = (x) => {
    try {
      const e = cookRecipe(x.recipe, x.meal, x.factor, iso);
      toast(`${x.recipe.name} eingetragen`, { action: { label: 'Rückgängig', onClick: () => { undoCook(iso, e); toast('Zurückgenommen', { action: { label: 'Wiederholen', onClick: () => redoCook(iso, e) } }); } } });
    } catch (err) { toast(err.message, { error: true }); }
  };
  return h('section', { class: 'card list pl-card' },
    h('div', { class: 'pl-head' }, h('h2', {}, 'Geplant für heute'), h('a', { class: 'link', href: '#/rezepte/woche' }, 'Wochenplan ›')),
    ...list.map((x) => {
      const kc = kcalOfRecipe(x.recipe) * x.factor;
      const meta = [MEAL_SHORT[x.meal], kc ? `${fmt(kc)} kcal` : null, x.done ? 'eingetragen' : `${x.recipe.time} min`].filter(Boolean).join(' · ');
      return h('div', { class: `pl-row${x.done ? ' done' : ''}` },
        h('span', { class: x.done ? 'pl-ok' : 'pl-open', 'aria-hidden': 'true' }, x.done ? icon('check', { size: 16 }) : null),
        h('a', { class: 't', href: recipeHref(x.recipe, x.meal, x.factor) }, h('b', {}, x.recipe.name), h('small', {}, meta)),
        x.done ? null : h('button', { class: 'btn small-btn', type: 'button', 'aria-label': `${x.recipe.name} eintragen`, onclick: () => log(x) }, 'Eintragen'));
    }));
}
