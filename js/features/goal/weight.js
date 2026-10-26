// Gewicht eintragen und Gewichtsziel anwenden. Nach wgOnWeight und wgApplyGoal im Calorie-Tracker 2.3.1 (ST0PTV, MIT).
// Speicher nur über js/core/profile.js; das Kalorienziel gilt ab heute, frühere Tage bleiben unverändert.
import { getProfile, getGoals, setGoal, logWeight, currentWeight, getWeightGoal, todayISO } from '../../core/profile.js';
import { wgPlan, ageOf } from './weightgoal.js';

/** Kontext für die Rechnung: Geschlecht, Alter, heute. */
export function wgCtx(today = todayISO()) {
  const p = getProfile();
  return { sex: p.sex || null, age: ageOf(p.birthYear), today };
}

/** Kalorienziel ab heute setzen; Makro-Verteilung (Preset bzw. eigene Faktoren) bleibt, Gewicht ist das aktuelle. */
export function applyCalorieGoal(goal, today = todayISO()) {
  const cur = getGoals(today) || {};
  const preset = cur.preset || 'dge';
  setGoal({ from: today, goal, preset, pf: preset === 'custom' ? cur.pf : undefined, ff: preset === 'custom' ? cur.ff : undefined, weight: currentWeight(today) });
}

/**
 * Gewicht eintragen. Ist das Gewichtsziel an und „automatisch anpassen“ gesetzt, wird das Kalorienziel ab heute
 * mit den verbleibenden kg und Tagen neu gerechnet (nur bei einem Eintrag für heute).
 * Gibt eine Meldung für den Toast zurück.
 */
export function enterWeight(iso, kg, today = todayISO()) {
  const v = logWeight(iso, kg);
  const o = getWeightGoal();
  if (!o.on || !o.auto || iso !== today) return `${v.toLocaleString('de-DE')} kg eingetragen`;
  const p = wgPlan(v, o, wgCtx(today));
  if (!p || p.past) return `${v.toLocaleString('de-DE')} kg eingetragen`;
  applyCalorieGoal(p.goal, today);
  return `Kalorienziel ab heute ${p.goal.toLocaleString('de-DE')} kcal (Gewichtsziel)${p.tooFast || p.floorHit ? ' – an der Grenze, Zieldatum wohl nicht haltbar' : ''}`;
}
