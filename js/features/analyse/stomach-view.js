// „Analyse → Magen-Modell“: Tageskurve der geschätzten Magenfüllung (kcal) mit Mahlzeiten und Schlafzeit.
// Ansicht nach renderTimeline im Calorie-Tracker (js/timeline.js, ST0PTV, MIT); seit 0.5.0 mit Plan-Vorschlag (tlPlanHtml).
// Grobe Schätzung, keine Messung – so auch in der Ansicht gekennzeichnet.
import { h } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { openInfo, infoBtn } from '../../core/info.js';
import { fmt, isoDate, addDays, dayLabel } from '../../core/format.js';
import { getProfile, getSleep, getGoals, currentWeight } from '../../core/profile.js';
import { openSheet } from '../../core/sheet.js';
import { toast } from '../../core/ui.js';
import { ORDER, PLAN_PRESETS, planSettings, setPlanSettings, splitSum, planDay } from './meal-plan.js';
import { entriesOf, entryTotals, entryMin, mealLabel } from '../journal/journal.js';
import { isLiq } from '../food/foods.js';
import { hmToMin } from '../drinks/caffeine-model.js';
import { stomachEvents, halfLife, emptyAt, stomachAt, stomachSeries } from './stomach.js';
import { backTo } from './analyse-view.js';

