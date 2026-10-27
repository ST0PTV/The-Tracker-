// Magen-Modell (grobe Schätzung) – Rechnung, rein (mit Node getestet).
// Aus Calorie-Tracker 2.3.1, js/timeline.js (ST0PTV, MIT): Formel und Faktoren unverändert; Uhrzeit der Einträge
// über entryMin der App statt über Anlegezeit und eigene Mahlzeit-Zeiten. Der Plan-Vorschlag (Uhrzeiten und Portionen)
// ist bewusst nicht übernommen (Nutzerentscheidung 2026-10-26: in 0.2.0 nur die Tageskurve).
//
// Restanteil im Magen: 2^(−(t/T½)²) (Potenz-Exponential-Form). Mit T½ = 1,75 h ergibt das für ~250 kcal nach 1/2/4 h
// ≈ 80/40/3 % – innerhalb der Normalwerte der Szintigrafie (Abell et al. 2008: 37–90 / 30–60 / 0–10 %).
// Größere und fettreichere Mahlzeiten → längeres T½ (Annahme, Größenordnung nicht belegt); Getränke T½ 0,4 h.
// Frauen entleeren den Magen im Mittel langsamer (Datz 1987: Feststoffe T½ 92 vs. 60 min, n = 15/15;
// Caballero-Plasencia 1999, n = 200, kein Zyklusphasen-Effekt). Bewusst gedämpfter Faktor 0,9 / 1,1.
// Gültig höchstens für gesunde Erwachsene; Erkrankungen, Medikamente, Sport, Stress sind nicht berücksichtigt.

/** Faktor für T½ nach Geschlecht ('m' 0,9, 'f' 1,1, sonst 1). */
export const sexFactor = (sex) => (sex === 'm' ? 0.9 : sex === 'f' ? 1.1 : 1);

/**
 * Ereignisse eines Tages: Einträge derselben Mahlzeit, die höchstens 20 min auseinander liegen, werden zusammengefasst.
 * items = [{ meal, h (Stunden ab 0:00), kcal, f (g Fett), liq, name }]. Nur Einträge mit kcal > 0.
 */
export function stomachEvents(items) {
  const ev = [];
  items.filter((x) => x.kcal > 0).sort((a, b) => a.h - b.h).forEach((x) => {
    const g = ev.find((v) => v.meal === x.meal && Math.abs(v.h - x.h) <= 1 / 3);
    if (g) { g.kcal += x.kcal; g.f += x.f || 0; g.liq = g.liq && !!x.liq; g.names.push(x.name); }
    else ev.push({ meal: x.meal, h: x.h, kcal: x.kcal, f: x.f || 0, liq: !!x.liq, names: [x.name] });
  });
  return ev.sort((a, b) => a.h - b.h);
}

/** Halbwertszeit in Stunden: Getränke 0,4 h; sonst 1,75 h × Geschlecht × (kcal/250)^0,3 × (1 + 0,5 × Fettanteil), 0,75–4,5 h. */
export function halfLife(ev, sex) {
  const sf = sexFactor(sex);
  if (ev.liq) return 0.4 * sf;
  const fs = ev.kcal ? (ev.f * 9) / ev.kcal : 0;
  return Math.min(4.5, Math.max(0.75, 1.75 * sf * Math.pow(Math.max(ev.kcal, 50) / 250, 0.3) * (1 + 0.5 * fs)));
}

/** kcal eines Ereignisses, die zur Zeit t (Stunden) laut Modell noch im Magen sind. */
export function remain(ev, t, sex) {
  const dt = t - ev.h;
  return dt < 0 ? 0 : ev.kcal * Math.pow(2, -Math.pow(dt / halfLife(ev, sex), 2));
}

/** Summe aller Ereignisse zur Zeit t. */
export const stomachAt = (evs, t, sex) => evs.reduce((s, ev) => s + remain(ev, t, sex), 0);

/** Zeitpunkt, an dem das Ereignis zu 90 % entleert ist (t = T½ · √(log2 10) ≈ 1,82 T½). */
export const emptyAt = (ev, sex) => ev.h + Math.sqrt(Math.log2(10)) * halfLife(ev, sex);

/** Kurve [[t, kcal]] von t0 bis t1 in Schritten von dt (Stunden). */
export function stomachSeries(evs, t0, t1, sex, dt = 1 / 12) {
  const out = [];
  for (let t = t0; t <= t1 + 1e-9; t += dt) out.push([t, stomachAt(evs, t, sex)]);
  return out;
}
