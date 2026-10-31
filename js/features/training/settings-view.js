// „Ich → Training“: Einstellungen des Trainingsbereichs.
// Herkunft: settingsView in js/views.js des Workout-Trackers 3.14.0 (MIT, ST0PTV), zerlegt.
// Nicht übernommen: Backup (The Tracker bekommt ein eigenes), Erscheinung (gilt app-weit unter „Ich“),
// Tutorial (kommt am Ende für die ganze App), Zyklus (gehört dem Zyklus-Bereich), Versions-Info.
import { h } from './util.js';
import { icon } from './icons.js';
import * as store from './store.js';
import { toast } from './ui.js';
import { stepper, switchInput } from './controls.js';
import { stepRest, formatDuration } from './rest.js';
import { wakeLockSupported } from './device.js';
import { BAR_KG_MIN, BAR_KG_MAX } from './model.js';
import { fmtNum } from './input.js';
import { gearPicker } from './gear-view.js';
import { openSheet } from './sheet.js';
import { infoBody, cardHead } from './info.js';
import { openGlossary } from './glossary.js';
import { pageHead } from '../../core/ui.js';

const save = (patch) => {
  if (store.set('settings', { ...store.get('settings'), ...patch })) return true;
  toast('Speichern fehlgeschlagen.', { error: true });
  return false;
};

function onOff(label, key, rerender) {
  const cur = store.get('settings')[key] !== false;
  return h('label', { class: 'set-line' }, h('span', { class: 'set-label' }, label),
    switchInput(label, cur, (v) => { save({ [key]: v }); rerender(); }));
}

const cardInfo = (title, short, details = []) => () =>
  openSheet(infoBody({ short, details: details.map((t) => h('p', { class: 'muted small' }, t)) }), { title });

export function trainingSettingsView(rerender) {
  const settings = store.get('settings');
  const labeled = (label, el) => h('div', { class: 'set-line' }, h('span', { class: 'set-label' }, label), el);
  return h('div', {},
    h('a', { class: 'back', href: '#/ich' }, icon('chevron', { size: 16, cls: 'flip' }), 'Ich'),
    pageHead('Training', 'Pause, Scheiben, Geräte und Anzeige.'),
    h('div', { class: 'card' },
      cardHead('Training', cardInfo('Training', [
        'Pause: gilt für Übungen ohne eigene Pause. Der Timer läuft ohne Ton und ohne Alarm.',
        'Bildschirm anlassen: nur während eines Trainings, kostet etwas Akku.',
        'Scheiben: bei Langhantel-Übungen; die Stange ist pro Übung im Editor änderbar. Eingetragen wird das Gesamtgewicht.'
      ])),
      labeled('Pause', stepper({
        value: settings.restSeconds,
        format: formatDuration,
        label: 'Standard-Pause',
        onStep: (v, d) => { const next = stepRest(v, d); return save({ restSeconds: next }) ? next : null; }
      })),
      onOff('Bildschirm anlassen', 'keepAwake', rerender),
      wakeLockSupported() ? null : h('p', { class: 'muted small' }, 'Auf diesem Gerät ohne Wirkung.'),
      onOff('Scheiben pro Seite', 'plateMath', rerender),
      settings.plateMath !== false ? labeled('Stange', stepper({
        value: settings.barKg ?? 20,
        format: (v) => `${fmtNum(v)} kg`,
        label: 'Standard-Stange',
        onStep: (v, d) => { const next = Math.max(BAR_KG_MIN, Math.min(BAR_KG_MAX, v + d * 2.5)); return save({ barKg: next }) ? next : null; }
      })) : null),
    h('div', { class: 'card' },
      cardHead('Mein Equipment', cardInfo('Mein Equipment', [
        'Grenzt den Startpool auf passende Übungen ein.',
        'Körpergewicht ohne Zubehör ist immer dabei.',
        'Bereits übernommene Übungen bleiben unverändert.'
      ])),
      gearPicker()),
    h('div', { class: 'card' },
      cardHead('Anzeige'),
      h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Figur' },
        [['auto', 'Wie Profil'], ['male', 'Männlich'], ['female', 'Weiblich']].map(([k, label]) => {
          const on = settings.figureChoice === k;
          return h('button', { type: 'button', role: 'radio', class: on ? 'on' : '', 'aria-checked': String(on), onclick: () => {
            if (on) return;
            if (save({ figureChoice: k })) rerender();
          } }, label);
        })),
      settings.figureChoice === 'auto' ? h('p', { class: 'muted small' }, `Figur: ${settings.figure === 'female' ? 'weiblich' : 'männlich'} – aus „Schlaf & Körper“.`) : null,
      onOff('Hinweise anzeigen', 'hints', rerender),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn', type: 'button', onclick: openGlossary }, 'Begriffe'))));
}
