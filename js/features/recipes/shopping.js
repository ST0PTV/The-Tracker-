// Einkaufsliste aus den übernommenen Gerichten des Wochenplans: Zutaten je Lebensmittel und Einheit zusammengezählt,
// mit Portionen und Mengenfaktor des Plans. Gewürze, Öl und Brühe stehen getrennt unter „Hast du meistens da“.
// Nach dem Rezeptbuch, app.js (shoppingList, STAPLES; Copyright (c) 2026 JuliaKelp, MIT-Lizenz). Geändert: ohne
// gekaufte Produkte als Snack; Stück, Dosen und Scheiben aufgerundet; ab 0.2.5 mit dem Vorrat verrechnet (was da ist,
// muss nicht gekauft werden, bei zu wenig nur der Rest);
// zeigt zu jeder Zutat Gericht, Tag und Mahlzeit.
import { isoDate } from '../../core/format.js';
import { scaledIngredients } from './recipes.js';
import { parseIngredient, findFood, scaleIngredient, gramsOfText } from './ingredients.js';
import { stockOf } from './pantry.js';
import { acceptedSlots, weekPortions } from './week.js';

export const STAPLES = ['Gewürze', 'Öl', 'Gemüsebrühe'];
// Was man nur ganz kaufen kann, wird aufgerundet (½ Dose → 1 Dose); 0,1 Spielraum gegen krumme Mengenfaktoren
const WHOLE = new Set(['stueck', 'dose', 'scheibe']);
const buyable = (unit, x) => (WHOLE.has(unit) ? Math.max(1, Math.ceil(x - 0.1)) : x);

const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

/**
 * { items: [{ key, text, sort, recipes, uses, stock, stockText, food, needG }], staples: [Text], dishes: [Platz] }
 * stock: null (nicht im Vorrat) | 'full' (reicht) | 'part' (Rest steht in text) | 'open' (da, Menge unbekannt)
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
      const g = groups.get(key) || { key, p, food, amount: 0, grams: 0, names: new Set(), recipes: new Set(), uses: [] };
      g.names.add(p.name.replace(/\(.*?\)/g, '').trim().toLowerCase());
      g.amount += p.amount * n * d.factor;
      g.grams += gramsOfText(line) * n * d.factor;
      g.recipes.add(d.recipe.name);
      g.uses.push({ day: d.day, meal: d.meal, name: d.recipe.name });
      groups.set(key, g);
    }
  }
  const items = [...groups.values()].map((g) => {
    // Verschiedene Namen für dasselbe Lebensmittel (z. B. „gehackte“ und „passierte Tomaten“) → Name der Zutat
    const name = g.names.size > 1 && g.food ? g.food.name : g.p.name;
    const text = (amount) => scaleIngredient(`1 ${g.p.unitWord ? g.p.unitWord + ' ' : ''}${name}`, buyable(g.p.unit, amount));
    const base = { key: g.key, sort: (g.food ? g.food.name : g.p.name).toLowerCase(), recipes: [...g.recipes], uses: g.uses, food: g.food ? g.food.name : null, needG: g.grams };
    const st = g.food ? stockOf(g.food.name) : { g: 0, open: false };
    if (!g.grams || (!st.g && !st.open)) return { ...base, text: text(g.amount), stock: null };
    if (st.g >= g.grams * 0.98) return { ...base, text: text(g.amount), needG: 0, stock: 'full', stockText: `${Math.round(st.g)} g da` };
    if (st.g > 0) { const rest = g.grams - st.g; return { ...base, text: text(g.amount * (rest / g.grams)), needG: rest, stock: 'part', stockText: `${Math.round(st.g)} g schon da` }; }
    return { ...base, text: text(g.amount), stock: 'open', stockText: 'im Vorrat, Menge offen' };
  }).sort((a, b) => a.sort.localeCompare(b.sort, 'de'));
  return { items, staples: [...staples.values()].sort((a, b) => a.localeCompare(b, 'de')), dishes, portions: n };
}
