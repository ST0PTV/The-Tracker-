// Gewichtskarte unter „Heute“: aktuelles Gewicht, Wochentrend, Verlauf (30 Tage), Eingabe-Sheet.
// Bewusst neutral: keine Wertung von Zu- oder Abnahme, kein Lob, keine Serien. Trend als 7-Tage-Mittel,
// weil das Tagesgewicht durch Wasser und Essen um 1–2 kg schwankt.
import { h } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { toast } from '../../core/ui.js';
import { openSheet } from '../../core/sheet.js';
import { openInfo, infoBtn } from '../../core/info.js';
import { num, r1, addDays, isoDate, fmt } from '../../core/format.js';
import { weightLog, currentWeight, removeWeight, logWeight, getWeightGoal, getGoals } from '../../core/profile.js';
import { weeklyTrend, wgDateFmt, WG_REFS } from './weightgoal.js';
import { enterWeight } from './weight.js';

export function weightInfo() {
  openInfo({
    title: 'Gewicht',
    body: ['Das Tagesgewicht schwankt durch Wasser, Salz und Essen oft um 1–2 kg. Aussagekräftiger ist der Trend: Die Karte vergleicht das Mittel der letzten 7 Tage mit den 7 Tagen davor.',
      'Am besten morgens, nach dem Aufstehen und vor dem Frühstück wiegen – immer unter ähnlichen Bedingungen.',
      'Mit Gewichtsziel und „automatisch anpassen“ rechnet die App bei jedem neuen Gewicht für heute das Kalorienziel neu.'],
    src: WG_REFS.slice(2, 3)
  });
}

const SVG = 'http://www.w3.org/2000/svg';
const el = (tag, attrs) => { const e = document.createElementNS(SVG, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v)); return e; };

/** Verlauf der letzten 30 Tage als Linie; Zielgewicht gestrichelt. */
function spark(log, today, target) {
  const W = 320, H = 72, P = 6, PL = 30; // links Platz für die Skalenwerte
  const from = addDays(today, -29);
  const pts = log.filter((e) => e.iso >= from && e.iso <= today);
  const root = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'wspark', role: 'img', 'aria-label': 'Gewichtsverlauf der letzten 30 Tage' });
  if (pts.length < 2) return null;
  // Skala nur aus den Werten (das Ziel würde den Verlauf sonst flach drücken); mindestens 2 kg Spanne
  const vals = pts.map((e) => e.kg);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (hi - lo < 2) { const m = (hi + lo) / 2; lo = m - 1; hi = m + 1; }
  lo -= 0.3; hi += 0.3;
  const day = (iso) => Math.round((new Date(iso + 'T12:00:00') - new Date(from + 'T12:00:00')) / 864e5);
  const x = (iso) => PL + (day(iso) / 29) * (W - PL - P);
  const y = (kg) => P + (1 - (kg - lo) / (hi - lo)) * (H - 2 * P);
  if (target && target >= lo && target <= hi) root.append(el('line', { class: 'goal', x1: PL, x2: W, y1: y(target).toFixed(1), y2: y(target).toFixed(1) }));
  const lab = (v, yy) => { const t = el('text', { class: 'lab', x: 1, y: yy, 'text-anchor': 'start' }); t.textContent = `${r1(v)}`; return t; };
  root.append(lab(hi, 11), lab(lo, H - 3));
  root.append(el('path', { class: 'line', d: pts.map((e, i) => `${i ? 'L' : 'M'} ${x(e.iso).toFixed(1)} ${y(e.kg).toFixed(1)}`).join(' ') }));
  const last = pts[pts.length - 1];
  root.append(el('circle', { class: 'dot', cx: x(last.iso).toFixed(1), cy: y(last.kg).toFixed(1), r: 3.5 }));
  return h('div', { class: 'chart-box' }, root);
}

