// Wochenstreifen Mo–So und Monatsansicht auf „Heute“ (0.5.1, Mockup 1A + C, Nutzerwahl 2026-11-15).
// Nach dem Tageskopf mit Wochenstreifen und Datumswahl im Calorie-Tracker (v2.js, ST0PTV, MIT).
// Tag antippen = springen; Streifen seitlich wischen = Woche vor/zurück; Kalender-Knopf = Monat. Zukunft ist blasser,
// bleibt aber wählbar (vorab eintragen, wie bisher mit den Pfeilen).
// Punkt = Tag mit Essens-Einträgen (nur Menge, keine Wertung).
import { h } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { openSheet } from '../../core/sheet.js';
import { addDays } from '../../core/format.js';
import { entriesOf } from './journal.js';

const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const hasFood = (iso) => entriesOf(iso).some((e) => !e.link);

/** Montag der Woche eines Tages. */
export function mondayOf(iso) {
  const d = new Date(iso + 'T12:00:00');
  return addDays(iso, -((d.getDay() + 6) % 7));
}

/** Die 7 Tage der Woche von iso (Mo zuerst). */
export const weekOf = (iso) => Array.from({ length: 7 }, (_, i) => addDays(mondayOf(iso), i));

/** Monatsraster: führende Leerstellen (Mo-Start) und alle Tage des Monats. */
export function monthGrid(year, month) {
  const first = new Date(year, month, 1, 12);
  const lead = (first.getDay() + 6) % 7;
  const n = new Date(year, month + 1, 0, 12).getDate();
  const p = (x) => String(x).padStart(2, '0');
  return { lead, days: Array.from({ length: n }, (_, i) => `${year}-${p(month + 1)}-${p(i + 1)}`) };
}

/** Streifen für die Woche des gewählten Tags. pick(iso) springt; Wischen ruft pick mit ±7 Tagen. */
export function weekStrip(iso, today, pick) {
  const days = weekOf(iso);
  const el = h('div', { class: 'wk-strip', role: 'group', 'aria-label': 'Woche' },
    ...days.map((d) => {
      const n = Number(d.slice(8));
      const fut = d > today;
      return h('button', {
        type: 'button', class: `wk-d${d === iso ? ' sel' : ''}${d === today ? ' today' : ''}${fut ? ' fut' : ''}`,
        'aria-pressed': d === iso ? 'true' : 'false',
        'aria-label': new Date(d + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }) + (hasFood(d) ? ', mit Einträgen' : ''),
        onclick: () => pick(d)
      }, h('small', {}, WD[days.indexOf(d)]), h('b', {}, String(n)), h('i', { class: hasFood(d) ? 'on' : '' }));
    }));
  // Seitlich wischen: Woche wechseln (nur auf dem Streifen; die Zurück-Geste des iPhones am Rand bleibt frei)
  let x0 = null, y0 = 0;
  el.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; });
  el.addEventListener('pointerup', (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    x0 = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    pick(addDays(iso, dx < 0 ? 7 : -7));
  });
  el.addEventListener('pointercancel', () => { x0 = null; });
  return el;
}

/** Monatsansicht als Sheet. Punkt = Tag mit Einträgen; Zukunft blasser. */
export function openMonth(iso, today, pick) {
  let y = Number(iso.slice(0, 4)), m = Number(iso.slice(5, 7)) - 1;
  const box = h('div', { class: 'mo-box' });
  let sheet = null;
  const draw = () => {
    const { lead, days } = monthGrid(y, m);
    const title = new Date(y, m, 15).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    const step = (d) => { m += d; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } draw(); };
    box.replaceChildren(
      h('div', { class: 'mo-head' },
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Voriger Monat', onclick: () => step(-1) }, icon('chevron', { size: 20, cls: 'flip' })),
        h('b', { 'aria-live': 'polite' }, title),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Nächster Monat', onclick: () => step(1) }, icon('chevron', { size: 20 }))),
      h('div', { class: 'mo-grid' },
        ...WD.map((w) => h('small', {}, w)),
        ...Array.from({ length: lead }, () => h('span', {})),
        ...days.map((d) => h('button', {
          type: 'button', class: `mo-d${d === iso ? ' sel' : ''}${d === today ? ' today' : ''}${hasFood(d) ? ' on' : ''}${d > today ? ' fut' : ''}`,
          'aria-pressed': d === iso ? 'true' : 'false',
          onclick: () => { sheet.close(); pick(d); }
        }, String(Number(d.slice(8)))))),
      h('div', { class: 'mo-foot' },
        h('span', { class: 'small muted' }, 'Punkt = Tag mit Einträgen'),
        iso !== today ? h('button', { class: 'btn small-btn', type: 'button', onclick: () => { sheet.close(); pick(today); } }, 'Heute') : null));
  };
  draw();
  sheet = openSheet(box, { title: 'Tag wählen' });
  return sheet;
}
