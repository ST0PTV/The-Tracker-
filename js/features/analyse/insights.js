// Auswertungen über mehrere Tage – Rechnung, rein (ohne Speicher und DOM; mit Node getestet).
// Aus Calorie-Tracker 2.3.1, js/insights.js (ST0PTV, MIT): Gewichtstrend, Ausgleichsgerade und Energiebedarf
// unverändert, Zustand als Parameter statt global. „Tracking-Gewohnheit“ bewusst nicht übernommen
// (Nutzerentscheidung 2026-10-26: kein Wert, der bei Fehltagen sinkt).
import { addDays } from '../../core/format.js';

export const INS_ALPHA = 0.1;        // Gewicht des neuen Werts im Trend
export const INS_WIN = 28;           // Fenster für den Energiebedarf (abgeschlossene Tage)
export const INS_MIN_LOGGED = 14;    // so viele Tage mit Essen im Fenster
export const INS_MIN_WEIGHS = 6;     // so viele Wiegewerte im Fenster
export const INS_MIN_SPAN = 14;      // Wiegewerte über so viele Tage
export const INS_KCAL_KG = 7700;     // Faustregel, siehe „Unverified 0.1.6“
export const KEEP_TOL = 0.1;         // ±10 % um das Ziel gelten als „im Zielbereich“

const dayDiff = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);

/** Tage von end rückwärts: n Tage bis einschließlich end, älteste zuerst. */
export function daysBack(end, n) {
  return Array.from({ length: n }, (_, i) => addDays(end, i - n + 1));
}

/**
 * Gewichtstrend: exponentiell geglätteter Mittelwert wie im Hacker's Diet (Walker): T = T + a·(Gewicht − T), a = 0,1.
 * Tage ohne Wiegen behalten den Trend. Der Trend läuft der echten Entwicklung einige Tage hinterher.
 * log = [{ iso, kg }] (sortiert oder nicht); gibt [{ d, w, t }] vom ersten Wiegen bis to zurück.
 */
export function weightTrend(log, to = null) {
  const ws = log.filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.iso) && x.kg > 20 && x.kg < 400).sort((a, b) => a.iso.localeCompare(b.iso));
  if (!ws.length) return [];
  const map = new Map(ws.map((x) => [x.iso, x.kg]));
  const end = to || ws[ws.length - 1].iso;
  const out = [];
  let t = ws[0].kg;
  for (let d = ws[0].iso; d <= end; d = addDays(d, 1)) {
    const w = map.has(d) ? map.get(d) : null;
    if (w != null) t += INS_ALPHA * (w - t);
    out.push({ d, w, t });
  }
  return out;
}

/** Änderung des Trends pro Woche über die Trendpunkte tr = [{ d, t }] (wie die Gewichts-Kachel im Calorie-Tracker). */
export function trendPerWeek(tr) {
  if (tr.length < 2) return null;
  return ((tr[tr.length - 1].t - tr[0].t) / dayDiff(tr[0].d, tr[tr.length - 1].d)) * 7;
}

/** Ausgleichsgerade durch pts = [[x, y]]: Steigung, Standardfehler, n (mindestens 3 Punkte). */
export function regression(pts) {
  const n = pts.length; if (n < 3) return null;
  const mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
  let sxx = 0, sxy = 0;
  pts.forEach(([x, y]) => { sxx += (x - mx) ** 2; sxy += (x - mx) * (y - my); });
  if (!sxx) return null;
  const b = sxy / sxx, a = my - b * mx;
  const sse = pts.reduce((s, [x, y]) => s + (y - (a + b * x)) ** 2, 0);
  return { slope: b, se: Math.sqrt(sse / (n - 2) / sxx), n };
}

/**
 * Energiebedarf aus Essen + Gewicht (Idee wie MacroFactor „expenditure“): Bedarf ≈ Ø Aufnahme − Steigung × 7.700 kcal/kg.
 * Fenster: die 28 abgeschlossenen Tage vor today. Spanne = 95-%-Intervall der Steigung; Wiegewerte schwanken nicht
 * unabhängig (Wasser, Darminhalt), die echte Unsicherheit ist größer. Nur Anzeige – kein Ziel wird geändert.
 * kcalOf(iso), loggedOf(iso) → Tag mit Essen?, log = [{ iso, kg }].
 */
export function expenditure({ today, kcalOf, loggedOf, log }) {
  const end = addDays(today, -1), start = addDays(end, -(INS_WIN - 1));
  const days = daysBack(end, INS_WIN);
  const loggedDays = days.filter((d) => loggedOf(d));
  const weighs = log.filter((x) => x.iso >= start && x.iso <= end).sort((a, b) => a.iso.localeCompare(b.iso));
  const span = weighs.length ? dayDiff(weighs[0].iso, weighs[weighs.length - 1].iso) : 0;
  const base = { start, end, logged: loggedDays.length, weighs: weighs.length, span, win: INS_WIN };
  if (loggedDays.length < INS_MIN_LOGGED || weighs.length < INS_MIN_WEIGHS || span < INS_MIN_SPAN) return { ...base, ok: false };
  const intake = loggedDays.reduce((s, d) => s + kcalOf(d), 0) / loggedDays.length;
  const reg = regression(weighs.map((x) => [dayDiff(start, x.iso), x.kg]));
  if (!reg) return { ...base, ok: false };
  const tdee = intake - reg.slope * INS_KCAL_KG;
  const half = 1.96 * reg.se * INS_KCAL_KG;
  return { ...base, ok: true, intake, slopeWeek: reg.slope * 7, tdee, lo: tdee - half, hi: tdee + half };
}

/** Tag gegen das damals gültige Ziel: 'ok' (±10 %), 'over', 'low' (deutlich darunter) oder null ohne Ziel. */
export function goalState(kcal, goal) {
  if (!goal) return null;
  if (Math.abs(kcal - goal) <= goal * KEEP_TOL) return 'ok';
  return kcal > goal ? 'over' : 'low';
}
