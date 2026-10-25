// Wasser-Karte unter „Heute“: „+“ trägt die eingestellte Menge ein, Balken nach Herkunft, Liste aller Getränke.
// Nach waterCardHtml im Kalorien-Tracker (Rezeptbuch/tracker/js/app.js; ST0PTV/JuliaKelp, MIT).
import { h } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { toast } from '../../core/ui.js';
import { openInfo, infoBtn } from '../../core/info.js';
import { fmt, num } from '../../core/format.js';
import { waterSettings, waterRows, waterTotal, addWater, removeWater, restoreWater } from './water.js';
import { caffWaterRows, caffEntries } from './caffeine.js';
import { minToHm } from './caffeine-model.js';
import { openCaffeine } from './caffeine-card.js';

const litres = (ml) => (ml / 1000).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const KIND = { w: 'Wasser', c: 'aus Koffein', f: 'aus dem Journal' };

export function waterInfo() {
  openInfo({
    title: 'Wasser',
    body: [
      'Standardziel 1,5 l Getränke pro Tag – Richtwert der DGE für Erwachsene. Die EFSA nennt als angemessene Gesamtwasserzufuhr 2,0 l (Frauen) bzw. 2,5 l (Männer) pro Tag, inklusive Wasser aus Lebensmitteln (etwa ein Fünftel).',
      'Mitgezählt werden eigene Einträge, Koffein-Getränke mit „ml zum Wasser“ und flüssige Journal-Einträge mit „zählt zum Wasser“. Für Getränke aus dem Journal gilt 1 ml ≈ 1 g.',
      'Bei Hitze, Sport oder Krankheit kann der Bedarf deutlich höher sein. Ziel und „+“-Menge stellst du unter „Ich → Getränke“ ein.'
    ],
    src: [['DGE – Richtwerte für die Wasserzufuhr', 'https://www.dge.de/wissenschaft/referenzwerte/wasser/'], ['EFSA NDA Panel (2010). Dietary reference values for water. EFSA Journal 8(3):1459.', 'https://doi.org/10.2903/j.efsa.2010.1459']]
  });
}

export function waterCard(iso, today) {
  const W = waterSettings();
  if (!W.enabled) return null;
  const goal = W.goal || 1500, step = W.step || 250;
  const rows = waterRows(iso, caffWaterRows(iso));
  const ml = waterTotal(rows);
  const done = ml >= goal;
  const plus = h('button', { class: 'add-btn', type: 'button', 'aria-label': `${step} ml Wasser eintragen`, onclick: () => { addWater(iso, step); if (navigator.vibrate) navigator.vibrate(20); } }, icon('plus', { size: 22 }));
  const head = h('div', { class: 'tk-head' },
    h('div', {}, h('span', { class: 'tk-label' }, 'Wasser', infoBtn('Wasser', waterInfo)),
      h('div', { class: 'tk-big' }, litres(ml), h('small', {}, ` / ${litres(goal)} l`))),
    h('span', { class: `pill ${done ? 'ok' : ''}` }, done ? 'Ziel erreicht' : `noch ${litres(goal - ml)} l`), plus);
  const parts = ['w', 'c', 'f'].map((k) => [k, rows.filter((r) => r.kind === k).reduce((a, r) => a + r.ml, 0)]);
  const bar = h('div', { class: 'w-bar', role: 'img', 'aria-label': `${fmt(ml)} von ${fmt(goal)} ml` },
    ...parts.filter(([, v]) => v > 0).map(([k, v]) => h('i', { class: `w-${k}`, style: `width:${Math.min(100, (v / goal) * 100).toFixed(1)}%` })));

  const other = h('div', { class: 'code-row', hidden: true });
  const otherIn = h('input', { class: 'input', type: 'text', inputmode: 'numeric', placeholder: 'ml, z. B. 330', 'aria-label': 'Andere Menge in ml' });
  other.append(otherIn, h('button', { class: 'btn', type: 'button', onclick: () => {
    try { addWater(iso, num(otherIn.value)); } catch (e) { toast(e.message, { error: true }); }
  } }, 'Eintragen'));

  const list = rows.length ? h('div', { class: 'tk-rows' }, ...rows.map((r) => h('div', { class: 'tk-row' },
    h('span', { class: 'tk-time' }, r.min != null ? minToHm(r.min) : '–'),
    h('span', { class: 't' }, h('b', {}, r.n), r.kind !== 'w' ? h('small', {}, KIND[r.kind]) : null),
    h('span', { class: 'tk-v' }, h('b', {}, `${fmt(r.ml)} ml`)),
    r.kind === 'w'
      ? h('button', { class: 'icon-btn sm', type: 'button', 'aria-label': `${fmt(r.ml)} ml Wasser löschen`, onclick: () => {
        const gone = removeWater(iso, r.id);
        toast(`${fmt(r.ml)} ml gelöscht`, { action: { label: 'Rückgängig', onClick: () => restoreWater(iso, gone) } });
      } }, icon('close', { size: 14 }))
      : r.kind === 'c'
        ? h('button', { class: 'icon-btn sm', type: 'button', 'aria-label': 'Koffein-Getränk öffnen', onclick: () => openCaffeine(iso, caffEntries(iso).find((x) => x.id === r.id)) }, icon('chevron', { size: 14 }))
        : h('span', { class: 'icon-sp' })))) : null;

  return h('section', { class: 'card tk water' }, head, bar,
    list,
    h('div', { class: 'chips' },
      h('button', { class: 'chip', type: 'button', onclick: () => addWater(iso, 500) }, '+ 500 ml'),
      h('button', { class: 'chip', type: 'button', onclick: () => { other.hidden = !other.hidden; if (!other.hidden) otherIn.focus(); } }, 'Andere Menge')),
    other);
}
