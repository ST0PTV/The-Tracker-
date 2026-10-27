// Routen der Analyse (unter dem Reiter „Heute“: tabOf('/analyse') → '/').
import { analyseView } from './analyse-view.js';
import { microView, monthView, yearView } from './analyse-pages.js';
import { stomachView } from './stomach-view.js';

export const analyseRoutes = {
  '/analyse': analyseView,
  '/analyse/mikro': microView,
  '/analyse/monat': monthView,
  '/analyse/jahr': yearView,
  '/analyse/magen': stomachView
};
