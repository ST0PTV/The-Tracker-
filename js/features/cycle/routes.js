// Zyklus-Routen (#/zyklus …) und „Ich → Zyklus“. Die PIN-Sperre gilt für die ganze App (app.js), nicht einzeln hier.
import { calendarView, dayView, historyView } from './cycle-views.js';
import { knowledgeView } from './cycle-knowledge.js';
import { cycleSettingsView, reportView } from './cycle-settings.js';

export const cycleRoutes = {
  '/zyklus': calendarView,
  '/zyklus/tag': dayView,
  '/zyklus/verlauf': historyView,
  '/zyklus/wissen': knowledgeView,
  '/zyklus/bericht': reportView,
  '/ich/zyklus': cycleSettingsView
};
