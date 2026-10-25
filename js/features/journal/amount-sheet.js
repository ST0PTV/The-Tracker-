// Mengen-Dialog: Menge eingeben oder Portion antippen (mehrfach = mehrere Portionen), Mahlzeit wählen, eintragen.
// Im Bearbeiten-Modus: Menge/Mahlzeit ändern oder löschen (mit Rückgängig).
// Nach openAmount im Kalorien-Tracker (Rezeptbuch/tracker/js/app.js, ST0PTV/JuliaKelp, MIT).
import { h } from '../../core/util.js';
import { openSheet, closeAllSheets } from '../../core/sheet.js';
import { icon } from '../../core/icons.js';
import { toast } from '../../core/ui.js';
import { fmt, r1, num } from '../../core/format.js';
import { per, unitOf, allFoods } from '../food/foods.js';
import { portionOptions } from '../food/portions.js';
import { customById } from '../food/custom.js';
import { openFoodForm } from './food-form.js';
import { MEALS, addEntry, updateEntry, removeEntry, restoreEntry, isFav, toggleFav, lastGrams } from './journal.js';

/**
 * food: Lebensmittel (neu) oder Eintrag (edit: true). iso: Tag. meal: vorgewählte Mahlzeit.
 * onDone: wird nach Speichern/Löschen aufgerufen (z. B. Suche schließen).
 */
