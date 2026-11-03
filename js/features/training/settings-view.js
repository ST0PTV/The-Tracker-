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
import { backLink, sec, list, row, switchRow, segRow, actionRow } from '../../core/setui.js';

const save = (patch) => {
  if (store.set('settings', { ...store.get('settings'), ...patch })) return true;
  toast('Speichern fehlgeschlagen.', { error: true });
  return false;
};


const cardInfo = (title, short, details = []) => () =>
  openSheet(infoBody({ short, details: details.map((t) => h('p', { class: 'muted small' }, t)) }), { title });

export function trainingSettingsView(rerender) {
  const settings = store.get('settings');
  // 0.4.2: im Muster der Einstellungsseiten (core/setui.js); Stepper aus dem Workout-Tracker bleiben
  const sw = (title, key, sub = '') => switchRow({ title, sub, on: settings[key] !== false, set: (v) => { save({ [key]: v }); rerender(); } });
  return h('div', {},
    backLink(),
    pageHead('Training', 'Pause, Scheiben, Geräte und Anzeige.'),
    sec('Training', ['Training', cardInfo('Training', [
      'Pause: gilt für Übungen ohne eigene Pause. Der Timer läuft ohne Ton und ohne Alarm.',
      'Bildschirm anlassen: nur während eines Trainings, kostet etwas Akku.',
      'Scheiben: bei Langhantel-Übungen; die Stange ist pro Übung im Editor änderbar. Eingetragen wird das Gesamtgewicht.'
    ])]),
    list(row({ title: 'Pause', right: stepper({
        value: settings.restSeconds,
        format: formatDuration,
        label: 'Standard-Pause',
        onStep: (v, d) => { const next = stepRest(v, d); return save({ restSeconds: next }) ? next : null; }
      }) }),
      sw('Karte auf „Heute“', 'todayCard'),
      sw('Bildschirm anlassen', 'keepAwake', wakeLockSupported() ? 'nur während eines Trainings' : 'auf diesem Gerät ohne Wirkung'),
      sw('Scheiben pro Seite', 'plateMath'),
      settings.plateMath !== false ? row({ title: 'Stange', right: stepper({
        value: settings.barKg ?? 20,
        format: (v) => `${fmtNum(v)} kg`,
        label: 'Standard-Stange',
        onStep: (v, d) => { const next = Math.max(BAR_KG_MIN, Math.min(BAR_KG_MAX, v + d * 2.5)); return save({ barKg: next }) ? next : null; }
      }) }) : null),
    sec('Mein Equipment', ['Mein Equipment', cardInfo('Mein Equipment', [
      'Grenzt den Startpool auf passende Übungen ein.',
      'Körpergewicht ohne Zubehör ist immer dabei.',
      'Bereits übernommene Übungen bleiben unverändert.'
    ])]),
    list(h('div', { class: 'st-pad' }, gearPicker())),
    sec('Anzeige'),
    list(segRow({ title: 'Figur', aria: 'Figur', options: [['auto', 'Wie Profil'], ['male', 'Männlich'], ['female', 'Weiblich']], value: settings.figureChoice,
        sub: settings.figureChoice === 'auto' ? `${settings.figure === 'female' ? 'weiblich' : 'männlich'} – aus „Schlaf & Körper“` : '',
        set: (k) => { if (save({ figureChoice: k })) rerender(); } }),
      sw('Hinweise anzeigen', 'hints'),
      actionRow({ title: 'Begriffe', onClick: openGlossary })));
}
