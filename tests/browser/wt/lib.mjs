// Brücke für die aus dem Workout-Tracker übernommenen Browser-Checks (tests/browser/wt/*.mjs):
// gleiche Namen wie Workout-Tracker/tests/browser/lib.mjs (MIT, ST0PTV), Grundlage ist ../lib.mjs von The Tracker.
export { ROOT, rootUrl, appVersion, outDir, loadPlaywright, launch, startServer, checker, BAD_TEXT, settle } from '../lib.mjs';
import { settle } from '../lib.mjs';

// Plan starten – große Karte („Starten“) oder kompakte Zeile (runde Start-Taste). Aus Workout-Tracker lib.mjs (v2.34.0).
export async function startPlan(p, name = null) {
  const big = name ? p.locator('.start-card', { hasText: name }).locator('button', { hasText: 'Starten' }) : p.locator('.start-card button', { hasText: 'Starten' });
  if (await big.count()) { await big.first().click(); return; }
  const row = name ? p.locator('.start-row', { hasText: name }).locator('button.play') : p.locator('.start-row button.play');
  await row.first().click();
}

// Nebenaktion aus dem ⋯-Menü des Training-Tabs (z. B. „Training nachtragen“). Aus Workout-Tracker lib.mjs (v2.34.0).
export async function moreAction(p, label) {
  await p.locator('#view button.dots').click(); await settle(p, 300);
  await p.locator('.sheet :is(button.row, .row > button.t)', { hasText: label }).first().click(); await settle(p, 300);
}
