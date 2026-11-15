// Wochenrückblick auf „Heute“ (0.5.1, Mockup 3A, Nutzerwahl 2026-11-15): Mo–Mi eine Karte mit sechs Werten der
// Vorwoche, bis „Gelesen“. Nach der Wochenkarte in insights.js des Calorie-Trackers (ST0PTV, MIT).
// Neutral: kein Lob, keine Farben für gut/schlecht; Mittelwerte nur über Tage mit Essens-Einträgen (wie die Analyse).
import { h } from '../../core/util.js';
import * as store from '../../core/store.js';
import { fmt, isoDate, addDays } from '../../core/format.js';
import { dayRow, weights, enabled } from './data.js';
import { weightTrend, trendPerWeek } from './insights.js';
import { mondayOf } from '../journal/week-strip.js';

store.define('review', { seen: null }); // Montag der zuletzt gelesenen Woche

const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/**
 * Werte einer Woche aus Tageszeilen (dayRow) und der Trendänderung (kg/Woche oder null). Rein, ohne Speicher.
 * Gibt { logged, kcal, protein, waterDays, caf, trend } zurück; Werte ohne Grundlage sind null.
 */
export function weekStats(rows, trend, on = { water: true, caf: true }) {
  const food = rows.filter((r) => r.n > 0);
  const caf = rows.filter((r) => r.caf > 0);
  return {
    logged: food.length,
    kcal: avg(food.map((r) => r.k)),
    protein: avg(food.map((r) => r.p)),
    waterDays: on.water ? rows.filter((r) => r.water != null && r.water >= r.wgoal).length : null,
    caf: on.caf ? avg(caf.map((r) => r.caf)) : null,
    trend: trend == null ? null : Math.round(trend * 10) / 10
  };
}

/** Vorwoche (Mo–So) zu today: { start, end }. */
export function lastWeek(today = isoDate()) {
  const start = addDays(mondayOf(today), -7);
  return { start, end: addDays(start, 6) };
}

/** Sichtbar Mo–Mi, wenn die Vorwoche Einträge hat und noch nicht gelesen ist. */
export function reviewDue(today = isoDate(), logged = null) {
  const wd = (new Date(today + 'T12:00:00').getDay() + 6) % 7; // 0 = Mo
  if (wd > 2) return false;
  const { start } = lastWeek(today);
  if (store.get('review').seen === start) return false;
  return logged == null ? true : logged > 0;
}

export const markRead = (today = isoDate()) => store.update('review', (r) => { r.seen = lastWeek(today).start; });

const s1 = (x) => (x > 0 ? '+' : x < 0 ? '−' : '±') + Math.abs(x).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const short = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });

/** Karte für „Heute“ oder null. */
export function reviewCard(iso, today, rerender) {
  if (iso !== today || !reviewDue(today)) return null;
  const { start, end } = lastWeek(today);
  const rows = Array.from({ length: 7 }, (_, i) => dayRow(addDays(start, i)));
  const tr = weightTrend(weights(), end).filter((x) => x.d >= start);
  const st = weekStats(rows, tr.length >= 2 && tr.some((x) => x.w != null) ? trendPerWeek(tr) : null, enabled());
  if (!st.logged) return null;
  const tile = (v, label) => h('div', {}, h('b', {}, v), h('span', {}, label));
  const tiles = [
    tile(`${st.logged}/7`, 'Tage erfasst'),
    tile(fmt(st.kcal), 'Ø kcal'),
    tile(`${fmt(st.protein)} g`, 'Ø Eiweiß'),
    st.waterDays != null ? tile(String(st.waterDays), st.waterDays === 1 ? 'Tag Wasserziel' : 'Tage Wasserziel') : null,
    st.caf != null ? tile(fmt(st.caf), 'Ø mg Koffein') : null,
    st.trend != null ? tile(s1(st.trend), 'kg Trend (Schätzung)') : null
  ].filter(Boolean);
  return h('section', { class: 'card list rv-card' },
    h('div', { class: 'rv-head' }, h('div', { class: 'rv-cap' }, 'Rückblick'),
      h('h2', {}, `Letzte Woche · ${short(start)}–${short(end)}`)),
    h('div', { class: 'rv-tiles' }, ...tiles),
    h('div', { class: 'rv-foot' },
      h('a', { class: 'link', href: '#/analyse' }, 'Zur Analyse ›'),
      h('button', { class: 'btn small-btn', type: 'button', onclick: () => { markRead(today); rerender(); } }, 'Gelesen')));
}
