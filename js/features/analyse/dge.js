// DGE-Referenzwerte (D-A-CH) für die acht Mikronährstoffe aus dem BLS und die Rechnung „reich an dem, was fehlt“.
// Rein (ohne Speicher und DOM, mit Node getestet). Herkunft: DGE-Tabelle, microRatio und microBonus in app.js im
// Rezeptbuch (Copyright (c) 2026 JuliaKelp, MIT). Nutzerentscheidung 2026-10-31: Bezugswerte DGE nach Alter und
// Geschlecht; ein Mangel kommt nur aus ärztlicher Diagnose (die Person trägt ihn selbst ein, die App schlägt nichts vor).
//
// STATUS: am 2026-10-31 auf dge.de geprüft (Tabellen der Referenzwert-Seiten und FAQ, per Websuche abgerufen):
// Eisen 2023 (Frauen ab 65 immer 14 mg; ohne Regelblutung, auch bei Pille ohne Pause, 11 mg), Magnesium 2021,
// Zink 2019, Calcium 2013, Vitamin B12 2018, Folat 300 µg, Jod 2025 (150 µg ab 13 Jahren), Vitamin D 20 µg (2012).
// Schwächen: Altersgruppen ab 15 Jahren (jüngere haben eigene Werte), Schwangerschaft und Stillzeit nicht abgebildet;
// „ohne Regelblutung“ ab 51 Jahren als „nach den Wechseljahren“ gewertet (Annahme); Zink nur für mittlere Phytatzufuhr.
// Referenzwerte gelten für Gesunde und reichen laut DGE nicht, um einen Mangel auszugleichen – nur Orientierung.

export const DGE = {
  fe: { name: 'Eisen', unit: 'mg', kind: 'Empfehlung', year: 2023, url: 'https://www.dge.de/wissenschaft/referenzwerte/eisen/',
    ref: ({ male, age, cycle, post }) => (male ? 11 : post || age >= 65 ? 14 : cycle === 'no' ? 11 : 16),
    note: ({ male, age, cycle, post }) => (male ? '' : post || age >= 65 ? 'nach den Wechseljahren' : cycle === 'no' ? 'ohne Regelblutung' : 'mit Regelblutung') },
  mg: { name: 'Magnesium', unit: 'mg', kind: 'Schätzwert', year: 2021, url: 'https://www.dge.de/wissenschaft/referenzwerte/magnesium/',
    ref: ({ male, age }) => (age < 19 ? (male ? 330 : 260) : (male ? 350 : 300)) },
  b12: { name: 'Vitamin B12', unit: 'µg', kind: 'Schätzwert', year: 2018, url: 'https://www.dge.de/wissenschaft/referenzwerte/vitamin-b12/',
    ref: () => 4 },
  zn: { name: 'Zink', unit: 'mg', kind: 'Empfehlung', year: 2019, url: 'https://www.dge.de/wissenschaft/referenzwerte/zink/',
    ref: ({ male, age }) => (age < 19 ? (male ? 14 : 11) : (male ? 14 : 8)),
    note: ({ male, age }) => (age < 19 ? '' : `mittlere Phytatzufuhr; ${male ? '11 bis 16' : '7 bis 10'} mg je nach Phytat`) },
  ca: { name: 'Calcium', unit: 'mg', kind: 'Empfehlung', year: 2013, url: 'https://www.dge.de/wissenschaft/referenzwerte/calcium/',
    ref: ({ age }) => (age < 19 ? 1200 : 1000) },
  fol: { name: 'Folat', unit: 'µg', kind: 'Empfehlung', year: 2015, url: 'https://www.dge.de/wissenschaft/referenzwerte/folat/',
    ref: () => 300, note: () => 'Folat-Äquivalente' },
  vd: { name: 'Vitamin D', unit: 'µg', kind: 'Schätzwert', year: 2012, url: 'https://www.dge.de/wissenschaft/referenzwerte/vitamin-d/',
    ref: () => 20, note: () => 'ohne Bildung in der Haut durch Sonne' },
  jod: { name: 'Jod', unit: 'µg', kind: 'Empfehlung', year: 2025, url: 'https://www.dge.de/wissenschaft/referenzwerte/jod/',
    ref: () => 150 }
};
export const DGE_ORDER = ['fe', 'vd', 'b12', 'jod', 'ca', 'mg', 'zn', 'fol'];

/** Personenangaben für die Tabelle aus dem Profil: Geschlecht, Alter (ab 15; ohne Angabe 30), Regel, Wechseljahre. */
export function dgePerson({ sex, birthYear, cycle } = {}, { phase } = {}, year = new Date().getFullYear()) {
  const a = birthYear ? year - birthYear : null;
  const age = a >= 15 && a <= 120 ? a : 30;
  const male = sex === 'm';
  const post = !male && (phase === 'wechsel' || (cycle === 'no' && age >= 51));
  return { male, age, cycle: cycle || null, post };
}

export const dgeRef = (id, person) => DGE[id].ref(person);
export const dgeNote = (id, person) => (DGE[id].note ? DGE[id].note(person) : '');

/**
 * Wie reich ist ein Gericht an einem Nährstoff im Verhältnis zu seinen kcal?
 * (Anteil am DGE-Tageswert) ÷ (Anteil am Tages-kcal-Ziel). 1 = so viel, wie es für seine kcal „sein Teil“ wäre.
 * Fehlt der Wert für eine Zutat (miss_<id> > 0) oder hat das Gericht keine kcal → null (zählt nicht).
 */
export function richness(n, id, ref, kcalGoal) {
  if (!n || !(n.kcal > 0) || !(ref > 0) || !(kcalGoal > 0) || n['miss_' + id] > 0 || n[id] == null) return null;
  return (n[id] / ref) / (n.kcal / kcalGoal);
}

/** Bonus für die Auswahl: je Mangel (q − 1) begrenzt auf −1 … 2, mal 2 (wie im Rezeptbuch). */
export function deficitBonus(n, ids, person, kcalGoal) {
  let b = 0;
  for (const id of ids) {
    const q = richness(n, id, dgeRef(id, person), kcalGoal);
    if (q != null) b += Math.max(-1, Math.min(2, q - 1)) * 2;
  }
  return b;
}

/** Schilder „viel …“: Mängel, bei denen das Gericht mindestens 1,5× „seinen Teil“ liefert. */
export function richTags(n, ids, person, kcalGoal) {
  return ids.filter((id) => (richness(n, id, dgeRef(id, person), kcalGoal) || 0) >= 1.5).map((id) => DGE[id].name);
}

/** Tagesschnitt aus Nährwert-Summen mehrerer Tage: [{ id, name, unit, v, ref, pct }]. */
export function planAverage(dayTotals, ids, person) {
  const n = dayTotals.length;
  return ids.map((id) => {
    const v = n ? dayTotals.reduce((s, t) => s + (t[id] || 0), 0) / n : 0;
    const ref = dgeRef(id, person);
    return { id, name: DGE[id].name, unit: DGE[id].unit, v, ref, pct: Math.round((v / ref) * 100) };
  });
}
