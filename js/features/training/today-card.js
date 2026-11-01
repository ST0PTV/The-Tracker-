// Trainingskarte auf „Heute“ (0.3.2, Variante B, Nutzerwahl 2026-11-01): nächster Plan mit Startknopf,
// darunter die Woche Mo–So (voller Punkt = Krafttraining, Ring = nur Ausdauer) und eine neutrale Zeile
// „Diese Woche: x Trainings · y Sätze“ – ohne Wochenziel, ohne Serie, ohne Bezug zum Essen (Regel §4).
// Läuft ein Training, zeigt die Karte „Training läuft“ und „Fortsetzen“.
// Startgewicht klein halten: statisch nur store + next-plan (≈ 70 KB). Die Dauer-Schätzung (plan-duration.js zieht
// die Plan-Analyse und den Übungspool nach) und das Starten (session.js) kommen per dynamischem Import.
import { h } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { toast } from '../../core/ui.js';
import * as store from './store.js';
import { nextPlan } from './next-plan.js';
import { weekStart } from './week.js';

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const dayIdx = (t) => (new Date(t).getDay() + 6) % 7;
const isHard = (s) => s.completedAt !== null && s.type !== 'warmup';
const go = (hash) => { location.hash = hash; };

/** Reine Zusammenfassung für die Karte (in Node testbar). */
export function todaySummary({ plans, sessions, exercises }, now = new Date()) {
  const running = sessions.find((s) => s.endedAt === null) || null;
  const next = nextPlan(plans.filter((p) => !p.archived), sessions, now);
  const from = weekStart(now).getTime();
  const to = from + 7 * 86400000;
  const week = sessions.filter((s) => s.endedAt !== null && Date.parse(s.startedAt) >= from && Date.parse(s.startedAt) < to);
  const byId = Object.fromEntries(exercises.map((e) => [e.id, e]));
  const cardioOnly = (s) => s.entries.length > 0 && s.entries.every((e) => byId[e.exerciseId]?.kind === 'cardio');
  const days = DAYS.map((label, i) => {
    const ss = week.filter((s) => dayIdx(s.startedAt) === i);
    return { label, today: i === dayIdx(now), kind: !ss.length ? null : ss.every(cardioOnly) ? 'cardio' : 'strength' };
  });
  const sets = week.reduce((n, s) => n + s.entries.reduce((m, e) => (byId[e.exerciseId]?.kind === 'cardio' ? m : m + e.sets.filter(isHard).length), 0), 0);
  let run = null;
  if (running) {
    const plan = plans.find((p) => p.id === running.planId);
    const done = running.entries.filter((e) => e.sets.some((s) => s.completedAt !== null)).length;
    run = { name: plan ? plan.name : 'Freies Training', done, total: running.entries.length, startedAt: running.startedAt };
  }
  return { running: run, next, days, trainings: week.length, sets, hasPlans: plans.some((p) => !p.archived && p.items.length) };
}

const elapsed = (iso) => { const m = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 60000)); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };

// Dauer erst nachladen (Schätzung aus dem Plan, gleiches Modell wie die Plan-Analyse).
// Erst wenn der Browser Zeit hat, damit der Start von „Heute“ nicht wartet.
const idle = globalThis.requestIdleCallback || ((fn) => setTimeout(fn, 300));
function fillDuration(el, plan) {
  idle(() => import('./plan-duration.js').then((D) => {
    const sec = D.planSeconds(plan, store.get('exercises'), store.get('settings'));
    if (sec > 0 && el.isConnected) el.textContent = `${el.dataset.base} · ca. ${Math.max(5, Math.round(sec / 300) * 5)} min`;
  }).catch(() => { /* ohne Dauer */ }));
}

async function start(planId) {
  try {
    const S = await import('./session.js');
    const r = S.startFromPlan(planId);
    if (!r.ok) { toast(r.errors?.[0] || 'Training konnte nicht starten.', { error: true }); return; }
    go('#/training');
  } catch { toast('Trainingsbereich nicht geladen. Bitte einmal online öffnen.', { error: true }); }
}

/** Karte für „Heute“ (nur am heutigen Tag, abschaltbar unter „Ich → Training“). */
export function trainingTodayCard(iso, today) {
  if (iso !== today || store.get('settings').todayCard === false) return null;
  const s = todaySummary({ plans: store.get('plans'), sessions: store.get('sessions'), exercises: store.get('exercises') });
  const lbl = (t) => h('div', { class: 'trk-lbl' }, t);
  const open = () => go('#/training');
  const card = (cls, ...kids) => h('section', { class: `card trk on k-train tt-today ${cls}`.trim(), role: 'button', tabindex: '0', 'aria-label': 'Training öffnen',
    onclick: open, onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } } }, ...kids);
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };

  if (s.running) {
    return card('tt-run', h('div', { class: 'trk-top' },
      h('div', { class: 'tt-main' }, lbl('Training läuft'), h('div', { class: 'tt-name' }, s.running.name),
        h('div', { class: 'small muted' }, `${elapsed(s.running.startedAt)} · ${s.running.done} von ${s.running.total} Übungen`)),
      h('div', { class: 'trk-right' }, h('button', { class: 'btn primary tt-go', type: 'button', onclick: stop(open) }, 'Fortsetzen'))));
  }
  const week = h('div', { class: 'tt-week', role: 'img', 'aria-label': `Diese Woche ${s.trainings} ${s.trainings === 1 ? 'Training' : 'Trainings'}` },
    ...s.days.map((d) => h('div', { class: `tt-day${d.today ? ' now' : ''}` }, h('i', { class: d.kind === 'strength' ? 's' : d.kind === 'cardio' ? 'c' : '' }), h('span', {}, d.label))));
  const foot = h('p', { class: 'small muted tt-foot' }, `Diese Woche: ${s.trainings} ${s.trainings === 1 ? 'Training' : 'Trainings'} · ${s.sets} ${s.sets === 1 ? 'Satz' : 'Sätze'}`);
  if (!s.next) {
    return card('', h('div', { class: 'trk-top' },
      h('div', { class: 'tt-main' }, lbl('Training'), h('div', { class: 'tt-name' }, 'Noch kein Plan'),
        h('div', { class: 'small muted' }, 'Lass dir einen vorschlagen oder lege selbst einen an.')),
      h('div', { class: 'trk-right' }, h('button', { class: 'btn tt-go', type: 'button', onclick: stop(() => go('#/training/plaene')) }, 'Pläne'))),
    s.trainings ? week : null, s.trainings ? foot : null);
  }
  const plan = s.next.plan;
  const n = plan.items.length;
  const base = `${n} ${n === 1 ? 'Übung' : 'Übungen'}${s.next.reason === 'today' ? ' · heute geplant' : ''}`;
  const sub = h('div', { class: 'small muted', 'data-base': base }, base);
  fillDuration(sub, plan);
  return card('', h('div', { class: 'trk-top' },
    h('div', { class: 'tt-main' }, lbl('Training'), h('div', { class: 'tt-name' }, plan.name), sub),
    h('div', { class: 'trk-right' }, h('button', { class: 'trk-plus', type: 'button', 'aria-label': `${plan.name} starten`, onclick: stop(() => start(plan.id)) }, icon('play', { size: 20 })))),
  week, foot);
}
