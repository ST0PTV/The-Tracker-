// Einführung (0.5.0): Rundgang durch die ganze App und Probetraining – Zustand und Schritte, ohne DOM (mit Node getestet).
// Nach Workout-Tracker/js/tutorial.js 3.14 (MIT, ST0PTV), erweitert auf alle Bereiche von The Tracker.
// Texte beschreiben nur die Bedienung (keine Studienaussagen); kein Druck, keine Belohnung, alles überspringbar.
import * as store from '../../core/store.js';

store.define('intro', { tour: null, trial: null, welcome: true }); // tour/trial: null | 'done' | 'skipped'; welcome: Karte auf „Heute“

export const introState = () => {
  const s = store.get('intro');
  const ok = (v) => (v === 'done' || v === 'skipped' ? v : null);
  return { tour: ok(s.tour), trial: ok(s.trial), welcome: s.welcome !== false };
};
export const setIntro = (patch) => store.update('intro', (s) => Object.assign(s, patch));

// Ziel = Liste von CSS-Selektoren (das erste sichtbare gilt); match = sichtbarer Text, den das Ziel enthalten muss;
// fallback = Selektoren, falls das Ziel fehlt. Ohne Ziel steht die Blase mittig.
export const TOUR_STEPS = [
  { id: 'tabs', route: '/', target: ['#tabbar'], title: 'Vier Bereiche',
    body: 'Unten wechselst du zwischen Heute, Rezepten, Training und „Ich“ mit allen Einstellungen.' },
  { id: 'plus', route: '/', target: ['.tab-plus'], title: 'Eintragen',
    body: 'Das „+“ in der Mitte trägt Essen, Wasser, Koffein, Alkohol, Gewicht oder eine gespeicherte Mahlzeit ein – auch aus jedem anderen Bereich.' },
  { id: 'day', route: '/', target: ['#view .day-card', '#view .card'], title: 'Dein Tag',
    body: 'Oben stehen Kalorien und Makros des Tages, darunter die Karten deiner Tracker. Mit den Pfeilen blätterst du durch die Tage.' },
  { id: 'analyse', route: '/', target: ['#view [aria-label="Analyse"]', '#view .day-nav .icon-btn'], title: 'Analyse',
    body: 'Hier geht es zu Wochen, Monat, Mikronährstoffen und dem Magen-Modell mit Plan-Vorschlag. Alles sind Schätzungen.' },
  { id: 'recipes', route: '/rezepte', target: ['#view .rz-sub', '#view nav', '#view .card'], title: 'Rezepte',
    body: 'Vorschläge passend zu Ziel und Geschmack, Wochenplan, Einkaufsliste und Vorrat – mit „Snack: Was darf ich jetzt?“.' },
  { id: 'training', route: '/training', target: ['#view .tr-sub', '#view .card'], title: 'Training',
    body: 'Pläne, Übungen mit Technik-Animation und Fortschritt. Die Werte vom letzten Mal stehen beim Training schon drin.' },
  { id: 'today', route: '/ich', target: ['#view .me-row'], match: 'Heute anpassen', title: 'Anpassen',
    body: 'Unter „Ich“ legst du Ziele fest, schaltest Tracker an oder aus und ordnest die Karten auf „Heute“.' },
  { id: 'backup', route: '/ich', target: ['#view .me-row'], match: 'Daten & Backup', title: 'Daten sichern',
    body: 'Alles bleibt nur auf diesem Gerät. Hier erstellst du ab und zu ein Backup. Den Rundgang findest du unter „Einführung“ wieder.' }
];

// Probetraining: Schritte mit Bedingung („until“), dann geht es von selbst weiter. Ziele wie im Workout-Tracker.
export const TRIAL_STEPS = [
  { id: 'tick', target: ['#view .setrow:not(.done) .ck'], title: 'Satz abhaken',
    body: 'Gewicht und Wiederholungen vom letzten Mal stehen schon drin. Tippe den Haken.', until: 'rest' },
  { id: 'rest', target: ['.restbar'], title: 'Pause',
    body: 'Jetzt läuft die Pause. Mit −15 und +15 passt du sie an, das Kreuz beendet sie.', until: null },
  { id: 'next', target: ['[aria-label="Nächste Übung"]'], title: 'Nächste Übung',
    body: 'Hier geht es zur nächsten Übung. Vorher fragt die App kurz, wie es lief.', until: 'second' },
  { id: 'overview', target: ['#view .nav2 .btn'], match: 'Übersicht', title: 'Training beenden',
    body: 'In der Übersicht siehst du alle Übungen und beendest das Training.', until: 'finished' }
];

/** Willkommenskarte auf „Heute“: nur für neue Nutzer (noch kein Rundgang, keine Einträge, nicht ausgeblendet). */
export function showWelcome(state, hasData) {
  return state.welcome && state.tour === null && !hasData;
}
