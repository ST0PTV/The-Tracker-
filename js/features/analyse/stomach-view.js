// „Analyse → Magen-Modell“: Tageskurve der geschätzten Magenfüllung (kcal) mit Mahlzeiten und Schlafzeit.
// Ansicht nach renderTimeline im Calorie-Tracker (js/timeline.js, ST0PTV, MIT), ohne Plan-Vorschlag.
// Grobe Schätzung, keine Messung – so auch in der Ansicht gekennzeichnet.
import { h } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { openInfo, infoBtn } from '../../core/info.js';
import { fmt, isoDate, addDays, dayLabel } from '../../core/format.js';
import { getProfile, getSleep } from '../../core/profile.js';
import { entriesOf, entryTotals, entryMin, mealLabel } from '../journal/journal.js';
import { isLiq } from '../food/foods.js';
import { hmToMin } from '../drinks/caffeine-model.js';
import { stomachEvents, halfLife, emptyAt, stomachAt, stomachSeries } from './stomach.js';
import { backTo } from './analyse-view.js';

const T0 = 6, T1 = 30; // 6:00 bis 6:00 am Folgetag
const hm = (t) => { const m = Math.round((((t % 24) + 24) % 24) * 60); return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
const dur = (t) => { const m = Math.round(t * 60); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')} h`; };
let day = null;

export function stomachInfo() {
  openInfo({
    title: 'Magen-Modell',
    note: 'Grobe Schätzung, keine Messung und keine Diagnose.',
    body: ['Die Kurve schätzt, wie viel vom Gegessenen (in kcal) noch im Magen ist. Jede Mahlzeit entleert sich nach dem Muster Restanteil = 2^(−(t/T½)²).',
      'Eine kleine, fettarme Mahlzeit (~250 kcal) hat T½ ≈ 1,75 h; das ergibt nach 1/2/4 h etwa 80/40/3 % – innerhalb der Normalwerte der Magen-Szintigrafie (37–90 / 30–60 / 0–10 %).'],
    points: [['Größe und Fett', 'Größere und fettreichere Mahlzeiten bekommen ein längeres T½ (0,75–4,5 h). Die Größenordnung ist eine Annahme, nicht belegt.'],
      ['Getränke', 'T½ 0,4 h – Flüssigkeiten verlassen den Magen schnell.'],
      ['Geschlecht', 'Frauen entleeren den Magen im Mittel langsamer; die App nutzt gedämpft den Faktor 1,1 (Frauen) bzw. 0,9 (Männer).'],
      ['Uhrzeit', 'Einträge ohne eigene Uhrzeit zählen zur Standardzeit ihrer Mahlzeit. Einträge derselben Mahlzeit innerhalb von 20 min werden zusammengefasst.'],
      ['Nicht berücksichtigt', 'Erkrankungen, Medikamente, Sport, Stress, Ballaststoffe und Konsistenz. Gilt höchstens für gesunde Erwachsene.']],
    src: [['Abell TL et al. (2008). Consensus recommendations for gastric emptying scintigraphy. J Nucl Med Technol 36(1):44–54', 'https://doi.org/10.2967/jnmt.107.048116'],
      ['Datz FL et al. (1987). Gender-related differences in gastric emptying. J Nucl Med 28(7):1204–1207', null],
      ['Caballero-Plasencia AM et al. (1999). Gastric emptying in women … Scand J Gastroenterol 34(8):772–776', 'https://doi.org/10.1080/003655299750025697'],
      ['Calorie-Tracker (ST0PTV) – js/timeline.js', 'https://github.com/ST0PTV/Calorie-Tracker']]
  });
}

const SVG = 'http://www.w3.org/2000/svg';
const el = (tag, attrs) => { const e = document.createElementNS(SVG, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v)); return e; };

function chart(evs, sex, { bed, wake, nowT }) {
  const W = 320, H = 150, PB = 18, PT = 8;
  const series = stomachSeries(evs, T0, T1, sex);
  const max = Math.max(200, ...series.map(([, v]) => v)) * 1.1;
  const x = (t) => ((t - T0) / (T1 - T0)) * W, y = (v) => PT + (1 - v / max) * (H - PB - PT);
  const svg = el('svg', { class: 'st-svg', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Geschätzte Magenfüllung im Tagesverlauf' });
  if (bed < T1) svg.append(el('rect', { class: 'night', x: x(Math.max(T0, bed)), y: 0, width: x(Math.min(T1, wake)) - x(Math.max(T0, bed)), height: H - PB }));
  for (const t of [6, 12, 18, 24, 30]) {
    svg.append(el('line', { class: 'grid', x1: x(t), x2: x(t), y1: 0, y2: H - PB }));
    const lab = el('text', { class: 'lab', x: Math.min(W - 14, Math.max(14, x(t))), y: H - 4, 'text-anchor': 'middle' }); lab.textContent = hm(t); svg.append(lab);
  }
  const d = series.map(([t, v], i) => `${i ? 'L' : 'M'}${x(t).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  svg.append(el('path', { class: 'area', d: `${d} L${W} ${y(0)} L0 ${y(0)} Z` }), el('path', { class: 'line', d }));
  for (const ev of evs) svg.append(el('circle', { class: 'ev', cx: x(ev.h).toFixed(1), cy: y(0).toFixed(1), r: 4 }));
  if (nowT != null && nowT >= T0 && nowT <= T1) svg.append(el('line', { class: 'now', x1: x(nowT), x2: x(nowT), y1: 0, y2: H - PB }));
  return h('div', { class: 'chart-box' }, svg);
}

export function stomachView(rerender) {
  const today = isoDate();
  if (!day || day > today) day = today;
  const iso = day;
  const sex = getProfile().sex || null;
  const items = entriesOf(iso).map((e) => { const t = entryTotals(e); return { meal: e.meal, h: entryMin(e) / 60, kcal: t.k, f: t.f, liq: isLiq(e), name: e.n }; });
  const evs = stomachEvents(items);
  const sl = getSleep();
  const bm = hmToMin(sl.bed) / 60, wm = hmToMin(sl.wake) / 60;
  const bed = bm < 12 ? bm + 24 : bm, wake = wm + 24 > bed ? wm + 24 : wm + 48;
  const nowT = iso === today ? new Date().getHours() + new Date().getMinutes() / 60 : null;
  const go = (k) => { day = addDays(iso, k); rerender(); };

  let big, sub;
  if (!evs.length) { big = '–'; sub = 'Keine Einträge an diesem Tag.'; }
  else if (nowT != null) { big = `≈ ${fmt(stomachAt(evs, nowT, sex))}`; sub = 'kcal jetzt im Magen (Schätzung)'; }
  else {
    let pk = [T0, 0]; for (const p of stomachSeries(evs, T0, T1, sex, 1 / 12)) if (p[1] > pk[1]) pk = p;
    big = `≈ ${fmt(pk[1])}`; sub = `kcal Höchstwert um ${hm(pk[0])} (Schätzung)`;
  }
  const atBed = evs.length ? stomachAt(evs, bed, sex) : 0;

  return h('div', { class: 'me an st k-body' },
    backTo('#/analyse', 'Analyse'),
    h('header', { class: 'page-head day-head' },
      h('div', {}, h('h1', {}, 'Magen-Modell'), h('p', { class: 'sub' }, `${dayLabel(iso, today)} · ${new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}`)),
      h('div', { class: 'day-nav' },
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Vorheriger Tag', onclick: () => go(-1) }, icon('chevron', { size: 20, cls: 'flip' })),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Nächster Tag', disabled: iso >= today, onclick: () => go(1) }, icon('chevron', { size: 20 })))),
    h('section', { class: 'card' },
      h('div', { class: 'trk-sum' }, h('b', {}, big), h('span', {}, sub), infoBtn('Magen-Modell', stomachInfo)),
      chart(evs, sex, { bed, wake, nowT }),
      evs.length ? h('p', { class: 'small muted' }, `Zur Bettzeit (${sl.bed}) ≈ ${fmt(atBed)} kcal im Magen. Grau = Schlafzeit, Punkte = Mahlzeiten.`) : null),
    evs.length ? h('h3', { class: 'sec' }, 'Mahlzeiten') : null,
    evs.length ? h('section', { class: 'card list' }, ...evs.map((ev) => h('div', { class: 'row st-row' },
      h('span', { class: 'st-t' }, hm(ev.h)),
      h('span', { class: 'grow' }, h('b', {}, ev.liq ? 'Getränk' : mealLabel(ev.meal)), h('small', {}, ev.names.slice(0, 3).join(', ') + (ev.names.length > 3 ? ' …' : ''))),
      h('span', { class: 'st-v' }, h('b', {}, `${fmt(ev.kcal)} kcal`), h('small', {}, `T½ ${dur(halfLife(ev, sex))} · leer ≈ ${hm(emptyAt(ev, sex))}`))))) : null,
    h('p', { class: 'an-note' }, 'Modellwerte aus kcal, Fett, Uhrzeit und Geschlecht. „leer“ = zu 90 % entleert. Keine Empfehlung.'));
}
