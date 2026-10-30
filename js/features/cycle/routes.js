// Zyklus-Routen (#/zyklus …) und „Ich → Zyklus“. Mit PIN-Sperre zeigen alle Zyklus-Seiten zuerst den Sperrbildschirm.
import { isLocked } from '../../core/lock.js';
import { lockScreen } from '../me/lock-view.js';
import { calendarView, dayView, historyView } from './cycle-views.js';
import { knowledgeView } from './cycle-knowledge.js';
import { cycleSettingsView, reportView } from './cycle-settings.js';

const guard = (view) => (rerender) => (isLocked('zyklus') ? lockScreen(rerender, 'zyklus') : view(rerender));

export const cycleRoutes = {
  '/zyklus': guard(calendarView),
  '/zyklus/tag': guard(dayView),
  '/zyklus/verlauf': guard(historyView),
  '/zyklus/wissen': knowledgeView,
  '/zyklus/bericht': guard(reportView),
  '/ich/zyklus': guard(cycleSettingsView)
};
