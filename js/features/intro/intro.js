// Einführung (0.5.0): Rundgang durch die ganze App und Probetraining – Zustand und Schritte, ohne DOM (mit Node getestet).
// Nach Workout-Tracker/js/tutorial.js 3.14 (MIT, ST0PTV), erweitert auf alle Bereiche von The Tracker.
// Texte beschreiben nur die Bedienung (keine Studienaussagen); kein Druck, keine Belohnung, alles überspringbar.
import * as store from '../../core/store.js';

store.define('intro', { tour: null, trial: null, welcome: true, tips: {}, hints: true });
// tour/trial: null | 'done' | 'skipped'; welcome: Karte auf „Heute“; tips: gesehene Tipps { id: true }; hints: Tipps an (0.5.1)

export const introState = () => {
  const s = store.get('intro');
  const ok = (v) => (v === 'done' || v === 'skipped' ? v : null);
  return { tour: ok(s.tour), trial: ok(s.trial), welcome: s.welcome !== false,
    tips: s.tips && typeof s.tips === 'object' && !Array.isArray(s.tips) ? { ...s.tips } : {}, hints: s.hints !== false };
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
    body: 'Oben stehen Kalorien und Makros des Tages, darunter die Karten deiner Tracker. Über den Wochenstreifen und den Kalender wechselst du den Tag.' },
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

// 0.5.1: einmalige Tipps im Training (aus Workout-Tracker/js/tutorial.js 3.14, TIPS; MIT, ST0PTV): pro Bildschirm
// höchstens einer, erst nach dem Rundgang, abschaltbar unter „Ich → Einführung“. Pfade an The Tracker angepasst.
export const TIPS = [
  { id: 'training-more', route: '/training', target: ['#view button.dots'], body: 'Über ⋯ trägst du ein Training nach oder legst eine leichte Woche ein.' },
  { id: 'session-setnum', route: '/training', target: ['#view .setrow .sn'], body: 'Tippe auf die Satznummer, um einen Satz als Aufwärm-, Drop- oder Rest-Pause-Satz zu markieren.' },
  { id: 'plans-analyse', route: '/training/plaene', target: ['#view .plans-ana'], body: 'Prüft deine Pläne auf Balance, Sätze pro Muskel und Dauer – mit Vorschlägen zum Übernehmen.' },
  { id: 'plans-routines', route: '/training/plaene', target: ['#view [role=tab]'], match: 'Routinen', body: 'Unter „Routinen“ findest du Aufwärmen, Cool-down und Mobility – auch ohne Plan startbar.' },
  { id: 'progress-4w', route: '/training/fortschritt', target: ['#view [role=tab]'], match: '4 Wochen', body: 'Unter „4 Wochen“ siehst du, welche Muskeln du zuletzt mehr oder weniger trainiert hast.' }
];

/** Tipps erst nach dem Rundgang (gesehen oder übersprungen) und nur, wenn sie an sind. */
export const tipsAllowed = (state) => state.hints && state.tour !== null;

/** Noch nicht gesehene Tipps eines Bildschirms in Reihenfolge. */
export function pendingTips(route, state) {
  if (!tipsAllowed(state)) return [];
  return TIPS.filter((t) => t.route === route && !state.tips[t.id]);
}
export const markTip = (id) => store.update('intro', (s) => { s.tips = { ...(s.tips && typeof s.tips === 'object' ? s.tips : {}), [id]: true }; });
export const resetTips = () => store.update('intro', (s) => { s.tips = {}; });

/** Willkommenskarte auf „Heute“: nur für neue Nutzer (noch kein Rundgang, keine Einträge, nicht ausgeblendet). */
export function showWelcome(state, hasData) {
  return state.welcome && state.tour === null && !hasData;
}
