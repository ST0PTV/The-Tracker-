// Gewichtsziel: Zielgewicht + Zieldatum → tägliches Kalorienziel = Erhaltungsbedarf ± Energie für die Gewichtsänderung.
// Aus Calorie-Tracker 2.3.1, js/weightgoal.js (ST0PTV, MIT): Rechnung unverändert, Zustand als Parameter statt global.
//
// Modell und Schwächen (Quellen aus dem Calorie-Tracker übernommen, hier nicht neu geprüft → „Unverified 0.1.6“):
// - Faustregel 7.700 kcal pro kg („3.500-kcal-Regel“ pro Pfund). Sie überschätzt die Änderung über längere Zeit, weil
//   sich der Verbrauch mitverändert (Thomas et al. 2013). Deshalb wird bei jedem neuen Gewicht neu gerechnet
//   (Schalter „automatisch anpassen“). Datum und kcal sind Schätzungen.
// - Tempo: Abnahme ~0,5–1 % des Körpergewichts pro Woche, um Muskulatur zu erhalten (Helms et al. 2014; NHS 0,5–1 kg);
//   Zunahme ~0,25–0,5 %/Woche bei Krafttraining (Iraki et al. 2019). Schneller lässt die App nicht zu.
// - Untergrenze ohne fachliche Begleitung: Frauen 1.200, Männer 1.500 kcal (Harvard Health), aus profile.kcalFloor.
// - Grundumsatz-Schätzung nach DGE/Verbraucherzentrale (Müller et al. 2004): Mittelwert vieler Menschen,
//   im Einzelfall oft 10 % und mehr daneben. Ohne Geschlecht Mittel beider Formeln.
// - Erhaltungsbedarf von der Uhr wird von Hand eingetragen (kein Apple Health); Uhren schätzen den Verbrauch oft zu hoch.
import { kcalFloor } from '../../core/profile.js';
import { addDays } from '../../core/format.js';

export const WG_KCAL_PER_KG = 7700;
// Tempo in % des Körpergewichts pro Woche; „fast“ = Obergrenze der App
export const WG_RATE = { lose: { slow: 0.5, rec: 0.75, fast: 1 }, gain: { slow: 0.25, rec: 0.35, fast: 0.5 } };
export const WG_MAX = { lose: 1, gain: 0.5 };
export const WG_TEMPO = [['slow', 'Gemächlich'], ['rec', 'Empfohlen'], ['fast', 'Zügig']];
export const WG_PAL = [[1.4, 'sitzend'], [1.6, 'gemischt'], [1.8, 'viel auf den Beinen'], [2.0, 'körperlich schwer']];
export const WG_SRC = [['watch', 'Von der Uhr'], ['bmr', 'Grundumsatz'], ['est', 'Schätzen']];

