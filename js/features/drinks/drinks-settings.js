// Einstellungen der Getränke-Tracker, je eine Seite unter „Ich“: Wasser (an/aus, Ziel, „+“-Menge), Koffein (an/aus,
// Halbwertszeit, Bettzeit-Ziel, Richtwert) und Alkohol (an/aus, Abbau; nach alcSettingsHtml im Calorie-Tracker 2.3.1). Nach caffSettingsHtml und den Wasser-Einstellungen im Kalorien-Tracker (ST0PTV/JuliaKelp, MIT).
import { h } from '../../core/util.js';
import { pageHead } from '../../core/ui.js';
import { backLink, sec, list, note, switchRow, numRow, linkRow } from '../../core/setui.js';
import { waterSettings, setWaterSettings } from './water.js';
import { caffSettings, setCaffSettings } from './caffeine.js';
import { caffInfo } from './caffeine-card.js';
import { alcSettings, setAlcSettings } from './alcohol.js';
import { alcInfo } from './alcohol-card.js';
import { waterInfo } from './water-card.js';

/** „Ich → Wasser“ */
export function waterSettingsView(rerender) {
  const w = waterSettings();
  return h('div', {}, backLink(),
    pageHead('Wasser', 'Karte und „+“ unter „Heute“.'),
    sec('Wasser', ['Wasser', waterInfo]),
    list(switchRow({ title: 'Wasser tracken', on: w.enabled, set: (v) => { setWaterSettings({ enabled: v }); rerender(); } }),
      w.enabled ? numRow({ title: 'Tagesziel', value: w.goal, lo: 500, hi: 6000, unit: 'ml', set: (v) => setWaterSettings({ goal: v }) }) : null,
      w.enabled ? numRow({ title: '„+“ trägt ein', value: w.step, lo: 50, hi: 1000, unit: 'ml', set: (v) => setWaterSettings({ step: v }) }) : null),
    note('Standard 1,5 l (DGE). Koffein-Getränke und Getränke aus dem Journal zählen mit, wenn sie so markiert sind.'));
}

/** „Ich → Koffein“ (Bett- und Aufstehzeit stehen unter „Schlaf & Körper“) */
export function caffSettingsView(rerender) {
  const c = caffSettings();
  return h('div', {}, backLink(),
    pageHead('Koffein', 'Karte, Kurve und Richtwerte.'),
    sec('Koffein', ['Koffein', caffInfo]),
    list(switchRow({ title: 'Koffein tracken', on: c.enabled, set: (v) => { setCaffSettings({ enabled: v }); rerender(); } })),
    c.enabled ? [
      sec('Richtwerte'),
      list(numRow({ title: 'Halbwertszeit', value: c.halfLife, lo: 1.5, hi: 12, unit: 'h', dec: true, set: (v) => setCaffSettings({ halfLife: v }) }),
        numRow({ title: 'Ziel zur Bettzeit', value: c.threshold, lo: 10, hi: 200, unit: 'mg', set: (v) => setCaffSettings({ threshold: v }) }),
        numRow({ title: 'Richtwert pro Tag', value: c.limit, lo: 50, hi: 1000, unit: 'mg', set: (v) => setCaffSettings({ limit: v }) })),
      note('Standard: 5 h, 50 mg, 400 mg (EFSA). Alles im ⓘ erklärt; die Pegel sind Schätzungen.'),
      sec('Schlaf'),
      list(linkRow({ title: 'Bettzeit · Aufstehen', value: `${c.bed} · ${c.wake}`, href: '#/ich/koerper' })),
      note('Kommt aus „Schlaf & Körper“.')] : null);
}

/** „Ich → Alkohol“ */
export function alcSettingsView(rerender) {
  const a = alcSettings();
  return h('div', {}, backLink(),
    pageHead('Alkohol', 'Im „+“-Menü; die Karte erscheint mit dem ersten Eintrag.'),
    sec('Alkohol', ['Alkohol', () => alcInfo()]),
    list(switchRow({ title: 'Alkohol tracken', sub: 'Karte erscheint mit dem ersten Eintrag', on: a.enabled, set: (v) => { setAlcSettings({ enabled: v }); rerender(); } }),
      a.enabled ? numRow({ title: 'Abbau', value: a.beta, lo: 0.05, hi: 0.35, unit: '‰/h', dec: 2, set: (v) => setAlcSettings({ beta: Math.round(v * 100) / 100 }) }) : null),
    note('Standard 0,15 ‰/h (Spanne etwa 0,10–0,20). Gewicht, Größe und Geschlecht kommen aus „Schlaf & Körper“. Grobe Schätzung – nicht geeignet, um die Fahrtüchtigkeit zu beurteilen.'));
}
