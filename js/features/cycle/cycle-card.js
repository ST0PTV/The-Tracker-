// Zyklus-Karte auf „Heute“. Zwei Stile zur Wahl (Nutzerwunsch 2026-10-29, Mockups B und A):
// - 'strip' (Standard): Tracker-Karte wie Wasser/Koffein, darunter ein Streifen mit einem Feld je Zyklustag;
// - 'ring': Kreis mit Zyklustag nach homeCard/ringSvg in zyklus.js im Rezeptbuch (Copyright (c) 2026 JuliaKelp, MIT).
// Fruchtbare Tage sind immer als Schätzung beschriftet; Erinnerungen stehen als Zeile über der Karte.
import { h } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { trackerCard } from '../../core/tracker-card.js';
import { isLocked } from '../../core/lock.js';
import { isoDate } from '../../core/format.js';
import * as M from './model.js';
import { cycleActive, cycleSettings, cycleAnalysis, cycleDays, dayEntry, showFertile } from './cycle.js';

const SVG = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}) => { const el = document.createElementNS(SVG, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v)); return el; };
const go = (hash) => { location.hash = hash; };
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

/** Art eines Zyklustags im laufenden Zyklus: 'b' Blutung, 's' Schmier, 'f' fruchtbar (Schätzung), '' sonst. */
function kinds(a, days, today, fertOn) {
  const len = Math.max(a.median, a.dayNo);
  return Array.from({ length: len }, (_, i) => {
    const iso = M.addDays(a.last, i);
    const e = days[iso];
    if (iso <= today && M.isBleed(e)) return 'b';
    if (iso <= today && M.isSpot(e)) return 's';
    if (fertOn && a.fert && i + 1 >= a.fert.lo && i + 1 <= a.fert.hi) return 'f';
    return '';
  });
}

function strip(a, ks) {
  return h('div', { class: 'cy-strip', role: 'img', 'aria-label': `Zyklustag ${a.dayNo} von etwa ${a.median}` },
    ...ks.map((k, i) => h('i', { class: `${k}${i + 1 === a.dayNo ? ' now' : ''}`.trim() })));
}

function ring(a, ks) {
  const len = ks.length, cx = 52, cy = 52, r = 40;
  const s = svg('svg', { class: 'cy-ring', width: 104, height: 104, viewBox: '0 0 104 104', role: 'img', 'aria-label': `Zykluskreis: Tag ${a.dayNo} von etwa ${a.median}` });
  const pt = (an) => `${(cx + r * Math.cos(an)).toFixed(1)},${(cy + r * Math.sin(an)).toFixed(1)}`;
  ks.forEach((k, i) => {
    const a0 = ((i + 0.08) / len) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 0.92) / len) * 2 * Math.PI - Math.PI / 2;
    s.append(svg('path', { d: `M${pt(a0)} A${r},${r} 0 0,1 ${pt(a1)}`, class: `seg ${k}`.trim() }));
  });
  const at = ((a.dayNo - 0.5) / len) * 2 * Math.PI - Math.PI / 2;
  s.append(svg('circle', { cx: (cx + r * Math.cos(at)).toFixed(1), cy: (cy + r * Math.sin(at)).toFixed(1), r: 7, class: 'knob' }));
  const t1 = svg('text', { x: 52, y: 46, 'text-anchor': 'middle', class: 'lbl' }); t1.textContent = 'TAG';
  const t2 = svg('text', { x: 52, y: 70, 'text-anchor': 'middle', class: 'num' }); t2.textContent = String(a.dayNo);
  s.append(t1, t2);
  return s;
}

const legend = (fert) => h('div', { class: 'cy-leg' },
  h('span', {}, h('i', { class: 'b' }), 'Periode'),
  fert ? h('span', {}, h('i', { class: 'f' }), 'fruchtbar (Schätzung)') : null);

function reminderLines(a, today, c) {
  const list = M.reminders(a, dayEntry(today), today, nowMin(), { rem: c.rem, method: c.method, phase: c.phase, track: c.track });
  return list.map((t) => h('a', { class: 'cy-rem', href: `#/zyklus/tag?d=${today}` }, icon('clock', { size: 16 }), h('span', {}, t)));
}

/** Karte auf „Heute“ (nur am heutigen Tag, nur wenn der Zyklus an ist). */
export function cycleCard(iso, today = isoDate()) {
  if (!cycleActive() || iso !== today) return null;
  if (isLocked('zyklus')) {
    return h('section', { class: 'card cy-card k-cyc' }, h('div', { class: 'cy-hd' },
      h('div', {}, h('div', { class: 'trk-lbl' }, 'Zyklus'), h('div', { class: 'small muted' }, 'Gesperrt')),
      h('a', { class: 'btn small-btn', href: '#/zyklus' }, 'Entsperren')));
  }
  const c = cycleSettings();
  const a = cycleAnalysis(today);
  const rem = reminderLines(a, today, c);
  const add = () => go(`#/zyklus/tag?d=${today}`);
  if (!a.last) {
    return h('div', {}, ...rem, h('section', { class: 'card cy-card k-cyc cy-empty' },
      h('div', { class: 'cy-hd' }, h('div', {}, h('div', { class: 'trk-lbl' }, 'Zyklus'),
        h('p', { class: 'small muted' }, 'Trag den ersten Tag deiner letzten Periode ein. Ältere Daten übernimmst du unter „Ich → Zyklus“.')),
      h('button', { class: 'trk-plus', type: 'button', 'aria-label': 'Zyklus eintragen', onclick: add }, icon('plus', { size: 24 }))),
      h('a', { class: 'link small', href: '#/zyklus' }, 'Kalender öffnen')));
  }
  const fert = showFertile();
  const ks = kinds(a, cycleDays(), today, fert);
  const next = M.nextText(a, today, { phase: c.phase });
  const n = M.nextPeriod(a, today);
  const pill = M.paused(c.phase) ? 'pausiert' : n.late ? `seit ${n.late} T. fällig` : n.inLo <= 0 ? 'Periode bald' : n.inLo === n.inHi ? `Periode in ${n.inLo} T.` : `Periode in ${n.inLo}–${n.inHi} T.`;
  if (c.card === 'ring') {
    const est = fert && a.fert ? `fruchtbar ${a.ovu.sure ? 'nach LH-Test' : 'geschätzt'} Tag ${a.fert.lo}–${a.fert.hi}` : '';
    return h('div', {}, ...rem, h('section', { class: 'card cy-card cy-ringcard k-cyc' },
      h('a', { href: '#/zyklus', class: 'cy-ring-link', 'aria-label': 'Zum Zykluskalender' }, ring(a, ks)),
      h('div', { class: 't' }, h('div', { class: 'trk-lbl' }, 'Zyklus'), h('div', { class: 'cy-next' }, next),
        est ? h('div', { class: 'small muted' }, est) : null,
        h('div', { class: 'btn-row cy-acts' }, h('button', { class: 'chip', type: 'button', onclick: add }, 'Eintragen'), h('a', { class: 'chip', href: '#/zyklus' }, 'Kalender')))));
  }
  return h('div', {}, ...rem, trackerCard({
    kind: 'cyc', cls: 'cy-card', label: 'Zyklus', value: `Tag ${a.dayNo}`, unit: `/ ~${a.median}`, filled: true,
    pill, pillLate: !!n.late,
    body: h('div', {}, strip(a, ks), legend(fert && !!a.fert)),
    addLabel: 'Zyklus heute eintragen', onAdd: add, onOpen: () => go('#/zyklus')
  }));
}
