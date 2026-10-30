// Ärztlich festgestellter Mangel (0.3.0): Zugriff und DGE-Werte für die aktuelle Person.
// Die Liste liegt im Profil (core/profile.js, Feld deficits); die Person trägt sie selbst ein, die App schlägt nichts vor.
// Rechnung in dge.js; Wechseljahre kommen aus den Zyklus-Einstellungen (Lebensphase).
import { getProfile, setProfile } from '../../core/profile.js';
import { cycleSettings } from '../cycle/cycle.js';
import { DGE, DGE_ORDER, dgePerson, dgeRef, deficitBonus, richTags } from './dge.js';

export const person = () => dgePerson(getProfile(), cycleSettings());
export const deficits = () => (getProfile().deficits || []).filter((id) => DGE[id]);
export function setDeficit(id, on) {
  if (!DGE[id]) return;
  const list = deficits().filter((x) => x !== id);
  setProfile({ deficits: on ? DGE_ORDER.filter((x) => x === id || list.includes(x)) : list });
}
/** DGE-Wert der aktuellen Person. */
export const refOf = (id) => dgeRef(id, person());
/** Bonus und Schilder für ein Gericht (Nährwerte n, Tagesziel kcal). */
export const bonusFor = (n, kcalGoal) => { const ids = deficits(); return ids.length ? deficitBonus(n, ids, person(), kcalGoal) : 0; };
export const tagsFor = (n, kcalGoal) => { const ids = deficits(); return ids.length ? richTags(n, ids, person(), kcalGoal) : []; };
