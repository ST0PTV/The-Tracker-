// Unterseiten der Analyse: Mikronährstoffe, Monat & Makros, Jahresansicht.
// Nach microCardHtml (js/micro.js), renderHistory (js/app.js) und renderYear (js/v2.js) im Calorie-Tracker (ST0PTV, MIT).
// Jahresansicht ohne Serie: jeder Tag zählt für sich.
import { h } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { openInfo, infoBtn } from '../../core/info.js';
import { fmt, r1, isoDate, addDays } from '../../core/format.js';
import { loadFoods, foodsState, foodById } from '../food/foods.js';
import { microAvg } from './micro.js';
import { goalState } from './insights.js';
import { RANGES, getRange, setRange, dayRow, foodEntries } from './data.js';
import { backTo, dateShort } from './analyse-view.js';
import { showDay } from '../heute.js';

const MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MON3 = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const pad = (n) => String(n).padStart(2, '0');
const avg = (list, f) => (list.length ? list.reduce((a, x) => a + f(x), 0) / list.length : null);
const goDay = (iso) => { showDay(iso); location.hash = '#/'; };

function microInfo() {
  openInfo({
    title: 'Mikronährstoffe',
    note: 'Keine Empfehlung und keine Aussage über eine Unterversorgung.',
    body: ['Durchschnitt pro Tag über die Tage mit Einträgen im gewählten Zeitraum, berechnet aus den Nährwerten des Bundeslebensmittelschlüssels (BLS 4.0).',
      'Der Balken zeigt den Anteil am EU-Nährstoffbezugswert (NRV). Das ist der Wert für die Kennzeichnung auf Verpackungen, nicht dein persönlicher Bedarf; die DGE-Referenzwerte liegen teils deutlich anders.'],
    points: [['Nur BLS-Lebensmittel', 'Gescannte, eigene und „nur kcal“-Einträge haben keine Werte; „Abdeckung“ zeigt, welcher Anteil der Kalorien eingerechnet ist.'],
      ['Angereicherte Produkte', 'Mit B12, Calcium, Jod oder Vitamin D angereicherte Pflanzendrinks, Salze usw. stehen meist nicht im BLS – gerade bei veganer Ernährung wird dann zu wenig angezeigt.'],
      ['Supplements', 'Tabletten aus dem Supplement-Tracker sind nicht eingerechnet.'],
      ['Vitamin D', 'Wird hauptsächlich über die Haut gebildet; die Zufuhr über Essen sagt wenig über die Versorgung.'],
      ['Blutwerte', 'Ob ein Nährstoff fehlt, zeigt nur eine ärztliche Untersuchung.']],
    src: [['Max Rubner-Institut (2025). Bundeslebensmittelschlüssel (BLS) 4.0, CC BY 4.0', 'https://doi.org/10.25826/Data20251217-134202-0'],
      ['Verordnung (EU) Nr. 1169/2011, Anhang XIII Teil A (NRV)', 'https://eur-lex.europa.eu/eli/reg/2011/1169/oj']]
  });
}

export function microView(rerender) {
  const n = getRange();
  const seg = h('div', { class: 'seg an-seg', role: 'radiogroup', 'aria-label': 'Zeitraum' },
    ...RANGES.map(([k, l]) => h('button', { type: 'button', role: 'radio', 'aria-checked': k === n ? 'true' : 'false', onclick: () => { setRange(k); rerender(); } }, l)));
  const today = isoDate(), last = addDays(today, -1), first = addDays(last, -(n - 1));
  const head = [backTo('#/analyse', 'Analyse'),
    h('header', { class: 'page-head' }, h('h1', {}, 'Mikronährstoffe'), h('p', { class: 'sub' }, `${dateShort(first)} – ${dateShort(last)} · Ø pro Tag`)), seg];
  if (foodsState() !== 'ready') {
    if (foodsState() !== 'failed') loadFoods().then(() => rerender());
    return h('div', { class: 'me an' }, ...head, h('section', { class: 'card' }, h('p', { class: 'small muted' }, foodsState() === 'failed' ? 'Lebensmitteldaten konnten nicht geladen werden.' : 'Lebensmitteldaten werden geladen …')));
  }
  const lists = []; for (let i = 0; i < n; i++) lists.push(foodEntries(addDays(first, i)));
  const r = microAvg(lists, foodById);
  const fmtV = (v) => (v < 10 ? r1(v) : fmt(v));
  const card = r.n
    ? h('section', { class: 'card mc' },
      h('div', { class: 'card-head' }, h('h2', {}, `${r.n} ${r.n === 1 ? 'Tag' : 'Tage'} mit Einträgen`), infoBtn('Mikronährstoffe', microInfo)),
      ...r.rows.map((x) => h('div', { class: 'mc-row' },
        h('span', { class: 'mc-l' }, x.label),
        h('span', { class: 'mc-bar' }, h('i', { style: `width:${Math.min(100, x.pct)}%` })),
        h('span', { class: 'mc-v' }, `${fmtV(x.v)} ${x.unit}`),
        h('span', { class: 'mc-p' }, `${x.pct} %`))),
      h('p', { class: 'small muted' }, `Balken = Anteil am EU-Bezugswert (Kennzeichnung), kein persönlicher Bedarf. Abdeckung: ${r.cov} % der Kalorien stammen aus BLS-Lebensmitteln mit Werten.`))
    : h('section', { class: 'card' }, h('p', { class: 'small muted' }, 'Im Zeitraum gibt es noch keine Tage mit Einträgen.'), infoBtn('Mikronährstoffe', microInfo));
  return h('div', { class: 'me an' }, ...head, card);
}

