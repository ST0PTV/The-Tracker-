// Gespeicherte Mahlzeiten (0.5.0): speichern (aus einer Mahlzeit auf „Heute“), auswählen und eintragen (aus „+“).
// Ablauf nach openSaveMeal/openSavedMeal im Calorie-Tracker (js/app.js, ST0PTV, MIT); Daten in journal.js.
import { h } from '../../core/util.js';
import { openSheet } from '../../core/sheet.js';
import { toast } from '../../core/ui.js';
import { fmt, r1 } from '../../core/format.js';
import { MEALS, savedMeals, savableEntries, saveMeal, addSavedMeal, removeSavedMeal, sumEntries, entryTotals, mealLabel } from './journal.js';
import { unitOf } from '../food/foods.js';

const SHORT = { breakfast: 'Frühstück', lunch: 'Mittag', dinner: 'Abend', snack: 'Snack' };
const kcalOf = (items) => sumEntries(items.map((x) => ({ ...x }))).k;

function itemList(items) {
  return h('div', { class: 'card list sm-items' }, ...items.map((e) => h('div', { class: 'entry' },
    h('span', { class: 't' }, h('b', {}, e.n), h('small', {}, e.src === 'quick' ? 'nur kcal' : `${r1(e.grams)} ${unitOf(e)}`)),
    h('span', { class: 'kc' }, `${fmt(entryTotals(e).k)} kcal`))));
}

/** „Als Mahlzeit speichern“ für eine Mahlzeit eines Tages. */
export function openSaveMeal(iso, meal) {
  const items = savableEntries(iso, meal);
  if (!items.length) return null;
  const first = items[0].n.split(',')[0];
  const name = h('input', { class: 'input', type: 'text', maxlength: '60', value: items.length > 1 ? `${first} + ${items.length - 1}` : first, 'aria-label': 'Name der Mahlzeit' });
  let sheet = null;
  const save = () => {
    try { saveMeal(iso, meal, name.value); } catch (e) { toast(e.message, { error: true }); return; }
    sheet.close();
    toast('Mahlzeit gespeichert – unter „+“ wieder eintragen');
  };
  sheet = openSheet(h('div', { class: 'sm' },
    h('label', { class: 'form-label' }, h('span', {}, 'Name'), name),
    h('p', { class: 'small muted' }, `${items.length} ${items.length === 1 ? 'Eintrag' : 'Einträge'} · ${fmt(kcalOf(items))} kcal. Die Nährwerte werden so gespeichert, wie sie jetzt sind.`),
    itemList(items),
    h('button', { class: 'btn primary block', type: 'button', onclick: save }, 'Speichern')), { title: 'Mahlzeit speichern' });
  return sheet;
}

/** Liste der gespeicherten Mahlzeiten; Tippen öffnet die Mahlzeit zum Eintragen. */
export function openSavedMeals(iso, meal, onDone = null) {
  let sheet = null;
  const box = h('div', { class: 'sm' });
  const draw = () => {
    const list = savedMeals();
    box.replaceChildren(list.length
      ? h('div', { class: 'card list' }, ...list.map((m) => h('button', { class: 'entry', type: 'button', onclick: () => openSavedMeal(iso, meal, m.id, () => { sheet.close(); if (onDone) onDone(); }, draw) },
        h('span', { class: 't' }, h('b', {}, m.name), h('small', {}, `${m.items.length} ${m.items.length === 1 ? 'Eintrag' : 'Einträge'}`)),
        h('span', { class: 'kc' }, `${fmt(kcalOf(m.items))} kcal`))))
      : h('p', { class: 'muted small center' }, 'Noch keine Mahlzeit gespeichert. Auf „Heute“ eine Mahlzeit aufklappen und „Als Mahlzeit speichern“ wählen.'));
  };
  draw();
  sheet = openSheet(box, { title: 'Gespeicherte Mahlzeiten' });
  return sheet;
}

/** Eine gespeicherte Mahlzeit: Mahlzeit wählen, alles eintragen oder löschen. */
export function openSavedMeal(iso, meal, id, onAdded = null, onRemoved = null) {
  const m = savedMeals().find((x) => x.id === id);
  if (!m) return null;
  let sel = meal;
  let sheet = null;
  const seg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Eintragen bei' });
  const drawSeg = () => seg.replaceChildren(...MEALS.map((x) => h('button', { type: 'button', role: 'radio', 'aria-checked': x.id === sel ? 'true' : 'false', onclick: () => { sel = x.id; drawSeg(); } }, SHORT[x.id])));
  drawSeg();
  let confirmDel = false;
  const delBtn = h('button', { class: 'btn block danger-text', type: 'button', onclick: () => {
    if (!confirmDel) { confirmDel = true; delBtn.textContent = 'Wirklich löschen?'; return; }
    removeSavedMeal(id); sheet.close(); toast('Gespeicherte Mahlzeit gelöscht'); if (onRemoved) onRemoved();
  } }, 'Gespeicherte Mahlzeit löschen');
  sheet = openSheet(h('div', { class: 'sm' },
    h('p', { class: 'small muted' }, `${m.items.length} ${m.items.length === 1 ? 'Eintrag' : 'Einträge'} · ${fmt(kcalOf(m.items))} kcal`),
    itemList(m.items),
    h('h3', { class: 'sec' }, 'Eintragen bei'), seg,
    h('button', { class: 'btn primary block', type: 'button', onclick: () => {
      document.dispatchEvent(new CustomEvent('tt-open-meal', { detail: sel }));
      const n = addSavedMeal(iso, id, sel);
      sheet.close(); toast(`${n} ${n === 1 ? 'Eintrag' : 'Einträge'} bei ${mealLabel(sel)} eingetragen`); if (onAdded) onAdded();
    } }, 'Alle eintragen'),
    delBtn), { title: m.name });
  return sheet;
}
