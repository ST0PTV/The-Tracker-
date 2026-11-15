// „Snack: Was darf ich jetzt?“ und Mikronährstoff-Hinweise im Vorrat (0.5.0) – Rechnung, rein bis auf den Speicher.
// Nach dem Rezeptbuch (app.js: snackAllowance, snackAmount, snackPortion, groupPortion, richLevel, pantryMicroScore;
// Copyright (c) 2026 JuliaKelp, MIT). Geändert: Portionen nach den Gruppen des Vorrats von The Tracker statt der
// Rezeptbuch-Gruppen; Snack-Rahmen aus mealBudget (recipes.js). Gesund oder nicht spielt keine Rolle (wie im Original).
//
// Übliche Portionen (SINU/LARN 2024, wie im Rezeptbuch; „Unverified 0.5.0“): Obst 150 g, Trockenobst 30 g, Nüsse 30 g,
// Brot 50 g, Getreideflocken 30 g, Joghurt/Quark/Milch 125 g, Ei 50 g, Käse 25 g (gereift) bzw. 50 g (frisch),
// Gemüse 100 g (als Snack die halbe Portion von 200 g), Salat 80 g. Ohne Portion: Mehl, Nudeln, Reis, Öl, Butter, Sahne …
const PORTION_BY_NAME = {
  Brot: 50, Toast: 50, 'Knäckebrot': 20, Haferflocken: 30, Joghurt: 125, Skyr: 125, Magerquark: 125, Sojajoghurt: 125, Milch: 125, Haferdrink: 125,
  Buttermilch: 125, 'Körniger Frischkäse': 100, Ei: 50, Käse: 25, Parmesan: 25, Feta: 50, Mozzarella: 50, Halloumi: 50, Frischkäse: 30, Ricotta: 50,
  Datteln: 30, Rosinen: 30, Schokolade: 25, Salat: 80, Hummus: 50, Edamame: 75
};
const NO_PORTION = new Set(['Erdnussbutter', 'Tahin', 'Leinsamen', 'Chiasamen', 'Sesam', 'Kokosraspeln', 'Butter', 'Sahne', 'Schmand', 'Zucker', 'Honig',
  'Ahornsirup', 'Konfitüre', 'Kakao', 'Zitrone', 'Avocado', 'Apfelmus']);
const PORTION_BY_GROUP = { obst: 150, nuesse: 30, gemuese: 100 };

/** Übliche Snack-Portion in g/ml oder null (dann nur, wenn als Snack markiert: Packungsportion oder 40 g). */
export function usualPortion(x, foodName, group) {
  const usual = (foodName && NO_PORTION.has(foodName)) ? null : (foodName && PORTION_BY_NAME[foodName]) || PORTION_BY_GROUP[group] || null;
  if (usual == null) return x.snack ? (x.serving > 0 ? x.serving : 40) : null;
  return x.serving > 0 && x.serving <= usual ? x.serving : usual;
}

/**
 * Freier Snack-Rahmen (kcal). eatenBy = { meal: kcal }; budget(meal) = Rahmen der Mahlzeit; mains = Hauptmahlzeiten-IDs.
 * Rahmen = Snack-Budget (bei 2 Mahlzeiten doppelt, Rezeptbuch SNACKS_PER_DAY); minus Snacks; minus, was Hauptmahlzeiten
 * mit Einträgen über ihrem Rahmen liegen (darunter gibt Platz). Nie unter 0.
 */
export function snackAllowance({ eatenBy, budget, mains, mealCount }) {
  const total = budget('snack') * (mealCount === 2 ? 2 : 1);
  let free = total - (eatenBy.snack || 0);
  for (const m of mains) if ((eatenBy[m] || 0) > 0) free -= (eatenBy[m] - budget(m));
  return { total: Math.round(total), free: Math.max(0, Math.round(free)) };
}

/**
 * Wie viel passt? portion (g), kcal je 100 g, stock (g oder null = unbekannt), free (kcal).
 * → { g, status: 'full' | 'part' | 'none' | 'stock', fill } – g auf 5 g abgerundet, außer eine ganze Portion passt.
 */
export function snackAmount({ portion, k, stock, free }) {
  if (!(portion > 0) || !(k > 0)) return null;
  const room = (free / k) * 100;
  const cap = Math.min(portion, stock == null ? Infinity : stock);
  if (room >= cap) return { g: Math.round(cap), status: cap < portion ? 'stock' : 'full', kcal: Math.round((cap * k) / 100) };
  const g = Math.floor(room / 5) * 5;
  if (g < 5) return { g: 0, status: 'none', kcal: Math.round((portion * k) / 100) };
  return { g, status: 'part', kcal: Math.round((g * k) / 100) };
}

/**
 * Stufe eines Nährstoffs je 100 g im Verhältnis zum Tageswert: 2 = „viel“ (≥ 30 %), 1 = „etwas“ (≥ 15 %), 0 = wenig,
 * null = unbekannt. Getränke halbe Schwellen. Schwellen wie „Quelle von“/„hoher Gehalt“ (VO (EG) 1924/2006, Anhang).
 */
export function richLevel(value, ref, liq = false) {
  if (value == null || !(ref > 0)) return null;
  const pct = value / ref, f = liq ? 0.5 : 1;
  return pct >= 0.3 * f ? 2 : pct >= 0.15 * f ? 1 : 0;
}
