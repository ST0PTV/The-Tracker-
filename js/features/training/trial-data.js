// Beispieldaten fürs Probetraining der Einführung (0.5.0): zwei Übungen, ein Plan, ein früheres Training (für vorausgefüllte
// Werte). Aus Workout-Tracker/js/tutorial.js 3.14 (trialData; MIT, ST0PTV); Keys des Trainingsbereichs von The Tracker.
import { exerciseFromPool, poolEntry } from './pool.js';
import { createPlan, createPlanItem, createSession, createEntry, createSet } from './model.js';

export const TRIAL_PLAN_NAME = 'Probetraining';
export const TRIAL_REFS = ['leg-press', 'lat-pulldown'];

/** → { training_exercises, training_groups, training_plans, training_sessions, training_routines } für store.startSandbox. */
export function trialData(now = new Date()) {
  const exercises = TRIAL_REFS.map((r) => exerciseFromPool(poolEntry(r)));
  const plan = createPlan({ name: TRIAL_PLAN_NAME, items: exercises.map((e) => createPlanItem(e.id, { targetSets: 2, repRange: { min: 8, max: 12 } })) });
  const start = new Date(now.getTime() - 2 * 86400000);
  const iso = (min) => new Date(start.getTime() + min * 60000).toISOString();
  const past = createSession({
    planId: plan.id, startedAt: iso(0), endedAt: iso(40), createdAt: iso(0), updatedAt: iso(40),
    entries: exercises.map((e, i) => createEntry(e.id, {
      sets: [0, 1].map((k) => createSet({ type: 'work', weightKg: i === 0 ? 60 : 40, reps: 10 - k, completedAt: iso(5 + i * 15 + k * 3) }))
    }))
  });
  return { training_exercises: exercises, training_groups: [], training_plans: [plan], training_sessions: [past], training_routines: [] };
}
