// Mikronährstoffe aus dem BLS 4.0 – Rechnung, rein (mit Node getestet).
// Nach Calorie-Tracker 2.3.1, js/micro.js (ST0PTV, MIT): gleiche Rechnung (Summe je Tag, Abdeckung über kcal),
// angepasst an die acht Werte in data/bls.json (ohne Selen) und an die Einträge der App.
// Bezugswerte: EU-Nährstoffbezugswerte (NRV) für Erwachsene, Verordnung (EU) 1169/2011 Anhang XIII Teil A –
// Kennzeichnungswerte, keine persönliche Empfehlung. Werte aus dem Calorie-Tracker übernommen (dort geprüft
// 13.10.2026); hier nicht neu geprüft → „Unverified 0.2.0“.
import { MICROS } from '../food/foods.js';

// Schlüssel wie in data/bls.json → [Name, Einheit je 100 g, NRV pro Tag]
export const MICRO_META = {
  ca: ['Calcium', 'mg', 800], mg: ['Magnesium', 'mg', 375], fe: ['Eisen', 'mg', 14], zn: ['Zink', 'mg', 10],
  jod: ['Jod', 'µg', 150], b12: ['Vitamin B12', 'µg', 2.5], vd: ['Vitamin D', 'µg', 5], fol: ['Folat', 'µg', 200]
};
export const MICRO_ORDER = ['ca', 'mg', 'fe', 'zn', 'jod', 'b12', 'vd', 'fol'];
if (MICRO_ORDER.some((k) => !MICROS.includes(k))) throw new Error('MICRO_ORDER passt nicht zu MICROS');

/**
 * Summen eines Tages. entries = Einträge (mit grams, ref oder id, k); lookup(id) → Lebensmittel mit Mikro-Feldern oder null.
 * Verknüpfte Tracker-Einträge (link) zählen nicht. kcalKnown = kcal aus Einträgen mit BLS-Werten.
 */
export function microDay(entries, lookup) {
  const vals = Object.fromEntries(MICRO_ORDER.map((k) => [k, 0]));
  let kcalAll = 0, kcalKnown = 0;
  for (const e of entries) {
    if (e.link) continue;
    const g = e.grams || 0;
    const k = ((e.k || 0) * g) / 100;
    kcalAll += k;
    const id = String(e.ref || e.id || '');
    const food = id.startsWith('bls:') ? lookup(id) : null;
    if (!food) continue;
    kcalKnown += k;
    for (const m of MICRO_ORDER) if (food[m] != null) vals[m] += (food[m] * g) / 100;
  }
  return { vals, kcalAll, kcalKnown };
}

/** Durchschnitt pro Tag über die Tage mit Einträgen; pct = Anteil am Bezugswert (refOf, Standard NRV; seit 0.3.0
 *  in der App die DGE-Werte der Person); cov = Anteil der kcal mit BLS-Werten. */
export function microAvg(dayLists, lookup, refOf = (k) => MICRO_META[k][2]) {
  const days = dayLists.filter((l) => l.some((e) => !e.link));
  const tot = Object.fromEntries(MICRO_ORDER.map((k) => [k, 0]));
  let kAll = 0, kKnown = 0;
  for (const l of days) {
    const r = microDay(l, lookup);
    for (const m of MICRO_ORDER) tot[m] += r.vals[m];
    kAll += r.kcalAll; kKnown += r.kcalKnown;
  }
  const n = days.length;
  const rows = MICRO_ORDER.map((k) => {
    const [label, unit] = MICRO_META[k];
    const nrv = refOf(k);
    const v = n ? tot[k] / n : 0;
    return { k, label, unit, nrv, v, pct: Math.round((v / nrv) * 100) };
  });
  return { n, rows, cov: kAll ? Math.round((kKnown / kAll) * 100) : 0 };
}
