// „Analyse“: Übersicht über 7 / 30 / 90 Tage (ohne heute), Entwurf A „Kacheln“ (Nutzerwahl 2026-10-26).
// Aufbau nach der Analytics-Übersicht im Calorie-Tracker (js/v2.js, ST0PTV, MIT), ohne die Kachel „Gewohnheit“.
// Erreichbar über den Trend-Knopf oben auf „Heute“. Alles hier ist Anzeige: kein Ziel wird automatisch geändert,
// keine Wertung, kein Lob für niedrige Zufuhr.
import { h } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { openInfo, infoBtn } from '../../core/info.js';
import { fmt, r1, isoDate } from '../../core/format.js';
import { getProfile, getWeightGoal, getGoals, currentWeight } from '../../core/profile.js';
import { wgMaint, wgBmrEst, wgPalTotal, ageOf } from '../goal/weightgoal.js';
import { openWeightDetails } from '../goal/weight-card.js';
import { openWaterDetails } from '../drinks/water-card.js';
import { openCaffDetails } from '../drinks/caffeine-card.js';
import { openAlcDetails } from '../drinks/alcohol-card.js';
import { weightTrend, trendPerWeek, expenditure, goalState, INS_WIN, INS_MIN_LOGGED, INS_MIN_WEIGHS, INS_MIN_SPAN } from './insights.js';
import { RANGES, getRange, setRange, rangeDays, weights, kcalOf, loggedOf, enabled } from './data.js';
import { spark, kcalBars } from './charts.js';

