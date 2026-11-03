// „Ich → Schlaf & Körper“: Geschlecht, Geburtsjahr, Größe, Gewicht, Bett- und Aufstehzeit an einer Stelle.
// Nach der Seite „Schlaf & Körper“ im Calorie-Tracker (ST0PTV, MIT). Speicher nur über js/core/profile.js;
// ein neues Gewicht läuft über enterWeight (Verlauf + automatische Anpassung des Gewichtsziels).
import { h } from '../../core/util.js';
import { toast, pageHead } from '../../core/ui.js';
import { isoDate } from '../../core/format.js';
import { backLink, sec, list, note, numRow, timeRow, segRow } from '../../core/setui.js';
import { getProfile, setProfile, getSleep, currentWeight } from '../../core/profile.js';
import { enterWeight } from '../goal/weight.js';

const SEXES = [['f', 'Frau'], ['m', 'Mann'], [null, 'Keine Angabe']];
const CYCLE = [['yes', 'Ja'], ['no', 'Nein']];

export function bodyView(rerender) {
  const p = getProfile();
  const sl = getSleep();
  const today = isoDate();
  const year = new Date().getFullYear();
  const save = (patch) => { setProfile(patch); rerender(); };
  const w0 = currentWeight(today);
  return h('div', {},
    backLink(),
    pageHead('Schlaf & Körper', 'Für Untergrenze, Makros, Grundumsatz, Alkohol-Schätzung und die Schlafzeit in den Kurven.'),
    sec('Körper'),
    list(segRow({ title: 'Geschlecht', options: SEXES, value: p.sex || null, set: (k) => save({ sex: k, cycle: k === 'm' ? null : p.cycle }) }),
      p.sex === 'm' ? null : segRow({ title: 'Hast du deine Regel?', sub: 'Bei „Ja“ erscheint der Zyklus: Karte auf „Heute“, Kalender, „Ich → Zyklus“.',
        options: CYCLE, value: p.cycle || null, set: (k) => save({ cycle: k }) }),
      numRow({ title: 'Geburtsjahr', value: p.birthYear, lo: 1900, hi: year - 14, unit: '', placeholder: 'z. B. 1995', empty: true, set: (v) => setProfile({ birthYear: v }) }),
      numRow({ title: 'Größe', value: p.heightCm, lo: 120, hi: 230, unit: 'cm', placeholder: 'z. B. 175', empty: true, label: 'Körpergröße', set: (v) => setProfile({ heightCm: v }) }),
      numRow({ title: 'Gewicht heute', value: w0, lo: 30, hi: 300, unit: 'kg', dec: true, placeholder: 'z. B. 72,5', label: 'Körpergewicht', set: (v) => { toast(enterWeight(today, v)); } })),
    note('Ein neues Gewicht landet im Gewichtsverlauf (wie über die Gewichtskarte).'),
    sec('Schlaf'),
    list(timeRow({ title: 'Bettzeit', value: sl.bed, set: (v) => setProfile({ bed: v }) }),
      timeRow({ title: 'Aufstehen', value: sl.wake, set: (v) => setProfile({ wake: v }) })),
    note('Grau hinterlegt in den Koffein- und Alkohol-Kurven; das Koffein-Ziel gilt zur Bettzeit.'));
}
