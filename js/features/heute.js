// Reiter „Heute“: Tag wählen, Kalorien-Karte, Mahlzeiten mit Einträgen.
// Aufbau nach renderDiary im Kalorien-Tracker bzw. der Startseite im Rezeptbuch (ST0PTV/JuliaKelp, MIT).
// Reihenfolge: Kalorien, Supplements (abhaken), Mahlzeiten (nur mit Einträgen), Wasser, Koffein, Alkohol (nur mit Eintrag),
// Gewicht. Eintragen über das „+“ in der Tab-Leiste (quick-add.js) oder das „+“ der Karten.
// 0.5.1: Wochenstreifen + Monat (week-strip.js), Wischen auf Einträgen (swipe.js), „Wann gegessen?“ je Mahlzeit,
// Wochenrückblick (Mo–Mi) und Tagesabschluss (ab 20 Uhr) über der Tagesübersicht, Karte „Geplant für heute“.
import { h } from '../core/util.js';
import { toast } from '../core/ui.js';
import { icon } from '../core/icons.js';
import { fmt, r1, isoDate, addDays, dayLabel } from '../core/format.js';
import { unitOf } from './food/foods.js';
import { MEALS, MEAL_MIN, entriesOf, entryTotals, sumEntries, copyEntries, isQuick, removeEntry, restoreEntry, duplicateEntry, setMealTime, mealTime } from './journal/journal.js';
import { weekStrip, openMonth } from './journal/week-strip.js';
import { makeSwipe } from './journal/swipe.js';
import { closingCard } from './journal/closing-card.js';
import { reviewCard } from './analyse/week-review.js';
import { plannedCard } from './recipes/planned-card.js';
import { openSheet } from '../core/sheet.js';
import { minToHm } from './drinks/caffeine-model.js';
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
import { openSaveMeal } from './journal/meals-sheet.js';
import { welcomeCard } from './intro/tour-view.js';
import * as store from '../core/store.js';
import { cycleCard } from './cycle/cycle-card.js';
import { trainingTodayCard } from './training/today-card.js';
import { todayOrder } from './me/today-layout.js';

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
  const pick = (d) => { if (d !== day) { day = d; openMeals.clear(); rerender(); } };
  const weekday = new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  return h('div', { class: 'day-top' },
    h('header', { class: 'page-head day-head' },
      h('div', {}, h('h1', {}, dayLabel(iso, today)), h('p', { class: 'sub' }, weekday)),
      h('div', { class: 'day-nav' },
        // An anderen Tagen steht „Heute“ statt Analyse (sonst bricht der Titel auf schmalen Geräten um)
        iso !== today ? h('button', { class: 'btn small-btn', type: 'button', onclick: () => pick(today) }, 'Heute') : null,
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Tag im Kalender wählen', onclick: () => openMonth(iso, today, pick) }, icon('calendar', { size: 20 })),
        iso === today ? h('a', { class: 'icon-btn', href: '#/analyse', 'aria-label': 'Analyse' }, icon('trend', { size: 20 })) : null)),
    weekStrip(iso, today, pick));
}

// „Wann gegessen?“ (0.5.1): eine Uhrzeit für alle Einträge der Mahlzeit (Magen-Modell, Plan-Vorschlag)
function openMealTime(iso, meal, today) {
  const cur = mealTime(iso, meal);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let sheet = null;
  const set = (t, msg) => { setMealTime(iso, meal, t); sheet.close(); toast(msg); };
  const timeIn = h('input', { class: 'input', type: 'time', value: cur && cur !== 'mixed' ? cur : minToHm(MEAL_MIN[meal] ?? 720), 'aria-label': 'Uhrzeit' });
  const chips = [
    iso === today ? ['Jetzt', minToHm(nowMin)] : null,
    iso === today && nowMin >= 30 ? ['vor 30 Min.', minToHm(nowMin - 30)] : null,
    iso === today && nowMin >= 60 ? ['vor 1 Std.', minToHm(nowMin - 60)] : null
  ].filter(Boolean);
  const box = h('div', { class: 'mt-box' },
    h('p', { class: 'muted' }, cur === 'mixed' ? 'Die Einträge haben verschiedene Uhrzeiten. Eine neue gilt für alle.' : 'Gilt für alle Einträge dieser Mahlzeit, z. B. im Magen-Modell.'),
    chips.length ? h('div', { class: 'chips' }, ...chips.map(([l, t]) => h('button', { class: 'chip', type: 'button', onclick: () => set(t, `Uhrzeit ${t}`) }, l))) : null,
    h('label', { class: 'form-label' }, h('span', {}, 'Uhrzeit'), timeIn),
    h('button', { class: 'btn primary block', type: 'button', onclick: () => { if (timeIn.value) set(timeIn.value, `Uhrzeit ${timeIn.value}`); } }, 'Übernehmen'),
    cur ? h('button', { class: 'btn block subtle-btn', type: 'button', onclick: () => set(null, 'Standardzeit der Mahlzeit') }, `Standard (${minToHm(MEAL_MIN[meal])})`) : null);
  sheet = openSheet(box, { title: 'Wann gegessen?' });
}

