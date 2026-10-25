// Hinzufügen-Sheet einer Mahlzeit: Suche im BLS; ohne Suchbegriff Favoriten und zuletzt verwendete Lebensmittel.
// Nach openAdd/renderAddResults im Kalorien-Tracker (Rezeptbuch/tracker/js/app.js, ST0PTV/JuliaKelp, MIT).
// Scanner, eigene Lebensmittel und Schnelleintrag kommen in späteren Schritten von Phase 2.
import { h } from '../../core/util.js';
import { openSheet } from '../../core/sheet.js';
import { icon } from '../../core/icons.js';
import { fmt } from '../../core/format.js';
import { searchFoods, loadFoods, foodsState, allFoods, foodById, unitOf } from '../food/foods.js';
import { mealLabel, favs, recent, isFav } from './journal.js';
import { openAmount } from './amount-sheet.js';

// Gespeicherte Kopie (Favorit, Zuletzt) mit aktuellen BLS-Werten auffrischen; fehlt das Original, bleibt die Kopie.
const live = (snap) => ({ ...snap, ...(foodById(snap.id) || {}), id: snap.id });

function foodRow(food, onPick) {
  return h('button', { class: 'row', type: 'button', onclick: () => onPick(food) },
    h('span', { class: 't' },
      h('b', {}, isFav(food.id) ? h('span', { class: 'fav-mark', 'aria-label': 'Favorit' }, '★ ') : null, food.n),
      h('small', {}, `${food.brand ? food.brand + ' · ' : ''}${fmt(food.k)} kcal / 100 ${unitOf(food)}`)),
    icon('chevron', { size: 18 }));
}

export function openAdd(iso, meal) {
  let query = '';
  const results = h('div', { class: 'results' });
  const input = h('input', { class: 'search-input', type: 'search', placeholder: 'Lebensmittel suchen, z. B. Haferflocken', autocomplete: 'off', enterkeyhint: 'search', 'aria-label': 'Lebensmittel suchen' });
  let sheet = null;
  const pick = (food) => openAmount(food, { iso, meal, onDone: () => sheet.close() });

  const section = (title, items) => items.length
    ? [h('h3', { class: 'sec' }, title), h('div', { class: 'card list' }, ...items.map((f) => foodRow(f, pick)))]
    : [];

  const draw = () => {
    const q = query.trim();
    if (!q) {
      const fav = favs().map(live);
      const favIds = new Set(fav.map((f) => f.id));
      const rec = recent().filter((r) => !favIds.has(r.id)).slice(0, 20).map(live);
      const parts = [...section('Favoriten', fav), ...section('Zuletzt verwendet', rec)];
      const status = foodsState() === 'failed' ? 'Lebensmitteldaten konnten nicht geladen werden. Bitte einmal online öffnen.'
        : foodsState() !== 'ready' ? 'Lade Lebensmitteldaten …'
          : `${allFoods().length.toLocaleString('de-DE')} Lebensmittel aus dem Bundeslebensmittelschlüssel.`;
      results.replaceChildren(...parts, h('p', { class: 'muted small center' }, status));
      return;
    }
    if (foodsState() !== 'ready') { results.replaceChildren(h('p', { class: 'muted center' }, 'Lade Lebensmitteldaten …')); return; }
    const favIds = new Set(favs().map((f) => f.id));
    const hits = searchFoods(q, { favIds });
    results.replaceChildren(hits.length
      ? h('div', { class: 'card list' }, ...hits.map((f) => foodRow(f, pick)))
      : h('p', { class: 'muted center' }, `Nichts gefunden für „${q}“. Andere Schreibweise oder ein Teilwort versuchen.`));
  };

  input.addEventListener('input', () => { query = input.value; draw(); });
  const onFoods = () => draw();
  document.addEventListener('tt-foods', onFoods);
  loadFoods();
  draw();

  sheet = openSheet(h('div', { class: 'add' }, h('div', { class: 'search' }, icon('search', { size: 18 }), input), results), {
    title: `${mealLabel(meal)} hinzufügen`, full: true,
    onClose: () => document.removeEventListener('tt-foods', onFoods)
  });
  // Ohne Favoriten/Zuletzt gleich tippen lassen
  if (!favs().length && !recent().length) setTimeout(() => input.focus(), 250);
  return sheet;
}
