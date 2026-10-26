// Einstellungen der Getränke-Tracker, je eine Seite unter „Ich“: Wasser (an/aus, Ziel, „+“-Menge), Koffein (an/aus,
// Halbwertszeit, Bettzeit-Ziel, Richtwert) und Alkohol (an/aus, Abbau; nach alcSettingsHtml im Calorie-Tracker 2.3.1). Nach caffSettingsHtml und den Wasser-Einstellungen im Kalorien-Tracker (ST0PTV/JuliaKelp, MIT).
import { h } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { toast, pageHead } from '../../core/ui.js';
import { infoBtn } from '../../core/info.js';
import { num, r1 } from '../../core/format.js';
import { waterSettings, setWaterSettings } from './water.js';
import { caffSettings, setCaffSettings } from './caffeine.js';
import { caffInfo } from './caffeine-card.js';
import { alcSettings, setAlcSettings } from './alcohol.js';
import { alcInfo } from './alcohol-card.js';
import { waterInfo } from './water-card.js';

function toggle(label, on, set) {
  const inp = h('input', { type: 'checkbox', 'aria-label': label });
  inp.checked = !!on;
  inp.addEventListener('change', () => set(inp.checked));
  return h('label', { class: 'check-row' }, inp, h('span', {}, label));
}

/** Zahlenfeld: speichert bei Änderung, wenn der Wert im Bereich liegt; sonst Hinweis und alter Wert. */
function numField(label, value, { lo, hi, unit, dec = false, set }) {
  const dp = dec === true ? 1 : dec || 0; // Nachkommastellen
  const show = (v) => (dp ? v.toLocaleString('de-DE', { maximumFractionDigits: dp, useGrouping: false }) : String(Math.round(v)));
  const inp = h('input', { class: 'input', type: 'text', inputmode: dec ? 'decimal' : 'numeric', value: show(value), 'aria-label': label });
  inp.addEventListener('change', () => {
    const v = num(inp.value);
    if (v == null || v < lo || v > hi) { toast(`Bitte einen Wert zwischen ${show(lo)} und ${show(hi)} ${unit} eingeben.`, { error: true }); inp.value = show(value); return; }
    value = Math.round(v * 10 ** dp) / 10 ** dp;
    set(value); toast('Gespeichert');
  });
  return h('label', { class: 'form-label' }, h('span', {}, `${label} (${unit})`), inp);
}


const back = () => h('a', { class: 'back', href: '#/ich' }, icon('chevron', { size: 16, cls: 'flip' }), 'Ich');

/** „Ich → Wasser“ */
export function waterSettingsView() {
  const w = waterSettings();
  return h('div', {}, back(),
    pageHead('Wasser', 'Karte und „+“ unter „Heute“.'),
    h('section', { class: 'card' },
      h('div', { class: 'card-head' }, h('h2', {}, 'Wasser'), infoBtn('Wasser', waterInfo)),
      toggle('Wasser-Karte anzeigen', w.enabled, (v) => setWaterSettings({ enabled: v })),
      h('div', { class: 'two' },
        numField('Tagesziel', w.goal, { lo: 500, hi: 6000, unit: 'ml', set: (v) => setWaterSettings({ goal: v }) }),
        numField('„+“ trägt ein', w.step, { lo: 50, hi: 1000, unit: 'ml', set: (v) => setWaterSettings({ step: v }) })),
      h('p', { class: 'small muted' }, 'Standard 1,5 l (DGE). Koffein-Getränke und Getränke aus dem Journal zählen mit, wenn sie so markiert sind.')));
}

/** „Ich → Koffein“ (Bett- und Aufstehzeit stehen unter „Schlaf & Körper“) */
export function caffSettingsView() {
  const c = caffSettings();
  return h('div', {}, back(),
    pageHead('Koffein', 'Karte, Kurve und Richtwerte.'),
    h('section', { class: 'card' },
      h('div', { class: 'card-head' }, h('h2', {}, 'Koffein'), infoBtn('Koffein', caffInfo)),
      toggle('Koffein-Karte anzeigen', c.enabled, (v) => setCaffSettings({ enabled: v })),
      h('div', { class: 'two' },
        numField('Halbwertszeit', c.halfLife, { lo: 1.5, hi: 12, unit: 'h', dec: true, set: (v) => setCaffSettings({ halfLife: v }) }),
        numField('Ziel zur Bettzeit', c.threshold, { lo: 10, hi: 200, unit: 'mg', set: (v) => setCaffSettings({ threshold: v }) })),
      numField('Richtwert pro Tag', c.limit, { lo: 50, hi: 1000, unit: 'mg', set: (v) => setCaffSettings({ limit: v }) }),
      h('p', { class: 'small muted' }, `Bettzeit ${c.bed} · Aufstehen ${c.wake} – `, h('a', { class: 'link', href: '#/ich/koerper' }, 'unter „Schlaf & Körper“ ändern')),
      h('p', { class: 'small muted' }, 'Standard: 5 h, 50 mg, 400 mg (EFSA). Alles im ⓘ erklärt; die Pegel sind Schätzungen.')));
}

/** „Ich → Alkohol“ */
export function alcSettingsView() {
  const a = alcSettings();
  return h('div', {}, back(),
    pageHead('Alkohol', 'Im „+“-Menü; die Karte erscheint mit dem ersten Eintrag.'),
    h('section', { class: 'card' },
      h('div', { class: 'card-head' }, h('h2', {}, 'Alkohol'), infoBtn('Alkohol', () => alcInfo())),
      toggle('Alkohol im „+“-Menü (Karte erscheint mit dem ersten Eintrag)', a.enabled, (v) => setAlcSettings({ enabled: v })),
      numField('Abbau', a.beta, { lo: 0.05, hi: 0.35, unit: '‰/h', dec: 2, set: (v) => setAlcSettings({ beta: Math.round(v * 100) / 100 }) }),
      h('p', { class: 'small muted' }, 'Standard 0,15 ‰/h (Spanne etwa 0,10–0,20). Gewicht, Größe und Geschlecht kommen aus „Schlaf & Körper“. Grobe Schätzung – nicht geeignet, um die Fahrtüchtigkeit zu beurteilen.')));
}