// Eintrag mit Wischen: links löschen (Rückgängig), rechts noch einmal. Verknüpfte Einträge (Koffein, Alkohol) nicht.
function entryRow(iso, e, open) {
  const btn = h('button', { class: 'entry', type: 'button', onclick: open },
    h('span', { class: 't' }, h('b', {}, e.n), h('small', {}, isQuick(e) ? 'nur kcal' : `${r1(e.grams)} ${unitOf(e)}`)),
    h('span', { class: 'kc' }, `${fmt(entryTotals(e).k)} kcal`));
  if (e.link) return btn;
  const wrap = h('div', { class: 'sw-wrap' },
    h('div', { class: 'sw-under sw-del', 'aria-hidden': 'true' }, icon('trash', { size: 18 }), 'Löschen'),
    h('div', { class: 'sw-under sw-dup', 'aria-hidden': 'true' }, icon('plus', { size: 18 }), 'Noch mal'),
    btn);
  makeSwipe(wrap, btn, {
    onDelete: () => {
      const gone = removeEntry(iso, e.id);
      if (gone) toast(`„${gone.n.split(',')[0]}“ gelöscht`, { action: { label: 'Rückgängig', onClick: () => restoreEntry(iso, gone) } });
    },
    onDuplicate: () => {
      const c = duplicateEntry(iso, e.id);
      if (c) toast(`„${c.n.split(',')[0]}“ noch einmal eingetragen`, { action: { label: 'Rückgängig', onClick: () => removeEntry(iso, c.id) } });
    }
  });
  return wrap;
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

  const open1 = (e) => () => (e.link && e.link.startsWith('caff:')
    ? openCaffeine(iso, caffEntries(iso).find((x) => 'caff:' + x.id === e.link))
    : e.link && e.link.startsWith('alc:')
      ? openAlcohol(iso, alcEntries(iso).find((x) => 'alc:' + x.id === e.link))
      : isQuick(e) ? openQuick(iso, e.meal, e) : openAmount(e, { iso, edit: true }));
  const mt = mealTime(iso, meal.id);
  const own = list.some((e) => !e.link);
  const rows = open && list.length ? h('div', { class: 'entries' }, ...list.map((e) => entryRow(iso, e, open1(e))),
    own ? h('div', { class: 'meal-foot' },
      h('button', { class: 'link meal-time', type: 'button', onclick: () => openMealTime(iso, meal.id, isoDate()) },
        icon('clock', { size: 15 }), mt === 'mixed' ? 'verschiedene Uhrzeiten' : mt ? `gegessen um ${mt}` : 'Wann gegessen?'),
      // 0.5.0: Mahlzeit speichern (ohne Koffein/Alkohol-Verknüpfungen)
      h('button', { class: 'link meal-save', type: 'button', onclick: () => openSaveMeal(iso, meal.id) }, 'Als Mahlzeit speichern')) : null) : null;

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
  // Reihenfolge aus „Ich → Heute anpassen“ (me/today-layout.js); die Tagesübersicht steht immer oben
  const CARD = {
    planned: () => plannedCard(iso, today, rerender),
    cycle: () => cycleCard(iso, today),
    training: () => trainingTodayCard(iso, today),
    supp: () => suppCard(iso, today),
    meals: () => [...MEALS.map((m) => mealCard(iso, m, entries, prevEntries, rerender)), hint, copyDay],
    water: () => waterCard(iso, today),
    caff: () => caffCard(iso, today),
    alc: () => alcCard(iso, today),
    weight: () => weightCard(iso, today)
  };
  return h('div', {},
    dayNav(iso, today, rerender),
    welcomeCard(Object.keys(store.get('days')).length > 0, rerender),
    reviewCard(iso, today, rerender),
    closingCard(iso, today),
    dayCard(iso, today),
    ...todayOrder().flatMap((k) => CARD[k]()));
}
