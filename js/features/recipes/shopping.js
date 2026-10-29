// Einkaufsliste aus den übernommenen Gerichten des Wochenplans: Zutaten je Lebensmittel und Einheit zusammengezählt,
// mit Portionen und Mengenfaktor des Plans. Gewürze, Öl und Brühe stehen getrennt unter „Hast du meistens da“.
// Nach dem Rezeptbuch, app.js (shoppingList, STAPLES; Copyright (c) 2026 JuliaKelp, MIT-Lizenz). Geändert: ohne
// Vorrat-Abgleich (folgt in 0.2.5), ohne gekaufte Produkte als Snack; Stück, Dosen und Scheiben aufgerundet;
// zeigt zu jeder Zutat Gericht, Tag und Mahlzeit.
import { isoDate } from '../../core/format.js';
import { scaledIngredients } from './recipes.js';
import { parseIngredient, findFood, scaleIngredient } from './ingredients.js';
import { acceptedSlots, weekPortions } from './week.js';

export const STAPLES = ['Gewürze', 'Öl', 'Gemüsebrühe'];
// Was man nur ganz kaufen kann, wird aufgerundet (½ Dose → 1 Dose); 0,1 Spielraum gegen krumme Mengenfaktoren
const WHOLE = new Set(['stueck', 'dose', 'scheibe']);
const buyable = (unit, x) => (WHOLE.has(unit) ? Math.max(1, Math.ceil(x - 0.1)) : x);

const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

/**
 * { items: [{ key, text, sort, recipes: [Name], uses: [{ day, meal, name }] }], staples: [Text], dishes: [Platz] }
 * Mengen: Zeile × Portionen × Mengenfaktor des Tags. Zeilen ohne Menge („Salz, Pfeffer“) gehen zu den Grundzutaten.
 */
export function shoppingList(today = isoDate()) {
  const n = weekPortions();
  const dishes = acceptedSlots(today);
  const groups = new Map();
  const staples = new Map();
  for (const d of dishes) {
    for (const line of scaledIngredients(d.recipe, 1)) {
      const p = parseIngredient(line);
      const food = findFood(p.name.replace(/[()]/g, ' '));
      if (p.amount === null || (food && STAPLES.includes(food.name))) {
        const name = p.amount === null ? line.replace(/^etwas\s+/i, '') : p.name;
        for (const part of name.split(/,\s*|\s+und\s+|\s+oder\s+/)) {
          const t = part.replace(/\(.*?\)/g, '').trim();
          if (t) staples.set(t.toLowerCase(), cap(t));
        }
        continue;
      }
      const key = `${food ? food.name : p.name.toLowerCase()}|${p.unit}`;
      const g = groups.get(key) || { key, p, food, amount: 0, names: new Set(), recipes: new Set(), uses: [] };
      g.names.add(p.name.replace(/\(.*?\)/g, '').trim().toLowerCase());
      g.amount += p.amount * n * d.factor;
      g.recipes.add(d.recipe.name);
      g.uses.push({ day: d.day, meal: d.meal, name: d.recipe.name });
      groups.set(key, g);
    }
  }
  const items = [...groups.values()].map((g) => ({
    key: g.key,
    // Verschiedene Namen für dasselbe Lebensmittel (z. B. „gehackte“ und „passierte Tomaten“) → Name der Zutat
    text: scaleIngredient(`1 ${g.p.unitWord ? g.p.unitWord + ' ' : ''}${g.names.size > 1 && g.food ? g.food.name : g.p.name}`, buyable(g.p.unit, g.amount)),
    sort: (g.food ? g.food.name : g.p.name).toLowerCase(),
    recipes: [...g.recipes],
    uses: g.uses
  })).sort((a, b) => a.sort.localeCompare(b.sort, 'de'));
  return { items, staples: [...staples.values()].sort((a, b) => a.localeCompare(b, 'de')), dishes, portions: n };
}
