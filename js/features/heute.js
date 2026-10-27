// Reiter „Heute“: Tag wählen, Kalorien-Karte, Mahlzeiten mit Einträgen.
// Aufbau nach renderDiary im Kalorien-Tracker bzw. der Startseite im Rezeptbuch (ST0PTV/JuliaKelp, MIT).
// Reihenfolge: Kalorien, Supplements (abhaken), Mahlzeiten (nur mit Einträgen), Wasser, Koffein, Alkohol (nur mit Eintrag),
// Gewicht. Eintragen über das „+“ in der Tab-Leiste (quick-add.js) oder das „+“ der Karten.
import { h } from '../core/util.js';
import { comingSoon, toast } from '../core/ui.js';
import { icon } from '../core/icons.js';
import { fmt, r1, isoDate, addDays, dayLabel } from '../core/format.js';
import { unitOf } from './food/foods.js';
import { MEALS, entriesOf, entryTotals, sumEntries, copyEntries, isQuick } from './journal/journal.js';
import { dayCard } from './journal/day-card.js';
import { openAdd } from './journal/add-sheet.js';
import { openAmount } from './journal/amount-sheet.js';
import { waterCard } from './drinks/water-card.js';
import { caffCard, openCaffeine } from './drinks/caffeine-card.js';
import { caffEntries } from './drinks/caffeine.js';
import { suppCard } from './supp/supp-card.js';
import { weightCard } from './goal/weight-card.js';
import { alcCard, openAlcohol } from './drinks/alcohol-card.js';
import { alcEntries } from './drinks/alcohol.js';
import { openQuick } from './quick-add.js';

let day = null;       // gewählter Tag (nur für diese Sitzung)
let dayAnchor = null; // Datum, an dem „day“ gesetzt wurde: neuer Kalendertag → zurück auf heute
const openMeals = new Set();
if (typeof document !== 'undefined') document.addEventListener('tt-open-meal', (e) => openMeals.add(e.detail));

/** Gewählter Tag auf „Heute“ (für das „+“ in der Tab-Leiste). */
export const heuteDay = () => currentDay();

/** Springt auf „Heute“ zu einem Tag (z. B. aus Monat oder Jahr der Analyse); Zukunft → heute. */
export function showDay(iso) {
  const today = isoDate();
  day = iso > today ? today : iso; dayAnchor = today; openMeals.clear();
}

function currentDay() {
  const today = isoDate();
  if (!day || dayAnchor !== today) { day = today; dayAnchor = today; }
  return day;
}

function dayNav(iso, today, rerender) {
  const go = (n) => { day = addDays(iso, n); openMeals.clear(); rerender(); };
  const weekday = new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  return h('header', { class: 'page-head day-head' },
    h('div', {}, h('h1', {}, dayLabel(iso, today)), h('p', { class: 'sub' }, weekday)),
    h('div', { class: 'day-nav' },
      // Analyse nur am heutigen Tag; an anderen Tagen steht hier „Heute“ (sonst bricht der Titel auf schmalen Geräten um)
      iso === today ? h('a', { class: 'icon-btn', href: '#/analyse', 'aria-label': 'Analyse' }, icon('trend', { size: 20 })) : null,
      iso !== today ? h('button', { class: 'btn small-btn', type: 'button', onclick: () => { day = today; openMeals.clear(); rerender(); } }, 'Heute') : null,
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Vorheriger Tag', onclick: () => go(-1) }, icon('chevron', { size: 20, cls: 'flip' })),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Nächster Tag', onclick: () => go(1) }, icon('chevron', { size: 20 }))));
}

function mealCard(iso, meal, entries, prevEntries, rerender) {
  const list = entries.filter((e) => e.meal === meal.id);
  if (!list.length) return null; // leere Mahlzeiten erscheinen nicht (Nutzerentscheidung 2026-10-26)
  const kcal = sumEntries(list).k;
  const open = openMeals.has(meal.id);
  const sub = list.length
    ? (list.length === 1 ? `${list[0].n.split(',')[0]} · ${fmt(kcal)} kcal` : `${list.length} Einträge · ${fmt(kcal)} kcal`)
    : 'Noch leer';

  const head = h('div', { class: 'meal-head' },
    h('button', {
      class: 'meal-toggle', type: 'button', disabled: !list.length, 'aria-expanded': list.length ? String(open) : false,
      onclick: () => { if (open) openMeals.delete(meal.id); else openMeals.add(meal.id); rerender(); }
    },
    h('b', {}, meal.label, list.length ? icon(open ? 'up' : 'down', { size: 16, cls: 'chev' }) : null),
    h('small', {}, sub)),
    h('button', { class: 'add-btn', type: 'button', 'aria-label': `${meal.label} hinzufügen`, onclick: () => { openMeals.add(meal.id); openAdd(iso, meal.id); } }, icon('plus', { size: 22 })));

  const rows = open && list.length ? h('div', { class: 'entries' }, ...list.map((e) => h('button', {
    class: 'entry', type: 'button',
    // Verknüpfte Einträge (kcal eines Koffein-Getränks) im Koffein-Sheet ändern
    onclick: () => (e.link && e.link.startsWith('caff:')
      ? openCaffeine(iso, caffEntries(iso).find((x) => 'caff:' + x.id === e.link))
      : e.link && e.link.startsWith('alc:')
        ? openAlcohol(iso, alcEntries(iso).find((x) => 'alc:' + x.id === e.link))
        : isQuick(e) ? openQuick(iso, e.meal, e) : openAmount(e, { iso, edit: true }))
  },
  h('span', { class: 't' }, h('b', {}, e.n), h('small', {}, isQuick(e) ? 'nur kcal' : `${r1(e.grams)} ${unitOf(e)}`)),
  h('span', { class: 'kc' }, `${fmt(entryTotals(e).k)} kcal`)))) : null;

  return h('section', { class: `card meal${list.length ? '' : ' is-empty'}` }, head, rows);
}

export function heuteView(rerender) {
  const today = isoDate();
  const iso = currentDay();
  const entries = entriesOf(iso);
  const prevEntries = entriesOf(addDays(iso, -1));

  const copyDay = !entries.length && prevEntries.length ? h('button', {
    class: 'btn block copy-day', type: 'button',
    onclick: () => { const n = copyEntries(addDays(iso, -1), iso); toast(`${n} Einträge übernommen`); }
  }, `Ganzen Vortag übernehmen (${fmt(sumEntries(prevEntries).k)} kcal)`) : null;

  const hint = !entries.length ? h('p', { class: 'heute-hint' }, 'Noch nichts gegessen – Mahlzeiten erscheinen mit dem ersten Eintrag über „+“.') : null;
  return h('div', {},
    dayNav(iso, today, rerender),
    dayCard(iso, today),
    suppCard(iso, today),
    ...MEALS.map((m) => mealCard(iso, m, entries, prevEntries, rerender)),
    hint,
    copyDay,
    waterCard(iso, today),
    caffCard(iso, today),
    alcCard(iso, today),
    weightCard(iso, today),
    comingSoon('Analyse', 2));
}