export function openAmount(food, { iso, meal, edit = false, onDone = null, onClose = null } = {}) {
  const U = unitOf(food);
  const id = food.ref || food.id;
  const last = edit ? null : lastGrams(id);
  const options = portionOptions(food, allFoods());
  let grams = edit ? food.grams : (last || food.serving || 100);
  let mealSel = edit ? food.meal : meal;

  const input = h('input', { class: 'input big-input', type: 'text', inputmode: 'decimal', value: r1(grams), 'aria-label': `Menge in ${U}` });
  const nutri = h('div', { class: 'nutri' });
  const chips = h('div', { class: 'chips' });
  const mealSeg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Mahlzeit' });
  const star = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Favorit', 'aria-pressed': isFav(id) ? 'true' : 'false' }, icon('star', { size: 22 }));

  const showNutri = () => {
    const x = per(food, num(input.value) || 0);
    const cell = (v, label, unit = 'g') => h('div', {}, h('b', {}, unit === 'kcal' ? fmt(v) : r1(v)), h('span', {}, label));
    nutri.replaceChildren(cell(x.k, 'kcal', 'kcal'), cell(x.p, 'Eiweiß'), cell(x.c, 'KH'), cell(x.f, 'Fett'), cell(x.fi, 'Ballastst.'), cell(x.su, 'Zucker'));
  };

  // Portionen: mehrfach tippen = mehrere Portionen
  let lastChip = null, mult = 0;
  const chipEls = options.map((o) => {
    const b = h('button', { type: 'button', class: 'chip', title: o.hint }, `${o.label} · ${r1(o.grams)} ${U}`);
    b.addEventListener('click', () => {
      mult = lastChip === b ? mult + 1 : 1; lastChip = b;
      input.value = r1(o.grams * mult); showNutri();
      chipEls.forEach((c) => c.classList.toggle('on', c === b));
      b.textContent = `${mult > 1 ? `${mult} × ${o.label.replace(/^1 /, '')}` : o.label} · ${r1(o.grams * mult)} ${U}`;
    });
    return b;
  });
  if (last) {
    const b = h('button', { type: 'button', class: 'chip' }, `Zuletzt · ${r1(last)} ${U}`);
    b.addEventListener('click', () => { input.value = r1(last); showNutri(); lastChip = b; chipEls.forEach((c) => c.classList.toggle('on', c === b)); });
    chipEls.push(b);
  }
  chips.append(...chipEls);
  input.addEventListener('input', () => { lastChip = null; chipEls.forEach((c) => c.classList.remove('on')); showNutri(); });

  const drawMeals = () => mealSeg.replaceChildren(...MEALS.map((m) => h('button', {
    type: 'button', role: 'radio', 'aria-checked': m.id === mealSel ? 'true' : 'false',
    onclick: () => { mealSel = m.id; drawMeals(); }
  }, m.label.replace('essen', ''))));
  drawMeals();
  showNutri();

  star.addEventListener('click', () => {
    const on = toggleFav(food);
    star.setAttribute('aria-pressed', on ? 'true' : 'false');
    toast(on ? 'Zu Favoriten hinzugefügt' : 'Aus Favoriten entfernt');
  });

  let sheet = null;
  const finish = () => { sheet.close(); if (onDone) onDone(); };

  const save = () => {
    const g = num(input.value);
    if (!(g > 0 && g <= 5000)) { toast(`Bitte eine Menge zwischen 0 und 5.000 ${U} eingeben.`, { error: true }); return; }
    if (edit) { updateEntry(iso, food.id, { grams: g, meal: mealSel }); toast('Gespeichert'); }
    else { addEntry(iso, food, g, mealSel); toast(`${food.n.split(',')[0]} eingetragen`); }
    finish();
  };
  const del = () => {
    const gone = removeEntry(iso, food.id);
    closeAllSheets();
    toast('Eintrag gelöscht', { action: { label: 'Rückgängig', onClick: () => restoreEntry(iso, gone) } });
  };

  // Hinweise zu gescannten Produkten: fehlende Angaben und Süßstoffe (aus Open Food Facts)
  const NAMES = { p: 'Eiweiß', c: 'Kohlenhydrate', f: 'Fett', fi: 'Ballaststoffe', su: 'Zucker' };
  const hints = [];
  if (food.miss && food.miss.length) hints.push(`Keine Angabe zu ${food.miss.map((k) => NAMES[k]).join(', ')} (zählt als 0).`);
  if (food.sw && food.sw.length) hints.push(`Enthält Süßungsmittel: ${food.sw.join(', ')}.`);
  if (food.src === 'off') hints.push('Werte von Open Food Facts (von Nutzern eingetragen) – bei Zweifeln mit der Packung vergleichen.');
  const own = !edit && String(id).startsWith('custom:') ? customById(id) : null;

  const hasLarn = options.some((o) => o.larn);
  const per100 = `Pro 100 ${U}: ${fmt(food.k)} kcal · E ${r1(food.p)} g · KH ${r1(food.c)} g · F ${r1(food.f)} g`;
  const content = h('div', { class: 'amount' },
    h('div', { class: 'amount-top' }, h('p', { class: 'muted small' }, food.brand ? `${food.brand} · ${per100}` : per100), star),
    h('label', { class: 'form-label' }, h('span', {}, `Menge in ${U === 'ml' ? 'Millilitern' : 'Gramm'}`), input),
    options.length || last ? chips : null,
    hasLarn ? h('p', { class: 'muted small' }, 'Mehrfach tippen = mehrere Portionen. Standardportionen nach LARN 2024 (Rohgewicht, essbarer Anteil).') : null,
    nutri,
    hints.length ? h('p', { class: 'small muted' }, hints.join(' ')) : null,
    h('span', { class: 'label' }, 'Mahlzeit'), mealSeg,
    h('button', { class: 'btn primary block', type: 'button', onclick: save }, edit ? 'Speichern' : 'Eintragen'),
    edit ? h('button', { class: 'btn block danger-text', type: 'button', onclick: del }, 'Eintrag löschen') : null,
    own ? h('button', { class: 'btn block subtle-btn', type: 'button', onclick: () => { sheet.close(); openFoodForm(own); } }, 'Lebensmittel bearbeiten') : null);

  sheet = openSheet(content, { title: food.n, onClose });
  // Tastatur nicht sofort öffnen, wenn Portionen da sind (meist reicht ein Tipp)
  if (!options.length && !last) setTimeout(() => input.select(), 250);
  return sheet;
}