export const r10 = (v) => Math.round(v / 10) * 10;
export const pct2 = (v) => (Math.round(v * 100) / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const de0 = (v) => Math.round(v).toLocaleString('de-DE');
export const wgDateFmt = (iso, now = new Date()) => new Date(iso + 'T12:00:00').toLocaleDateString('de-DE',
  { day: 'numeric', month: 'short', year: iso.slice(0, 4) !== String(now.getFullYear()) ? 'numeric' : undefined });

export function wgDays(from, to) { return Math.round((new Date(to + 'T12:00:00') - new Date(from + 'T12:00:00')) / 864e5); }
export const ageOf = (birthYear, now = new Date()) => (birthYear ? now.getFullYear() - birthYear : null);

/** Grundumsatz (kcal/Tag) nach DGE-Formel; null ohne Gewicht oder Alter. */
export function wgBmrEst(w, sex, age) {
  if (!w || age == null) return null;
  const f = (0.047 * w - 0.01452 * age + 3.21) * 239, m = f + 1.009 * 239;
  return Math.round(sex === 'm' ? m : sex === 'f' ? f : (f + m) / 2);
}
export function wgPalTotal(o) { return Math.round(((o.pal || 1.4) + (o.sport ? 0.3 : 0)) * 100) / 100; }

/** Erhaltungsbedarf je nach Quelle; ctx = { sex, age }. */
export function wgMaint(o, w, ctx = {}) {
  if (o.src === 'bmr') return o.bmr ? Math.round(o.bmr * wgPalTotal(o)) : null;
  if (o.src === 'est') { const b = wgBmrEst(w, ctx.sex, ctx.age); return b ? Math.round(b * wgPalTotal(o)) : null; }
  return o.maint || null;
}

/** Tempo-Vorschläge ab heute (gemächlich / empfohlen / zügig) mit Datum und kcal. ctx = { sex, age, today }. */
export function wgOptions(w, o, ctx) {
  const maint = wgMaint(o, w, ctx);
  if (!w || !o.target || !maint) return null;
  const dkg = o.target - w;
  if (Math.abs(dkg) < 0.3) return { keep: true, maint };
  const dir = dkg < 0 ? 'lose' : 'gain', floor = kcalFloor(ctx.sex);
  return { dir, dkg, maint, floor, list: WG_TEMPO.map(([k, l]) => {
    const kgw = WG_RATE[dir][k] * w / 100, days = Math.max(7, Math.ceil(Math.abs(dkg) / kgw * 7));
    const perDay = Math.sign(dkg) * kgw * WG_KCAL_PER_KG / 7;
    return { k, l, pct: WG_RATE[dir][k], days, date: addDays(ctx.today, days), perDay, goal: r10(maint + perDay), low: dir === 'lose' && maint + perDay < floor };
  }) };
}

/** Plan für Gewicht w und das Zieldatum in o; hält Tempo-Grenze und Untergrenze ein und erklärt beides. */
export function wgPlan(w, o, ctx) {
  const maint = wgMaint(o, w, ctx);
  if (!o || !o.target || !o.date || !w || !maint) return null;
  const days = wgDays(ctx.today, o.date);
  if (days < 1) return { past: true };
  const dkg = o.target - w;
  if (Math.abs(dkg) < 0.3) return { keep: true, days, dkg, maint, perDay: 0, goal: r10(maint), weekPct: 0, warn: [] };
  const dir = dkg < 0 ? 'lose' : 'gain', floor = kcalFloor(ctx.sex);
  const weekPct = Math.abs(dkg) / (days / 7) / w * 100;
  const warn = [];
  let perDay = dkg * WG_KCAL_PER_KG / days, tooFast = false, earliest = null, floorHit = false, reach = null;
  if (weekPct > WG_MAX[dir] + 1e-9) {
    tooFast = true;
    const kgw = WG_MAX[dir] * w / 100;
    earliest = addDays(ctx.today, Math.ceil(Math.abs(dkg) / kgw * 7));
    perDay = Math.sign(dkg) * kgw * WG_KCAL_PER_KG / 7;
    warn.push(dir === 'lose'
      ? `Zu schnell: Bis ${wgDateFmt(o.date)} wären es ${pct2(weekPct)} % des Körpergewichts pro Woche. Gesund sind höchstens 1 % (NHS: 0,5–1 kg pro Woche) – sonst geht mehr Muskulatur verloren. Frühestens realistisch: ${wgDateFmt(earliest)}.`
      : `Zu schnell: Bis ${wgDateFmt(o.date)} wären es ${pct2(weekPct)} % des Körpergewichts pro Woche. Sinnvoll sind höchstens 0,5 % – mehr Zunahme ist überwiegend Fett. Frühestens realistisch: ${wgDateFmt(earliest)}.`);
  }
  let goal = maint + perDay;
  if (dir === 'lose' && goal < floor) {
    floorHit = true;
    const def = maint - floor;
    reach = def > 0 ? addDays(ctx.today, Math.ceil(Math.abs(dkg) * WG_KCAL_PER_KG / def)) : null;
    warn.push(`Das Kalorienziel läge bei ${de0(r10(goal))} kcal und damit unter ${de0(floor)} kcal – der Untergrenze ohne ärztliche bzw. ernährungstherapeutische Begleitung${ctx.sex ? '' : ' (Frauen 1.200, Männer 1.500 kcal; ohne Geschlechtsangabe gilt 1.200)'}. Es wird auf ${de0(floor)} kcal angehoben${reach ? `; das Ziel ist damit voraussichtlich am ${wgDateFmt(reach)} erreicht` : ''}.`);
    goal = floor;
  }
  goal = r10(goal);
  if (dir === 'lose' && goal < floor) goal = floor;
  return { days, dkg, dir, maint, perDay: goal - maint, goal, weekPct, tooFast, earliest, floorHit, floor, reach, warn };
}

/** Zieldatum aus dem gewählten Tempo (oder eigenem Datum); beim Halten 13 Wochen ab heute. */
export function wgDateFor(w, o, ctx) {
  const opts = wgOptions(w, o, ctx);
  if (!opts) return null;
  if (opts.keep) return o.date && wgDays(ctx.today, o.date) > 0 ? o.date : addDays(ctx.today, 91);
  if (o.tempo === 'custom') return o.date || null;
  return (opts.list.find((x) => x.k === (o.tempo || 'rec')) || opts.list[1]).date;
}

/**
 * Wochentrend: Mittel der letzten 7 Tage gegen die 7 Tage davor (glättet Tagesschwankungen durch Wasser und Essen).
 * log = [{ iso, kg }] aufsteigend. Gibt { avg, prev, diff } oder null (zu wenig Werte).
 */
export function weeklyTrend(log, today) {
  const win = (a, b) => log.filter((e) => e.iso > addDays(today, -a) && e.iso <= addDays(today, -b)).map((e) => e.kg);
  const cur = win(7, 0), prev = win(14, 7);
  if (!cur.length) return null;
  const mean = (l) => l.reduce((s, v) => s + v, 0) / l.length;
  const avg = mean(cur);
  return { avg, prev: prev.length ? mean(prev) : null, diff: prev.length ? avg - mean(prev) : null };
}

// Quellen wie im Calorie-Tracker angegeben (nur Autor/Jahr; nicht neu geprüft, keine Links aus dem Gedächtnis)
export const WG_REFS = [
  ['NHS – Abnehmen: 0,5–1 kg pro Woche', null],
  ['Harvard Health – Untergrenze 1.200 / 1.500 kcal ohne fachliche Begleitung', null],
  ['Thomas et al. (2013) – 3.500-kcal-Regel überschätzt die Abnahme', null],
  ['Helms et al. (2014) – Abnahmetempo 0,5–1 % pro Woche', null],
  ['Iraki et al. (2019) – Zunahmetempo bei Krafttraining', null],
  ['DGE · Verbraucherzentrale · Müller et al. (2004) – Grundumsatz-Formel, PAL', null]
];