export const dateShort = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
const avg = (list, f) => (list.length ? list.reduce((a, x) => a + f(x), 0) / list.length : null);
const s1 = (v) => (Math.round(v * 10) === 0 ? '±0' : (v > 0 ? '+' : '−') + r1(Math.abs(v)));
const litres = (ml) => (ml / 1000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const r50 = (v) => Math.round(v / 50) * 50;
const tage = (n) => `${n} ${n === 1 ? 'Tag' : 'Tagen'}`;

export function backTo(href, label) {
  return h('a', { class: 'back', href }, icon('chevron', { size: 16, cls: 'flip' }), label);
}

function tile({ kind, name, value, unit = '', sub, viz = null, wide = false, onOpen, label }) {
  return h('button', { class: `an-tile k-${kind}${wide ? ' wide' : ''}`, type: 'button', onclick: onOpen, 'aria-label': label || name },
    h('span', { class: 'an-h' }, h('i', { class: 'dot' }), name, h('span', { class: 'chev' }, icon('chevron', { size: 14 }))),
    h('span', { class: 'an-v' }, value, unit ? h('small', {}, ` ${unit}`) : null),
    h('span', { class: 'an-s' }, sub),
    viz);
}

const moreRow = (kind, ico, title, sub, href) => h('a', { class: `me-row k-${kind}`, href },
  h('span', { class: 'qa-badge' }, icon(ico, { size: 20 })),
  h('span', { class: 't' }, h('b', {}, title), h('small', {}, sub)),
  h('span', { class: 'qa-chev' }, icon('chevron', { size: 16 })));

/** Info: woher die Werte kommen (gilt für alle Kacheln). */
export function averagesInfo() {
  openInfo({
    title: 'Analyse',
    body: ['Durchschnitte (Ø) zählen nur Tage mit Essens-Einträgen; Tage ohne Eintrag und heute bleiben außen vor. Ein Tag mit wenigen Einträgen ist nicht unbedingt ein Tag mit wenig Essen.',
      'Jeder Tag wird mit dem Ziel verglichen, das an diesem Tag galt. „Im Zielbereich“ heißt: höchstens 10 % über oder unter dem Ziel. Die Balken zeigen das ohne Wertung.',
      'Beim Wasser zählen Tage mit Wasser-Einträgen, beim Koffein Tage mit Koffein. Koffein zur Bettzeit, Gewichtstrend und Energiebedarf sind Modellwerte, keine Messungen.'],
    points: [['Gewicht', 'Linie = geglätteter Trend (jeder neue Wert zählt 10 %). „pro Woche“ = Änderung dieses Trends im Zeitraum, auf eine Woche umgerechnet. Der Trend läuft echten Änderungen einige Tage hinterher.'], ['Eiweiß', 'Durchschnitt pro Tag gegen das Eiweißziel der jeweiligen Tage.']],
    src: [['Walker J. The Hacker’s Diet (Trend)', null], ['Calorie-Tracker (ST0PTV) – Analytics', 'https://github.com/ST0PTV/Calorie-Tracker']]
  });
}

/** Energiebedarf aus Essen + Gewicht mit Vergleich zu Uhr, Formel und Tagesziel. */
export function openEnergy(today = isoDate()) {
  const e = expenditure({ today, kcalOf, loggedOf, log: weights() });
  const o = getWeightGoal(), p = getProfile(), w = currentWeight(today);
  const watch = o.src === 'watch' && o.maint ? o.maint : (o.src === 'bmr' && o.bmr ? wgMaint(o, w) : null);
  const bmr = w ? wgBmrEst(w, p.sex, ageOf(p.birthYear)) : null;
  const formula = bmr ? Math.round(bmr * wgPalTotal(o)) : null;
  const goal = getGoals(today)?.goal || null;
  const body = e.ok
    ? [`≈ ${fmt(r50(e.tdee))} kcal pro Tag (Spanne ${fmt(r50(e.lo))}–${fmt(r50(e.hi))} kcal). Ø gegessen ${fmt(e.intake)} kcal, Gewichtstrend ${s1(e.slopeWeek)} kg pro Woche.`,
      `Grundlage: ${e.logged} von ${e.win} Tagen mit Einträgen und ${e.weighs} Wiegewerte (${dateShort(e.start)} – ${dateShort(e.end)}).`]
    : [`Noch zu wenige Daten in den letzten ${INS_WIN} Tagen: ${e.logged}/${INS_MIN_LOGGED} Tage mit Essen, ${e.weighs}/${INS_MIN_WEIGHS} Wiegewerte${e.weighs >= INS_MIN_WEIGHS ? ` über ${e.span}/${INS_MIN_SPAN} Tage` : ''}.`];
  const cmp = [[o.src === 'bmr' ? 'Uhr (Grundumsatz × PAL)' : 'Uhr', watch], ['Formel (DGE × PAL)', formula], ['Dein Tagesziel', goal]].filter(([, v]) => v);
  openInfo({
    title: 'Energiebedarf (Schätzung)',
    note: 'Nur Anzeige – die App ändert damit kein Ziel.',
    body: [...body, 'So rechnet die App: Bedarf ≈ Ø Aufnahme − Gewichtsänderung × 7.700 kcal/kg (ähnlich wie MacroFactor).'],
    points: [...(e.ok && cmp.length ? cmp.map(([l, v]) => [l, `${fmt(v)} kcal (${v - r50(e.tdee) >= 0 ? '+' : '−'}${fmt(Math.abs(v - r50(e.tdee)))})`]) : []),
      ['Unvollständige Tage', 'Vergessene Einträge lassen Aufnahme und Bedarf zu niedrig erscheinen.'],
      ['Wasser statt Energie', 'Kreatin-Start, mehr Kohlenhydrate, Salz oder Ballaststoffe ändern das Gewicht ohne Energie (1–2 Wochen).'],
      ['7.700 kcal pro kg', 'Faustregel; bei längerer Abnahme eher zu hoch.'],
      ['Spanne', '95-%-Intervall der Ausgleichsgeraden; die echte Unsicherheit ist größer, weil Wiegewerte nicht unabhängig schwanken.']],
    src: [['MacroFactor – Algorithms and Core Philosophy (Methode; im Calorie-Tracker geprüft 13.10.2026)', null], ['Calorie-Tracker (ST0PTV) – js/insights.js', 'https://github.com/ST0PTV/Calorie-Tracker']]
  });
}

export function analyseView(rerender) {
  const today = isoDate();
  const n = getRange();
  const { start, end, days } = rangeDays(n, today);
  const on = enabled();
  const tracked = days.filter((x) => x.n);
  const withGoal = tracked.filter((x) => x.goal);
  const inBand = withGoal.filter((x) => goalState(x.k, x.goal) === 'ok').length;
  const avgK = avg(tracked, (x) => x.k);

  const log = weights();
  const tr = weightTrend(log, end).filter((x) => x.d >= start);
  const tLast = tr.length ? tr[tr.length - 1].t : null;
  const slope = trendPerWeek(tr);
  const e = expenditure({ today, kcalOf, loggedOf, log });

  const avgP = avg(tracked, (x) => x.p), pg = avg(tracked.filter((x) => x.pg), (x) => x.pg);
  const tiles = [
    tile({ kind: 'goal', name: 'Kalorien', wide: true, value: avgK != null ? `Ø ${fmt(avgK)}` : '–', unit: avgK != null ? 'kcal' : '',
      sub: withGoal.length ? `${inBand} von ${tage(withGoal.length)} im Zielbereich ±10 %` : `${tracked.length} von ${tage(n)} mit Einträgen`,
      viz: kcalBars(days, { h: 52, labels: n === 7 }), onOpen: () => { location.hash = '#/analyse/monat'; }, label: 'Kalorien: Monat und Makros' }),
    tile({ kind: 'wt', name: 'Gewicht', value: tLast != null ? r1(tLast) : '–', unit: tLast != null ? 'kg' : '',
      sub: slope != null ? `${s1(slope)} kg / Woche` : (tLast != null ? 'Trend' : 'noch nicht gewogen'), viz: spark(tr.map((x) => x.t)), onOpen: () => openWeightDetails(today) }),
    tile({ kind: 'body', name: 'Energiebedarf', value: e.ok ? `≈ ${fmt(r50(e.tdee))}` : '–', unit: e.ok ? 'kcal' : '',
      sub: e.ok ? `Schätzung, letzte ${INS_WIN} Tage` : `braucht ${INS_MIN_LOGGED} Tage + ${INS_MIN_WEIGHS}× Wiegen`, onOpen: () => openEnergy(today) })
  ];
  if (on.water) {
    const wd = days.filter((x) => x.water > 0), a = avg(wd, (x) => x.water);
    tiles.push(tile({ kind: 'water', name: 'Wasser', value: a != null ? `Ø ${litres(a)}` : '–', unit: a != null ? 'l' : '',
      sub: `Ziel erreicht ${days.filter((x) => x.water >= x.wgoal).length} / ${n}`, viz: spark(days.map((x) => x.water || null)), onOpen: () => openWaterDetails(today) }));
  }
  if (on.caf) {
    const cd = days.filter((x) => x.caf > 0), a = avg(cd, (x) => x.caf), b = avg(cd, (x) => x.cafBed);
    tiles.push(tile({ kind: 'caf', name: 'Koffein', value: a != null ? `Ø ${fmt(a)}` : '–', unit: a != null ? 'mg' : '',
      sub: b != null ? `zur Bettzeit Ø ${fmt(b)} mg` : 'keine Einträge', viz: spark(days.map((x) => x.caf || null)), onOpen: () => openCaffDetails(today, today) }));
  }
  if (on.alc) {
    const ad = days.filter((x) => x.alc > 0);
    tiles.push(tile({ kind: 'alc', name: 'Alkohol', value: fmt(days.reduce((s, x) => s + (x.alc || 0), 0)), unit: 'g',
      sub: ad.length ? `an ${ad.length} von ${tage(n)}` : 'keine Einträge', onOpen: () => openAlcDetails(today, today) }));
  }
  tiles.push(tile({ kind: 'goal', name: 'Eiweiß', value: avgP != null ? `Ø ${fmt(avgP)}` : '–', unit: avgP != null ? 'g' : '',
    sub: pg ? `Ziel Ø ${fmt(pg)} g` : 'Ø pro Tag', viz: spark(days.map((x) => (x.n ? x.p : null))), onOpen: () => { location.hash = '#/analyse/monat'; } }));

  const seg = h('div', { class: 'seg an-seg', role: 'radiogroup', 'aria-label': 'Zeitraum' },
    ...RANGES.map(([k, l]) => h('button', { type: 'button', role: 'radio', 'aria-checked': k === n ? 'true' : 'false', onclick: () => { setRange(k); rerender(); } }, l)));

  return h('div', { class: 'me an' },
    backTo('#/', 'Heute'),
    h('header', { class: 'page-head' }, h('h1', {}, 'Analyse'), h('p', { class: 'sub' }, `${dateShort(start)} – ${dateShort(end)} · ohne heute`)),
    seg,
    h('div', { class: 'an-grid' }, ...tiles),
    h('div', { class: 'an-leg' }, h('span', {}, h('i', { class: 'band' }), 'Band = Ziel ±10 %'), infoBtn('Analyse', averagesInfo)),
    h('h3', { class: 'sec' }, 'Mehr'),
    h('section', { class: 'card list me-grp' },
      moreRow('body', 'flask', 'Mikronährstoffe', '8 Werte aus dem BLS', '#/analyse/mikro'),
      moreRow('goal', 'plans', 'Monat & Makros', 'Kalender, Ø Makros', '#/analyse/monat'),
      moreRow('app', 'list', 'Jahresansicht', 'jeder Tag für sich', '#/analyse/jahr'),
      moreRow('caf', 'clock', 'Magen-Modell', 'Tageskurve (Schätzung)', '#/analyse/magen')),
    h('p', { class: 'an-note' }, 'Schätzungen und Durchschnitte über Tage mit Einträgen. Keine Wertung; kein Ziel wird automatisch geändert.'));
}