// ---------- Monat & Makros ----------
let month = null; // 'JJJJ-MM' (nur für diese Sitzung)

export function monthView(rerender) {
  const today = isoDate(), cur = today.slice(0, 7);
  if (!month || month > cur) month = cur;
  const [Y, M] = month.split('-').map(Number);
  const nd = new Date(Y, M, 0).getDate();
  const lead = (new Date(Y, M - 1, 1).getDay() + 6) % 7;
  const rows = Array.from({ length: nd }, (_, i) => dayRow(`${month}-${pad(i + 1)}`));
  const past = rows.filter((x) => x.d < today);
  const tracked = past.filter((x) => x.n);
  const shift = (k) => { const d = new Date(Y, M - 1 + k, 1); month = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; rerender(); };

  const cells = [...Array.from({ length: lead }, () => h('span', { class: 'cal-d empty' }))];
  for (const x of rows) {
    const fut = x.d > today;
    const st = x.n && x.d < today ? goalState(x.k, x.goal) || 'on' : (x.n ? 'open' : '');
    cells.push(h('button', { class: `cal-d ${st}${x.d === today ? ' today' : ''}`, type: 'button', disabled: fut,
      'aria-label': `${Number(x.d.slice(8))}. ${MON[M - 1]}${x.n ? `, ${fmt(x.k)} kcal` : ''}`, onclick: () => goDay(x.d) },
    h('b', {}, String(Number(x.d.slice(8)))), x.n ? h('small', {}, fmt(x.k)) : null));
  }

  const aK = avg(tracked, (x) => x.k), aP = avg(tracked, (x) => x.p), aC = avg(tracked, (x) => x.c), aF = avg(tracked, (x) => x.f), aFi = avg(tracked, (x) => x.fi);
  const macroK = aP != null ? aP * 4 + aC * 4 + aF * 9 : 0;
  const share = (g, f) => (macroK ? Math.round((g * f / macroK) * 100) : 0);
  const withGoal = tracked.filter((x) => x.goal);
  const cnt = (s) => withGoal.filter((x) => goalState(x.k, x.goal) === s).length;

  return h('div', { class: 'me an' },
    backTo('#/analyse', 'Analyse'),
    h('header', { class: 'page-head day-head' },
      h('div', {}, h('h1', {}, MON[M - 1]), h('p', { class: 'sub' }, `${Y} · ohne heute`)),
      h('div', { class: 'day-nav' },
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Vorheriger Monat', onclick: () => shift(-1) }, icon('chevron', { size: 20, cls: 'flip' })),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Nächster Monat', disabled: month >= cur, onclick: () => shift(1) }, icon('chevron', { size: 20 })))),
    h('section', { class: 'card cal' },
      h('div', { class: 'cal-g cal-wd' }, ...WD.map((d) => h('span', {}, d))),
      h('div', { class: 'cal-g' }, ...cells),
      h('div', { class: 'cal-leg' }, h('span', {}, h('i', { class: 'ok' }), 'im Zielbereich ±10 %'), h('span', {}, h('i', { class: 'over' }), 'darüber'), h('span', {}, h('i', { class: 'low' }), 'darunter'))),
    h('h3', { class: 'sec' }, 'Durchschnitt pro Tag'),
    h('section', { class: 'card' },
      h('div', { class: 'tk-stats an-stats' },
        h('div', {}, h('span', {}, 'Tage mit Einträgen'), h('b', {}, `${tracked.length} / ${past.length}`)),
        h('div', {}, h('span', {}, 'Ø kcal'), h('b', {}, aK != null ? fmt(aK) : '–')),
        withGoal.length ? h('div', {}, h('span', {}, 'im Zielbereich'), h('b', {}, `${cnt('ok')} / ${withGoal.length}`)) : null),
      aP != null ? h('div', { class: 'an-macro' },
        ...[['Eiweiß', aP, 4, 'p'], ['Kohlenhydrate', aC, 4, 'c'], ['Fett', aF, 9, 'f']].map(([l, g, f, k]) => h('div', { class: `am-row am-${k}x` },
          h('span', { class: 'am-l' }, l), h('span', { class: 'am-bar' }, h('i', { style: `width:${share(g, f)}%` })), h('span', { class: 'am-v' }, `${fmt(g)} g`), h('span', { class: 'am-p' }, `${share(g, f)} %`))),
        h('p', { class: 'small muted' }, `Ballaststoffe Ø ${fmt(aFi)} g. Anteile an der Energie aus Eiweiß, Kohlenhydraten und Fett (4/4/9 kcal pro g). Tag antippen öffnet ihn auf „Heute“.`))
        : h('p', { class: 'small muted' }, 'In diesem Monat gibt es noch keine abgeschlossenen Tage mit Einträgen.')));
}

