// „Ich → Schlaf & Körper“: Geschlecht, Geburtsjahr, Größe, Gewicht, Bett- und Aufstehzeit an einer Stelle.
// Nach der Seite „Schlaf & Körper“ im Calorie-Tracker (ST0PTV, MIT). Speicher nur über js/core/profile.js;
// ein neues Gewicht läuft über enterWeight (Verlauf + automatische Anpassung des Gewichtsziels).
import { h } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { toast, pageHead } from '../../core/ui.js';
import { num, r1, isoDate } from '../../core/format.js';
import { getProfile, setProfile, getSleep, currentWeight } from '../../core/profile.js';
import { enterWeight } from '../goal/weight.js';

const SEXES = [['f', 'Frau'], ['m', 'Mann'], [null, 'Keine Angabe']];

export function bodyView(rerender) {
  const p = getProfile();
  const sl = getSleep();
  const today = isoDate();
  let sex = p.sex || null;
  const sexSeg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Geschlecht' });
  const drawSex = () => sexSeg.replaceChildren(...SEXES.map(([k, l]) => h('button', {
    type: 'button', role: 'radio', 'aria-checked': k === sex ? 'true' : 'false', onclick: () => { sex = k; drawSex(); }
  }, l)));
  drawSex();
  const inp = (label, value, ph, mode = 'numeric') => h('input', { class: 'input', type: 'text', inputmode: mode, value: value ?? '', placeholder: ph, 'aria-label': label });
  const birth = inp('Geburtsjahr', p.birthYear, 'z. B. 1995');
  const height = inp('Körpergröße', p.heightCm, 'z. B. 175');
  const w0 = currentWeight(today);
  const weight = inp('Körpergewicht', w0 != null ? r1(w0) : '', 'z. B. 72,5', 'decimal');
  const bed = h('input', { class: 'input', type: 'time', value: sl.bed, 'aria-label': 'Bettzeit' });
  const wake = h('input', { class: 'input', type: 'time', value: sl.wake, 'aria-label': 'Aufstehen' });
  const field = (label, el, hint = null) => h('label', { class: 'form-label' }, h('span', {}, label), el, hint ? h('small', { class: 'form-hint' }, hint) : null);

  const save = () => {
    const by = num(birth.value), cm = num(height.value), kg = num(weight.value);
    const year = new Date().getFullYear();
    if (by != null && !(by >= 1900 && by <= year - 14)) { toast(`Bitte ein Geburtsjahr zwischen 1900 und ${year - 14} eintragen (oder leer lassen).`, { error: true }); return; }
    if (cm != null && !(cm >= 120 && cm <= 230)) { toast('Bitte eine Körpergröße zwischen 120 und 230 cm eintragen (oder leer lassen).', { error: true }); return; }
    if (kg != null && !(kg >= 30 && kg <= 300)) { toast('Bitte ein Gewicht zwischen 30 und 300 kg eintragen.', { error: true }); return; }
    if (!bed.value || !wake.value) { toast('Bitte Bett- und Aufstehzeit wählen.', { error: true }); return; }
    setProfile({ sex, birthYear: by != null ? Math.round(by) : null, heightCm: cm != null ? Math.round(cm) : null, bed: bed.value, wake: wake.value });
    let msg = 'Gespeichert';
    if (kg != null && (w0 == null || Math.round(kg * 10) !== Math.round(w0 * 10))) msg = enterWeight(today, kg);
    toast(msg);
    rerender();
  };

  return h('div', {},
    h('a', { class: 'back', href: '#/ich' }, icon('chevron', { size: 16, cls: 'flip' }), 'Ich'),
    pageHead('Schlaf & Körper', 'Für Untergrenze, Makros, Grundumsatz, Alkohol-Schätzung und die Schlafzeit in den Kurven.'),
    h('h3', { class: 'sec' }, 'Körper'),
    h('section', { class: 'card' },
      h('span', { class: 'label' }, 'Geschlecht'), sexSeg,
      h('div', { class: 'two' }, field('Geburtsjahr', birth), field('Größe (cm)', height)),
      field('Gewicht heute (kg)', weight, 'Ein neuer Wert landet im Gewichtsverlauf (wie über die Gewichtskarte).')),
    h('h3', { class: 'sec' }, 'Schlaf'),
    h('section', { class: 'card' },
      h('div', { class: 'two' }, field('Bettzeit', bed), field('Aufstehen', wake)),
      h('small', { class: 'form-hint' }, 'Grau hinterlegt in den Koffein- und Alkohol-Kurven; das Koffein-Ziel gilt zur Bettzeit.')),
    h('button', { class: 'btn primary block', type: 'button', onclick: save }, 'Speichern'));
}
