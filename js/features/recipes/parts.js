// Gemeinsame Bausteine der Rezept-Ansichten: BLS bereitstellen, Rezeptbild, Zeile, Makro-Text, Hash-Parameter.
import { h } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { fmt } from '../../core/format.js';
import { loadFoods, foodsState, foodById } from '../food/foods.js';
import { prepareIngredients, ingredientsReady } from './ingredients.js';
import { clearNutrientCache, recipeNutrients, kcalOfRecipe, isFav } from './recipes.js';
import { gingerNode } from './ginger.js';

/** Sorgt dafür, dass die Zutaten ihre BLS-Werte haben. true = bereit; sonst wird geladen und danach neu gezeichnet. */
export function ensureReady(rerender) {
  if (ingredientsReady()) return true;
  if (foodsState() === 'ready') { prepareIngredients(foodById); clearNutrientCache(); return true; }
  if (foodsState() !== 'failed') loadFoods().then(() => { prepareIngredients(foodById); clearNutrientCache(); rerender(); });
  return false;
}

/** Parameter aus dem Hash, z. B. #/rezepte/rezept?id=x&m=dinner. */
export const qp = (k) => new URLSearchParams(location.hash.split('?')[1] || '').get(k);

/** Farbfläche des Rezepts mit Ginger (Platzhalter). */
export function thumb(r, { size = 52, cls = 'rz-th', peek = 44 } = {}) {
  return h('span', { class: cls, style: `--t:${r.tint || '#E3DCF2'}${size ? `;width:${size}px;height:${size}px` : ''}` }, gingerNode(peek));
}

/** „E 26 · KH 65 · F 17 g“ für factor Portionen. */
export function macroText(r, f = 1) {
  const n = recipeNutrients(r);
  return `E ${fmt(n.protein * f)} · KH ${fmt(n.kh * f)} · F ${fmt(n.fett * f)} g`;
}

export const recipeHref = (r, meal = null) => `#/rezepte/rezept?id=${encodeURIComponent(r.id)}${meal ? `&m=${meal}` : ''}`;

/** Zeile in Listen: Bild, Name, Zeit · kcal · Makros, Herz bei Favoriten. */
export function recipeRow(r, { meal = null, mode = null, extra = null } = {}) {
  const time = mode === 'prep' ? `am Vorabend ${r.time} Min` : mode === 'vorkochen' ? 'vorkochen' : `${r.time} Min`;
  return h('a', { class: 'rz-row', href: recipeHref(r, meal) },
    thumb(r),
    h('span', { class: 't' }, h('b', {}, r.name),
      h('small', {}, `${time} · ${fmt(kcalOfRecipe(r))} kcal · ${macroText(r)}`),
      extra ? h('small', { class: 'rz-extra' }, extra) : null),
    isFav(r) ? h('span', { class: 'rz-fav', 'aria-label': 'Favorit' }, icon('heart', { size: 16 })) : null);
}
