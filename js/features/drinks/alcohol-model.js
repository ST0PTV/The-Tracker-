// Blutalkohol-Schätzung (Promille) – Rechenmodell, rein (ohne Speicher und DOM; mit Node getestet).
// Aus Calorie-Tracker 2.3.1, js/alcohol.js (ST0PTV, MIT): Rechnung unverändert, Zustand als Parameter statt global.
//
// Modell (Widmark mit Aufnahme erster Ordnung und Abbau nullter Ordnung):
//   Promille c(t): dc/dt = Aufnahme(t) / (r · Körpergewicht) − β   (c ≥ 0)
//   Aufnahme je Getränk: A · (1 − Defizit) · ka · e^(−ka·(t − t0)),  A = ml · Vol-% / 100 · 0,789 g/ml
// r: mit Körpergröße aus dem BMI (Maudens et al. 2014: Männer 0,8202 − 0,0090·BMI, Frauen 0,7772 − 0,0099·BMI;
//   gemessen an 23 Männern und 27 Frauen, BMI 16–36; begrenzt auf 0,4–0,8), sonst feste Werte 0,7 (Männer) /
//   0,6 (Frauen) – übliche Werte in der Rechtsmedizin; ohne Geschlecht das Mittel.
// β: Standard 0,15 ‰/h (Jones 2010: guter Mittelwert für moderate Trinker; nüchtern eher 0,10–0,15, nach Essen 0,15–0,20).
// ka und Resorptionsdefizit sind Annahmen ohne eigene Quelle (nüchtern ka 4/h, Defizit 10 %; mit Essen ka 1,5/h,
//   Defizit 20 %): Essen verzögert und senkt den Gipfel (Fraser et al. 1995), die Größe hängt von Mahlzeit und Person ab.
// Grobe Schätzung – nicht geeignet, um die Fahrtüchtigkeit zu beurteilen. Gültig nur für Erwachsene.

export const ALC_DENS = 0.789;
export const ALC_ABS = { fasted: { ka: 4, def: 0.1 }, fed: { ka: 1.5, def: 0.2 } };

/** Gramm Alkohol aus ml und Vol-%. */
export const alcGrams = (ml, vol) => (ml || 0) * (vol || 0) / 100 * ALC_DENS;

/** BMI aus kg und cm (null, wenn etwas fehlt). */
export const bmiOf = (kg, cm) => (kg && cm ? kg / Math.pow(cm / 100, 2) : null);

/** Verteilungsfaktor r; p = { sex, kg, cm }. */
export function alcR({ sex, kg, cm } = {}) {
  const bmi = bmiOf(kg, cm);
  if (bmi) {
    const m = 0.8202 - 0.0090 * bmi, f = 0.7772 - 0.0099 * bmi;
    return Math.min(0.8, Math.max(0.4, sex === 'm' ? m : sex === 'f' ? f : (m + f) / 2));
  }
  return sex === 'm' ? 0.7 : sex === 'f' ? 0.6 : 0.65;
}

/**
 * Promille-Verlauf von t0 bis t1 (Stunden, absolut) in Schritten von dt; Rechnung in 1-min-Schritten ab dem ersten Getränk.
 * doses = [{ t, g, fed }], p = { kg, r, beta }. Gibt [[t, ‰], …] zurück.
 */
export function alcSeries(doses, t0, t1, p, dt = 1 / 30) {
  const W = p.kg, r = p.r, beta = p.beta || 0.15;
  const out = [];
  if (!W || !doses.length) { for (let t = t0; t <= t1 + 1e-9; t += dt) out.push([t, 0]); return out; }
  const h = 1 / 60; // feste Rechenschrittweite 1 min, Aufnahme je Schritt exakt integriert
  const absorbed = (a, b) => doses.reduce((s, d) => {
    const { ka, def } = d.fed ? ALC_ABS.fed : ALC_ABS.fasted;
    const F = (x) => (x <= d.t ? 0 : 1 - Math.exp(-ka * (x - d.t)));
    return s + d.g * (1 - def) * (F(b) - F(a));
  }, 0);
  const sorted = doses.slice().sort((a, b) => a.t - b.t);
  let t = Math.min(t0, sorted[0].t), c = 0, next = t0;
  while (next <= t1 + 1e-9) {
    while (t + h <= next + 1e-9) { c = Math.max(0, c + absorbed(t, t + h) / (r * W) - beta * h); t += h; }
    out.push([next, c]); next += dt;
  }
  return out;
}

export function alcLevelAt(doses, t, p) { const s = alcSeries(doses, t, t, p); return s.length ? s[0][1] : 0; }

/** Zeitpunkt, ab dem wieder ~0,0 ‰ (unter 0,01) – auf 5 min gerundet; null, wenn ab from nichts mehr im Blut. */
export function alcSober(doses, from, p) {
  const s = alcSeries(doses, from, from + 36, p, 1 / 12);
  let last = null; s.forEach(([t, c]) => { if (c >= 0.01) last = t; });
  return last == null ? null : Math.ceil((last + 1 / 12) * 12) / 12;
}

/** Höchstwert [t, ‰] im Bereich t0…t1. */
export function alcPeak(doses, t0, t1, p) {
  let pk = [t0, 0];
  for (const q of alcSeries(doses, t0, t1, p, 1 / 12)) if (q[1] > pk[1]) pk = q;
  return pk;
}

export const alcFmt = (v) => (Math.round(v * 100) / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
