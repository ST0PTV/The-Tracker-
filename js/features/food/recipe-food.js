// Eigenes Rezept als Lebensmittel je 100 g (0.5.1): rohe Zutaten mit Gramm, optional Endgewicht nach dem Kochen und
// Anzahl Portionen. Nach dem Rezept-Baukasten im Calorie-Tracker (app.js, ST0PTV, MIT).
// Rechnung: Summe der Nährwerte aller Zutaten ÷ Endgewicht × 100. Ohne Endgewicht zählt die Summe der Zutaten
// (kein Wasserverlust). Schwäche: Wasser, das beim Kochen verdampft oder aufgenommen wird, verschiebt nur das Gewicht,
// nicht die Nährstoffe – darum lieber nach dem Kochen wiegen. Vitamine, die beim Kochen verloren gehen, sind nicht
// berücksichtigt (Schätzung).
import { NUTRIENTS, per } from './foods.js';

export const RF_MAX_PARTS = 60;

/**
 * parts = [{ food, g }] (food mit Werten je 100 g), total = Endgewicht in g oder null, portions ≥ 1.
 * Gibt { per100, sum, weight, serving } zurück; wirft mit Text für die Oberfläche.
 */
export function recipeFoodFrom({ parts, total = null, portions = 1 }) {
  const list = (parts || []).filter((x) => x && x.food && x.g > 0);
  if (!list.length) throw new Error('Bitte mindestens eine Zutat mit Menge eintragen.');
  if (list.length > RF_MAX_PARTS) throw new Error(`Höchstens ${RF_MAX_PARTS} Zutaten.`);
  const raw = list.reduce((a, x) => a + x.g, 0);
  if (total != null && !(total >= 10 && total <= 20000)) throw new Error('Endgewicht bitte zwischen 10 und 20.000 g.');
  if (!(Number.isInteger(portions) && portions >= 1 && portions <= 50)) throw new Error('Portionen bitte zwischen 1 und 50.');
  const weight = total || raw;
  const sum = Object.fromEntries(NUTRIENTS.map((n) => [n, 0]));
  for (const x of list) { const t = per(x.food, x.g); for (const n of NUTRIENTS) sum[n] += t[n] || 0; }
  const r1 = (v) => Math.round(v * 10) / 10;
  const per100 = Object.fromEntries(NUTRIENTS.map((n) => [n, r1((sum[n] * 100) / weight)]));
  if (per100.k > 900) throw new Error('Mehr als 900 kcal pro 100 g – bitte Endgewicht prüfen.');
  return { per100, sum, weight, raw, serving: Math.round(weight / portions) };
}