// ---------- Jahresansicht ----------
let year = null;

export function yearView(rerender) {
  const today = isoDate(), Y0 = Number(today.slice(0, 4));
  if (!year || year > Y0) year = Y0;
  let logged = 0, first = null;
  const blocks = MON3.map((mn, mi) => {
    const lead = (new Date(year, mi, 1).getDay() + 6) % 7, nd = new Date(year, mi + 1, 0).getDate();
    const cells = Array.from({ length: lead }, () => h('i', {}));
    for (let k = 1; k <= nd; k++) {
      const d = `${year}-${pad(mi + 1)}-${pad(k)}`;
      const food = foodEntries(d).length > 0;
      if (food) { logged++; if (!first) first = d; }
      cells.push(h('button', { class: `yd${d > today ? ' fut' : food ? ' on' : ''}${d === today ? ' today' : ''}`, type: 'button', disabled: d > today,
        'aria-label': `${k}. ${MON[mi]}${food ? ', eingetragen' : ''}`, onclick: () => goDay(d) }));
    }
    return h('div', { class: 'ym' }, h('div', { class: 'ym-n' }, mn), h('div', { class: 'ym-g' }, ...cells));
  });
  const endD = year === Y0 ? today : `${year}-12-31`;
  const span = first ? Math.round((new Date(endD + 'T12:00:00') - new Date(first + 'T12:00:00')) / 864e5) + 1 : 0;
  return h('div', { class: 'me an' },
    backTo('#/analyse', 'Analyse'),
    h('header', { class: 'page-head day-head' },
      h('div', {}, h('h1', {}, `Jahr ${year}`), h('p', { class: 'sub' }, 'jeder Tag für sich')),
      h('div', { class: 'day-nav' },
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Vorheriges Jahr', onclick: () => { year--; rerender(); } }, icon('chevron', { size: 20, cls: 'flip' })),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Nächstes Jahr', disabled: year >= Y0, onclick: () => { year++; rerender(); } }, icon('chevron', { size: 20 })))),
    h('section', { class: 'card' },
      h('div', { class: 'tk-stats an-stats' },
        h('div', {}, h('span', {}, 'Tage mit Einträgen'), h('b', {}, fmt(logged))),
        h('div', {}, h('span', {}, 'seit dem ersten Eintrag'), h('b', {}, `${span ? Math.round((logged / span) * 100) : 0} %`))),
      h('div', { class: 'y-grid' }, ...blocks),
      h('div', { class: 'cal-leg' }, h('span', {}, h('i', { class: 'yon' }), 'Essen eingetragen'), h('span', {}, h('i', { class: 'yoff' }), 'leer'))),
    h('p', { class: 'an-note' }, 'Keine Serie, die reißen kann: Jeder Tag zählt für sich. Tag antippen öffnet ihn auf „Heute“.'));
}