const T0 = 6, T1 = 30; // 6:00 bis 6:00 am Folgetag
const hm = (t) => { const m = Math.round((((t % 24) + 24) % 24) * 60); return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
const dur = (t) => { const m = Math.round(t * 60); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')} h`; };
let day = null;
let mode = 'day'; // 'day' = Kurve, 'plan' = Vorschlag (0.5.0)
const LABEL = { breakfast: 'Frühstück', lunch: 'Mittagessen', snack: 'Snack', dinner: 'Abendessen' };
const r10 = (v) => Math.round(v / 10) * 10;
const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };

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

export function planInfo() {
  openInfo({
    title: 'Plan-Vorschlag',
    note: 'Faustregel-Planung, keine Empfehlung und keine belegte „beste“ Verteilung.',
    body: ['Der Vorschlag verteilt dein Kalorienziel auf die Mahlzeiten und legt sie gleichmäßig in ein Essfenster: eine Zeit nach dem Aufstehen bis ein Abstand vor dem Schlafen.',
      'Was schon eingetragen ist, zählt. Der Rest des Tagesziels wird auf die offenen Mahlzeiten verteilt.'],
    points: [['Aufteilung', 'Ausgeglichen 30/30/15/25 % (Frühstück/Mittag/Snack/Abend), änderbar. In einer Studie änderte mehr Energie morgens statt abends nichts am Gewichtsverlust, wohl aber das Hungergefühl.'],
      ['Essfenster', 'Standard 1 h nach dem Aufstehen bis 3 h vor dem Schlafen. Die 2–3 h stammen aus einer Leitlinie zur Refluxkrankheit; für Gesunde ist das eine Übertragung. Die Stunde nach dem Aufstehen ist eine Konvention.'],
      ['Eiweiß', 'Etwa 0,4–0,55 g pro kg Körpergewicht je Mahlzeit – eine Faustregel aus der Sporternährung.'],
      ['Schlafzeit', 'Aus „Ich → Schlaf & Körper“.']],
    src: [['Ruddick-Collins LC et al. (2022). Timing of daily calorie loading affects appetite and hunger responses without changes in energy metabolism in healthy subjects with obesity. Cell Metab 34(10):1472–1485', 'https://doi.org/10.1016/j.cmet.2022.08.001'],
      ['Katz PO et al. (2022). ACG Clinical Guideline for the Diagnosis and Management of Gastroesophageal Reflux Disease. Am J Gastroenterol 117(1):27–56', 'https://doi.org/10.14309/ajg.0000000000001538'],
      ['Schoenfeld BJ, Aragon AA (2018). How much protein can the body use in a single meal for muscle-building? J Int Soc Sports Nutr 15:10', 'https://doi.org/10.1186/s12970-018-0215-1'],
      ['Calorie-Tracker (ST0PTV) – js/timeline.js (tlPlan)', 'https://github.com/ST0PTV/Calorie-Tracker']]
  });
}

function openPlanSettings(rerender) {
  const box = h('div', { class: 'plan-set' });
  const draw = () => {
    const P = planSettings();
    const sum = splitSum(P.split);
    const pct = (m) => h('label', { class: 'form-label' }, h('span', {}, `${LABEL[m].replace('essen', '')} %`),
      h('input', { class: 'input', type: 'text', inputmode: 'numeric', value: String(P.split[m] || 0), disabled: P.preset !== 'custom', 'aria-label': `${LABEL[m]} in Prozent`,
        onchange: (e) => { const v = num(e.target.value); if (v == null || v < 0 || v > 100) { toast('Bitte 0 bis 100 % eingeben.', { error: true }); draw(); return; } setPlanSettings({ split: { ...P.split, [m]: Math.round(v) } }); draw(); rerender(); } }));
    const hours = (key, title, lo, hi) => h('label', { class: 'form-label' }, h('span', {}, title),
      h('input', { class: 'input', type: 'text', inputmode: 'decimal', value: String(P[key]).replace('.', ','), 'aria-label': title,
        onchange: (e) => { const v = num(e.target.value); if (v == null || v < lo || v > hi) { toast(`Bitte ${lo} bis ${hi} h eingeben.`, { error: true }); draw(); return; } setPlanSettings({ [key]: Math.round(v * 4) / 4 }); draw(); rerender(); } }));
    box.replaceChildren(
      h('h3', { class: 'sec' }, 'Aufteilung'),
      h('div', { class: 'chips' }, ...Object.entries(PLAN_PRESETS).map(([k, p]) => h('button', { class: `chip${P.preset === k ? ' on' : ''}`, type: 'button', 'aria-pressed': String(P.preset === k), onclick: () => { setPlanSettings({ preset: k }); draw(); rerender(); } }, p.label))),
      h('div', { class: 'plan-pct' }, ...ORDER.map(pct)),
      h('p', { class: `small ${sum === 100 ? 'muted' : 'warn'}` }, sum === 100 ? 'Summe 100 %. Snack auf 0 % = drei Mahlzeiten.' : `Summe ${sum} % – bitte auf 100 % bringen.`),
      h('h3', { class: 'sec' }, 'Essfenster'),
      h('div', { class: 'plan-pct two' }, hours('first', 'Nach dem Aufstehen (h)', 0, 4), hours('gap', 'Vor dem Schlafen (h)', 0, 6)));
  };
  draw();
  return openSheet(box, { title: 'Plan anpassen' });
}

function planBlock(iso, today, sl, bed, rerender) {
  const g = getGoals(iso);
  if (!g?.goal) return [h('section', { class: 'card' }, h('p', { class: 'muted', style: 'margin:0' }, 'Für einen Vorschlag braucht die App ein Kalorienziel. ',
    h('a', { class: 'link', href: '#/ich/ziel' }, 'Tagesziel festlegen')))];
  const P = planSettings();
  const eaten = {};
  for (const e of entriesOf(iso)) eaten[e.meal] = (eaten[e.meal] || 0) + entryTotals(e).k;
  const wm = hmToMin(sl.wake) / 60;
  const p = planDay({ goal: g.goal, eaten, wake: wm, bed, split: P.split, first: P.first, gap: P.gap, weight: currentWeight(iso) });
  const x = (t) => Math.max(0, Math.min(100, ((t - T0) / (T1 - T0)) * 100));
  const maxV = Math.max(1, ...p.items.map((it) => Math.max(it.target || 0, it.eaten || 0, it.rest || 0)));
  const nowH = iso === today ? new Date().getHours() + new Date().getMinutes() / 60 : null;
  const nowT = nowH == null ? null : nowH < T0 ? nowH + 24 : nowH;
  const bar = h('div', { class: 'tp-win', role: 'img', 'aria-label': `Essfenster ${hm(p.start)} bis ${hm(p.end)}, ${p.items.length} Mahlzeiten` },
    h('span', { class: 'tp-eat', style: `left:${x(p.start)}%;width:${x(p.end) - x(p.start)}%` }),
    h('span', { class: 'tp-sleep', style: `left:${x(bed)}%` }),
    nowT != null ? h('span', { class: 'tp-now', style: `left:${x(nowT)}%` }) : null,
    ...p.items.map((it) => h('span', { class: `tp-bar${it.done ? ' done' : ''}`, style: `left:${x(it.h)}%;height:${Math.max(8, ((it.done ? it.eaten : it.rest ?? it.target) / maxV) * 100)}%` })),
    h('div', { class: 'tp-axis' }, ...[6, 12, 18, 24, 30].map((t) => h('span', { style: `left:${x(t)}%` }, hm(t)))));
  const pr = p.protein ? `${fmt(p.protein[0])}–${fmt(p.protein[1])} g Eiweiß` : null;
  const over = p.rest === 0 && p.eatenAll > p.goal;
  return [
    h('section', { class: 'card' },
      h('div', { class: 'trk-sum' }, h('b', {}, `${hm(p.start)}–${hm(p.end)}`), h('span', {}, `Essfenster · ${p.items.length} Mahlzeiten · ${fmt(p.goal)} kcal`), infoBtn('Plan-Vorschlag', planInfo)),
      bar,
      h('p', { class: 'small muted' }, `Grün = Essfenster, Strich = Bettzeit (${sl.bed}). Balken = vorgeschlagene Größe, kräftig = schon gegessen.`)),
    h('h3', { class: 'sec' }, 'Vorschlag'),
    h('section', { class: 'card list' }, ...p.items.map((it) => h('div', { class: 'row st-row' },
      h('span', { class: `st-t${it.done ? '' : ' open'}` }, hm(it.h)),
      h('span', { class: 'grow' }, h('b', {}, LABEL[it.meal]), h('small', {}, `${P.split[it.meal]} % ≈ ${fmt(r10(it.target))} kcal${pr ? ` · ${pr}` : ''}`)),
      h('span', { class: 'st-v' }, it.done ? h('b', {}, `✓ ${fmt(it.eaten)} kcal`) : it.rest != null ? h('b', {}, `noch ≈ ${fmt(r10(it.rest))} kcal`) : null)))),
    over ? h('p', { class: 'small muted' }, `Das Tagesziel ist schon erreicht (${fmt(p.eatenAll)} kcal).`) : null,
    h('button', { class: 'btn block', type: 'button', onclick: () => openPlanSettings(rerender) }, 'Plan anpassen'),
    h('p', { class: 'an-note' }, `Aufteilung „${PLAN_PRESETS[P.preset].label}“, Essfenster ${String(P.first).replace('.', ',')} h nach dem Aufstehen bis ${String(P.gap).replace('.', ',')} h vor dem Schlafen. Faustregel, keine Vorgabe.`)];
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
    h('div', { class: 'seg st-mode', role: 'radiogroup', 'aria-label': 'Ansicht' }, ...[['day', 'Tageskurve'], ['plan', 'Plan-Vorschlag']].map(([k, l]) =>
      h('button', { type: 'button', role: 'radio', 'aria-checked': String(mode === k), onclick: () => { mode = k; rerender(); } }, l))),
    mode === 'plan' ? planBlock(iso, today, sl, bed, rerender) : [
    h('section', { class: 'card' },
      h('div', { class: 'trk-sum' }, h('b', {}, big), h('span', {}, sub), infoBtn('Magen-Modell', stomachInfo)),
      chart(evs, sex, { bed, wake, nowT }),
      evs.length ? h('p', { class: 'small muted' }, `Zur Bettzeit (${sl.bed}) ≈ ${fmt(atBed)} kcal im Magen. Grau = Schlafzeit, Punkte = Mahlzeiten.`) : null),
    evs.length ? h('h3', { class: 'sec' }, 'Mahlzeiten') : null,
    evs.length ? h('section', { class: 'card list' }, ...evs.map((ev) => h('div', { class: 'row st-row' },
      h('span', { class: 'st-t' }, hm(ev.h)),
      h('span', { class: 'grow' }, h('b', {}, ev.liq ? 'Getränk' : mealLabel(ev.meal)), h('small', {}, ev.names.slice(0, 3).join(', ') + (ev.names.length > 3 ? ' …' : ''))),
      h('span', { class: 'st-v' }, h('b', {}, `${fmt(ev.kcal)} kcal`), h('small', {}, `T½ ${dur(halfLife(ev, sex))} · leer ≈ ${hm(emptyAt(ev, sex))}`))))) : null,
    h('p', { class: 'an-note' }, 'Modellwerte aus kcal, Fett, Uhrzeit und Geschlecht. „leer“ = zu 90 % entleert. Keine Empfehlung.')]);
}
