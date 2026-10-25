// Zahlen, Datum und Eingaben (deutsche Schreibweise). Aus Rezeptbuch/tracker/js/app.js
// (Kalorien-Tracker von ST0PTV, ins Rezeptbuch übernommen von JuliaKelp; beide MIT).

export const r0 = (n) => Math.round(n || 0);
export const r1n = (n) => Math.round((n || 0) * 10) / 10;

/** Ganze Zahl mit Tausenderpunkt und echtem Minuszeichen (nur Anzeige, nicht für Eingabefelder). */
export const fmt = (n) => r0(n).toLocaleString('de-DE').replace('-', '−');

/** Eine Nachkommastelle, ohne Tausenderpunkt (für Gramm und Eingabefelder). */
export const r1 = (n) => r1n(n).toLocaleString('de-DE', { maximumFractionDigits: 1, useGrouping: false });

/** Zahl aus einer Eingabe; Komma oder Punkt als Dezimaltrenner. Keine Zahl → null. */
export const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/** Datum als JJJJ-MM-TT in lokaler Zeit. */
export function isoDate(d = new Date()) {
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** n Tage zu einem JJJJ-MM-TT addieren (Mittag als Anker, damit die Zeitumstellung nicht stört). */
export function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

/** „Heute“, „Gestern“, „Morgen“ oder „Mo., 20. Okt.“. */
export function dayLabel(iso, today = isoDate()) {
  if (iso === today) return 'Heute';
  if (iso === addDays(today, -1)) return 'Gestern';
  if (iso === addDays(today, 1)) return 'Morgen';
  return new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Für die Suche: Kleinbuchstaben, Umlaute ausgeschrieben, keine Sonderzeichen. */
export function norm(s) {
  return String(s).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/-/g, '').replace(/[^a-z0-9 ]/g, ' ');
}