const kg = (v) => `${r1(v)} kg`;
const signed = (v) => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${r1(Math.abs(v))} kg`;

export function weightCard(iso, today) {
  const o = getWeightGoal();
  if (!o.card) return null;
  const log = weightLog().filter((e) => e.iso <= iso);
  const w = currentWeight(iso);
  const add = h('button', { class: 'add-btn', type: 'button', 'aria-label': 'Gewicht eintragen', onclick: () => openWeight(iso) }, icon('plus', { size: 22 }));
  const head = h('div', { class: 'tk-head' },
    h('div', {}, h('span', { class: 'tk-label' }, 'Gewicht', infoBtn('Gewicht', weightInfo)),
      w != null ? h('div', { class: 'tk-big' }, r1(w), h('small', {}, ' kg')) : null,
      w != null && log.length ? h('div', { class: 'tk-sub' }, log[log.length - 1].iso === iso ? 'heute gewogen' : `zuletzt ${wgDateFmt(log[log.length - 1].iso)}`) : null),
    add);
  if (w == null) {
    return h('section', { class: 'card tk weight is-empty' }, head, h('p', { class: 'small muted' }, 'Noch kein Gewicht eingetragen.'));
  }
  const t = weeklyTrend(log, iso);
  const g = getGoals(iso);
  const stats = h('div', { class: 'tk-stats' },
    h('div', {}, h('span', {}, 'Ø 7 Tage'), h('b', {}, t ? kg(t.avg) : '–')),
    h('div', {}, h('span', {}, 'zur Vorwoche'), h('b', {}, t && t.diff != null ? signed(t.diff) : '–')));
  const goalLine = o.on && o.target
    ? h('p', { class: 'small muted' }, `Ziel ${kg(o.target)}${o.date ? ` · voraussichtlich ${wgDateFmt(o.date)}` : ''}${g?.goal ? ` · Kalorienziel ${fmt(g.goal)} kcal` : ''} · `,
      h('a', { class: 'link', href: '#/ich/gewichtsziel' }, 'ändern'))
    : h('p', { class: 'small muted' }, h('a', { class: 'link', href: '#/ich/gewichtsziel' }, 'Gewichtsziel festlegen'));
  return h('section', { class: 'card tk weight' }, head, spark(log, iso, o.on ? o.target : null), stats, goalLine);
}

/** Eingabe-Sheet: Gewicht für einen Tag (Standard: gewählter Tag), letzte Einträge mit Löschen. */
export function openWeight(iso = isoDate()) {
  const today = isoDate();
  const day = iso > today ? today : iso;
  const last = currentWeight(day);
  const inp = h('input', { class: 'input', type: 'text', inputmode: 'decimal', value: last != null ? r1(last) : '', placeholder: 'z. B. 72,4', 'aria-label': 'Gewicht in kg' });
  const date = h('input', { class: 'input', type: 'date', value: day, max: today, 'aria-label': 'Datum' });
  const list = h('div', { class: 'tk-rows' });
  let sheet = null;
  const drawList = () => {
    const l = weightLog().filter((e) => !e.demo).slice(-7).reverse();
    list.replaceChildren(...(l.length ? l.map((e) => h('div', { class: 'tk-row' },
      h('span', { class: 't' }, h('b', {}, wgDateFmt(e.iso))),
      h('span', { class: 'tk-v' }, h('b', {}, kg(e.kg))),
      h('button', { class: 'icon-btn sm', type: 'button', 'aria-label': `Gewicht vom ${wgDateFmt(e.iso)} löschen`, onclick: () => {
        const gone = removeWeight(e.iso); drawList();
        toast(`${kg(e.kg)} gelöscht`, { action: { label: 'Rückgängig', onClick: () => { if (gone) logWeight(e.iso, gone.kg); drawList(); } } });
      } }, icon('close', { size: 14 })))) : [h('p', { class: 'small muted' }, 'Noch keine eigenen Einträge.')]));
  };
  drawList();
  const save = () => {
    const v = num(inp.value);
    try { toast(enterWeight(date.value, v, today)); sheet.close(); } catch (e) { toast(e.message, { error: true }); }
  };
  sheet = openSheet(h('div', {},
    h('div', { class: 'two' },
      h('label', { class: 'form-label' }, h('span', {}, 'Gewicht (kg)'), inp),
      h('label', { class: 'form-label' }, h('span', {}, 'Datum'), date)),
    h('button', { class: 'btn primary block', type: 'button', onclick: save }, 'Eintragen'),
    h('h3', { class: 'sec' }, 'Letzte Einträge'), list), { title: 'Gewicht' });
  setTimeout(() => inp.focus(), 250);
}
