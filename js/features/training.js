// Reiter „Training“. Phase 4 bringt den Workout-Tracker (Training, Pläne, Übungen, Fortschritt).
// Große Daten (Animationen, Übungspool) werden dann erst beim Öffnen dieses Reiters geladen.
import { h } from '../core/util.js';
import { pageHead, comingSoon } from '../core/ui.js';

export function trainingView() {
  return h('div', {}, pageHead('Training'), comingSoon('Training, Pläne & Übungen', 4), comingSoon('Fortschritt', 4));
}
