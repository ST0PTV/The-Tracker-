// Koffein im Körper – Rechenmodell (rein, ohne Speicher und DOM; mit Node getestet).
// Aus Rezeptbuch/tracker/js/caffeine.js (Kalorien-Tracker von ST0PTV, angepasst von JuliaKelp; MIT).
//
// Modell: ein Kompartiment, Aufnahme und Abbau erster Ordnung (so beschrieben u. a. bei Seng et al. 2009):
//   Menge im Körper(t) = D · ka/(ka − ke) · (e^(−ke·t) − e^(−ka·t)),  ke = ln 2 / Halbwertszeit.
// ka = 8 /h ergibt ein Maximum nach ca. 30–40 min bei Sofort-Aufnahme (Blanchard 1983: ca. 30 min bei Lösung).
// „Getrunken über X Minuten“: die Dosis wird in 6 gleiche Teile über diese Zeit verteilt.
//
// Gültigkeit und Schwächen (in der App als Schätzung gekennzeichnet):
// - Zeigt die Menge im Körper in mg, nicht die Plasmakonzentration und nicht die Wirkung.
// - Halbwertszeit individuell sehr verschieden (Studien 2,7–9,9 h); länger mit östrogenhaltiger Pille
//   (Abernethy & Todd 1985: 7,9 statt 5,4 h) und in der Schwangerschaft, kürzer bei Rauchern.
// - Körpergewicht, Mahlzeiten (verzögerte Aufnahme), Toleranz, Leberfunktion und Medikamente fehlen.
// - Die Schwelle zur Bettzeit ist eine Faustregel, kein belegter Grenzwert (EFSA 2015; Drake et al. 2013).

export const CAFF_KA = 8;

/** "HH:MM" → Minuten seit 0 Uhr. */
export const hmToMin = (s) => { const [h, m] = String(s || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
/** Minuten → "HH:MM". */
export const minToHm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`;

/** Absolute Zeit in Stunden (lokale Uhrzeit des Tages iso + min Minuten). */
export function absHours(iso, min) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 0, min).getTime() / 36e5;
}

export const keOf = (halfLife) => Math.LN2 / (halfLife || 5);

/** Eine Dosis D (mg) zur Zeit t0, Menge zur Zeit t (Stunden). */
export function one(D, t0, t, ke) {
  const dt = t - t0;
  if (dt <= 0) return 0;
  return D * CAFF_KA / (CAFF_KA - ke) * (Math.exp(-ke * dt) - Math.exp(-CAFF_KA * dt));
}

/** Summe aller Dosen [{ t, mg, dur (Stunden) }] zur Zeit t. */
export function level(doses, t, ke) {
  let s = 0;
  for (const d of doses) {
    if (t <= d.t) continue;
    const n = d.dur > 0 ? 6 : 1;
    for (let i = 0; i < n; i++) s += one(d.mg / n, d.t + (n > 1 ? (d.dur * i) / (n - 1) : 0), t, ke);
  }
  return s;
}

/** Zeitpunkt, ab dem der Pegel dauerhaft unter thr bleibt (frühestens from); auf 5 min gerundet. */
export function clearTime(doses, from, thr, ke) {
  let last = null;
  for (let t = from; t <= from + 48; t += 1 / 12) if (level(doses, t, ke) >= thr) last = t;
  return last == null ? from : Math.ceil((last + 1 / 12) * 12) / 12;
}

/** Bettzeit und Aufwachen nach dem Tag iso (Bettzeit vor 12 Uhr zählt als Folgetag). */
export function bedWake(iso, bed = '23:00', wake = '07:00') {
  const bm = hmToMin(bed), wm = hmToMin(wake);
  const b = absHours(iso, bm + (bm < 720 ? 1440 : 0));
  let w = absHours(iso, wm); let k = 0;
  while (w <= b && k++ < 3) w = absHours(iso, wm + 1440 * k);
  return { bed: b, wake: w };
}

/** Uhrzeit aus absoluten Stunden; „(Folgetag)“, wenn nicht am Tag refIso. */
export function fmtHours(h, refIso) {
  const d = new Date(Math.round(h * 3600000));
  const p = (n) => String(n).padStart(2, '0');
  const iso = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return `${p(d.getHours())}:${p(d.getMinutes())}${refIso && iso !== refIso ? ' (Folgetag)' : ''}`;
}
