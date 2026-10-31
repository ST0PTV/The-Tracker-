// Beispieldaten für die Entwicklung (The Tracker 0.3.1): Übungen, zwei Pläne und sechs Wochen Trainings.
// Erfunden, nicht aus echten Logs. Alles trägt demo: true und lässt sich gezielt wieder entfernen; echte Daten bleiben.
// Zufall mit festem Startwert, damit Tests und Screenshots reproduzierbar sind. Ohne DOM (in Node testbar).
// Aufbau nach trialData() in js/tutorial.js des Workout-Trackers 3.14.0 (MIT, ST0PTV).
import * as store from './store.js';
import { createPlan, createPlanItem, createSession, createEntry, createSet } from './model.js';
import { exerciseFromPool, poolEntry } from './pool.js';
import { rng } from '../dev/demo.js';

// [Pool-Ref, Startgewicht kg, Steigerung kg je 2 Wochen, Wiederholungsbereich]
const PLAN_A = [['back-squat', 60, 2.5, [6, 10]], ['bench-press-barbell', 50, 2.5, [6, 10]], ['barbell-row', 45, 2.5, [8, 12]], ['lateral-raise-dumbbell', 8, 1, [10, 15]]];
const PLAN_B = [['deadlift', 80, 5, [5, 8]], ['shoulder-press-dumbbell', 16, 1, [8, 12]], ['lat-pulldown', 45, 2.5, [8, 12]], ['bulgarian-split-squat', 12, 2, [8, 12]], ['dumbbell-curl', 10, 1, [10, 15]]];
const CARDIO = 'stationary-bike';
export const DEMO_WEEKS = 6;

const iso = (d) => d.toISOString();
const atTime = (day, h, m) => { const d = new Date(day); d.setHours(h, m, 0, 0); return d; };

/** Erzeugt { exercises, plans, sessions } (alle mit demo: true). Rein, ohne Speicher. */
export function generateTrainingDemo({ now = new Date(), seed = 2030, weeks = DEMO_WEEKS } = {}) {
  const rand = rng(seed);
  const mk = (ref) => ({ ...exerciseFromPool(poolEntry(ref)), demo: true });
  const exA = PLAN_A.map(([ref]) => mk(ref));
  const exB = PLAN_B.map(([ref]) => mk(ref));
  const bike = mk(CARDIO);
  const item = (ex, [, , , [min, max]]) => createPlanItem(ex.id, { targetSets: 3, repRange: { min, max } });
  const planA = { ...createPlan({ name: 'Ganzkörper A (Beispiel)', items: exA.map((e, i) => item(e, PLAN_A[i])) }), demo: true };
  const planB = { ...createPlan({ name: 'Ganzkörper B (Beispiel)', items: exB.map((e, i) => item(e, PLAN_B[i])) }), demo: true };

  const sessions = [];
  const today = new Date(now); today.setHours(12, 0, 0, 0);
  const start = new Date(today); start.setDate(start.getDate() - weeks * 7 + 1);
  let useA = true;
  for (let d = new Date(start); d < today; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay(); // Mo 1, Mi 3, Fr 5 Kraft; Sa 6 Rad; ab und zu fällt ein Tag aus
    const week = Math.floor((d - start) / (7 * 86400000));
    if ([1, 3, 5].includes(dow) && rand() > 0.12) {
      const spec = useA ? PLAN_A : PLAN_B, exs = useA ? exA : exB, plan = useA ? planA : planB;
      useA = !useA;
      const t0 = atTime(d, 17 + Math.floor(rand() * 2), Math.floor(rand() * 50));
      let min = 6;
      const entries = exs.map((ex, i) => {
        const [, kg0, step, [lo, hi]] = spec[i];
        const kg = kg0 + step * Math.floor(week / 2);
        const sets = [0, 1, 2].map((k) => {
          min += 3 + Math.floor(rand() * 2);
          const reps = Math.max(lo, Math.min(hi, hi - k - Math.floor(rand() * 3) + (week % 2)));
          return createSet({ type: 'work', weightKg: kg, reps, completedAt: iso(new Date(t0.getTime() + min * 60000)) });
        });
        const warm = i === 0 ? [createSet({ type: 'warmup', weightKg: Math.round(kg * 0.5 / 2.5) * 2.5, reps: 8, completedAt: iso(new Date(t0.getTime() + 3 * 60000)) })] : [];
        const r = rand();
        return createEntry(ex.id, { plannedExerciseId: ex.id, planItemId: plan.items[i].id, sets: [...warm, ...sets], rating: r < 0.2 ? 'easy' : r > 0.85 ? 'hard' : 'right' });
      });
      const end = iso(new Date(t0.getTime() + (min + 4) * 60000));
      sessions.push({ ...createSession({ planId: plan.id, startedAt: iso(t0), endedAt: end, createdAt: iso(t0), updatedAt: end, entries }), demo: true });
    } else if (dow === 6 && rand() > 0.3) {
      const t0 = atTime(d, 10, Math.floor(rand() * 40));
      const sec = (30 + Math.floor(rand() * 4) * 5) * 60;
      const end = iso(new Date(t0.getTime() + sec * 1000 + 120000));
      const set = createSet({ type: 'work', durationSec: sec, distanceM: Math.round(sec / 3600 * (22 + rand() * 4)) * 1000, intensity: 'moderate', completedAt: end });
      sessions.push({ ...createSession({ startedAt: iso(t0), endedAt: end, createdAt: iso(t0), updatedAt: end, entries: [createEntry(bike.id, { sets: [set] })] }), demo: true });
    }
  }
  return { exercises: [...exA, ...exB, bike], plans: [planA, planB], sessions };
}

const isDemo = (x) => x && x.demo === true;

/** Anzahl der Beispiel-Trainings im Speicher. */
export const trainingDemoCount = () => store.get('sessions').filter(isDemo).length;

/** Entfernt alle Beispiel-Übungen, -Pläne und -Trainings; echte bleiben. Gibt die Zahl der Trainings zurück. */
export function removeTrainingDemo() {
  const n = trainingDemoCount();
  for (const key of ['exercises', 'plans', 'sessions']) store.set(key, store.get(key).filter((x) => !isDemo(x)));
  return n;
}

/** Lädt neue Beispieldaten (alte Beispiele werden vorher entfernt). Gibt die Zahl der Trainings zurück. */
export function loadTrainingDemo(opts) {
  removeTrainingDemo();
  const d = generateTrainingDemo(opts);
  const ok = ['exercises', 'plans', 'sessions'].every((key) => store.set(key, [...store.get(key), ...d[key]]));
  return ok ? d.sessions.length : 0;
}
