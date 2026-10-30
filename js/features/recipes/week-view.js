// Reiter „Rezepte → Woche“, Entwurf A „Tagesliste“ (Nutzerwahl 2026-10-29): eine Karte pro Tag, je Mahlzeit eine Zeile,
// Kreis rechts zum Übernehmen, Tipp auf die Zeile für Rezept, Andere oder Tauschen. Blasse Zeilen sind Vorschläge.
// Aufbau nach viewWoche im Rezeptbuch (JuliaKelp, MIT); statt Tabelle eine Liste, ohne Stempel und Ginger-Texte.
import { h } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { toast } from '../../core/ui.js';
import { openSheet } from '../../core/sheet.js';
import { openInfo, infoBtn } from '../../core/info.js';
import { fmt, isoDate, dayLabel } from '../../core/format.js';
import { rs, recipeById, kcalOfRecipe, kcalGoal, hasGoal, MEAL_SHORT } from './recipes.js';
import { ensureReady, thumb, recipeHref, subnav, fmtFactor } from './parts.js';
import { deficits, person } from '../analyse/deficits.js';
import { planAverage } from '../analyse/dge.js';
import { ensureWeek, wk, dayFactors, dayKcal, dayMicros, slotKey, setOk, setAllOk, remix, otherFor, canSwap, swap, planMeals, togglePlanMeal,
  weekPortions, setWeekPortions, setFit, PLAN_MEALS, FIT_MIN, FIT_MAX } from './week.js';

const MEAL_LONG = { breakfast: 'Frühstück', lunch: 'Mittagessen', dinner: 'Abendessen', snack: 'Snack' };
const round10 = (x) => Math.round(x / 10) * 10;
const shortDay = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' });
const longDay = (iso, today) => (dayLabel(iso, today) === 'Heute' || dayLabel(iso, today) === 'Morgen' ? dayLabel(iso, today)
  : new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'numeric' }));

export function weekInfo() {
  openInfo({
    title: 'Mengen im Wochenplan',
    body: ['Die App rechnet jedes Gericht so hoch oder herunter, dass der Tag ungefähr zu deinem kcal-Rahmen passt: die Summe der Anteile der geplanten Mahlzeiten an deinem Tagesziel (Frühstück 25 %, Mittag 35 %, Abend 40 %, Snack 10 %; bei 2 Mahlzeiten je 35 %, Snack 15 %).',
      `Jedes Gericht bleibt zwischen ${fmtFactor(FIT_MIN)}× und ${fmtFactor(FIT_MAX)}× der Rezeptmenge, gerundet auf 0,05. Passt der Tag damit nicht, bleibt er darüber oder darunter.`,
      'Grenzen: Es zählen nur die kcal, nicht Eiweiß oder Sättigung. Die kcal der Rezepte sind Schätzungen aus dem BLS 4.0. Snacks und Getränke außerhalb des Plans sind nicht eingerechnet. Dein Verbrauch von der Uhr fließt nicht ein.'],
    src: [['Rezeptbuch (JuliaKelp) – Wochenplan und Mengenfaktoren, MIT', 'https://github.com/juliakelp/Rezeptbuch']]
  });
}

function slotSheet(k, today, rerender) {
  const w = wk(), s = w.slots[k], r = s && recipeById(s.id);
  if (!r) return;
  const [day, meal] = k.split('|');
  const f = dayFactors(day)[k] || 1;
  let sheet = null;
  const again = () => { sheet.close(); rerender(); };
  const targets = Object.keys(w.slots)
    .filter((x) => x !== k && planMeals().includes(x.split('|')[1]) && x.split('|')[0] >= today && canSwap(k, x))
    .sort();
  sheet = openSheet(h('div', { class: 'wk-sheet' },
    h('p', { class: 'small muted' }, `${longDay(day, today)} · ${MEAL_SHORT[meal]} · ${fmt(round10(kcalOfRecipe(r) * f))} kcal${f !== 1 ? ` (${fmtFactor(f)}× Menge, Schätzung)` : ' (Schätzung)'} · ${r.time} Min`),
    h('button', { class: `btn ${s.ok ? '' : 'primary '}block`, type: 'button', onclick: () => { setOk(k, !s.ok); again(); } },
      s.ok ? 'Nicht mehr übernehmen' : 'Übernehmen'),
    h('div', { class: 'btn-row wk-sheet-row' },
      h('a', { class: 'btn', href: recipeHref(r, meal, f), onclick: () => sheet.close() }, 'Rezept öffnen'),
      h('button', { class: 'btn', type: 'button', onclick: () => { const n = otherFor(k, today); if (!n) toast('Kein anderes passendes Rezept gefunden.'); again(); } }, 'Anderes Rezept')),
    targets.length ? h('h3', { class: 'sec' }, 'Tauschen mit') : null,
    targets.length ? h('div', { class: 'chips wk-swap' }, ...targets.map((x) => {
      const [d2, m2] = x.split('|'), r2 = recipeById(w.slots[x].id);
      return h('button', { class: 'chip', type: 'button', 'aria-label': `Tauschen mit ${shortDay(d2)} ${MEAL_SHORT[m2]}: ${r2.name}`, onclick: () => { swap(k, x); again(); } },
        `${shortDay(d2)} · ${MEAL_SHORT[m2]}`);
    })) : null), { title: r.name });
}

function row(k, s, f, today, rerender) {
  const r = recipeById(s.id), meal = k.split('|')[1];
  return h('div', { class: `wk-row${s.ok ? ' ok' : ' prop'}` },
    h('button', { class: 'wk-main', type: 'button', 'aria-label': `${MEAL_SHORT[meal]}: ${r.name}${s.ok ? '' : ', Vorschlag'}. Optionen`, onclick: () => slotSheet(k, today, rerender) },
      thumb(r, { size: 48, peek: 40 }),
      h('span', { class: 't' },
        h('em', {}, s.ok ? MEAL_SHORT[meal] : `${MEAL_SHORT[meal]} · Vorschlag`),
        h('b', {}, r.name),
        h('small', {}, `${fmt(round10(kcalOfRecipe(r) * f))} kcal${f !== 1 ? ` · ${fmtFactor(f)}× Menge` : ''} · ${r.time} Min`))),
    h('button', { class: `wk-ok${s.ok ? ' on' : ''}`, type: 'button', role: 'checkbox', 'aria-checked': s.ok ? 'true' : 'false', 'aria-label': `${r.name} übernehmen`, onclick: () => { setOk(k, !s.ok); rerender(); } },
      h('i', {}, s.ok ? icon('check', { size: 16 }) : null)));
}

function settingsCard(rerender) {
  const meals = planMeals(), n = weekPortions(), fit = wk().fit !== false;
  const fitBox = h('input', { type: 'checkbox', checked: fit, onchange: () => { setFit(fitBox.checked); rerender(); } });
  return h('section', { class: 'card wk-set' },
    h('h2', {}, 'Plan'),
    h('div', { class: 'chips', role: 'group', 'aria-label': 'Welche Mahlzeiten planen' },
      ...PLAN_MEALS.map((m) => h('button', { class: `chip${meals.includes(m) ? ' on' : ''}`, type: 'button', 'aria-pressed': meals.includes(m) ? 'true' : 'false',
        disabled: meals.length === 1 && meals.includes(m), onclick: () => { togglePlanMeal(m); rerender(); } }, MEAL_LONG[m]))),
    h('div', { class: 'wk-por' },
      h('span', {}, 'Portionen für den Einkauf'),
      h('div', { class: 'rp-stp', role: 'group', 'aria-label': 'Portionen' },
        h('button', { class: 'icon-btn sm', type: 'button', 'aria-label': 'Eine Portion weniger', disabled: n <= 1, onclick: () => { setWeekPortions(n - 1); rerender(); } }, icon('minus', { size: 16 })),
        h('b', {}, String(n)),
        h('button', { class: 'icon-btn sm', type: 'button', 'aria-label': 'Eine Portion mehr', disabled: n >= 12, onclick: () => { setWeekPortions(n + 1); rerender(); } }, icon('plus', { size: 16 })))),
    h('label', { class: 'check-row' }, fitBox, h('span', {}, 'Mengen an mein Tagesziel anpassen')));
}

// Ärztlich festgestellter Mangel (0.3.0, Entwurf W2): Tagesschnitt aus dem Plan je Nährstoff gegen den DGE-Wert.
function deficitCard(days) {
  const ids = deficits();
  if (!ids.length) return null;
  const rows = planAverage(days.map((d) => dayMicros(d, ids)), ids, person());
  const num = (v) => (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10).toLocaleString('de-DE');
  return h('section', { class: 'card wk-def' },
    h('div', { class: 'wk-def-h' }, 'Aus dem Plan, Schnitt pro Tag (Schätzung)'),
    ...rows.flatMap((x) => [
      h('div', { class: 'wk-def-l' }, h('span', {}, x.name), h('span', {}, `${num(x.v)} / ${num(x.ref)} ${x.unit}`)),
      h('div', { class: 'wk-def-bar', role: 'img', 'aria-label': `${x.name}: ${num(x.v)} von ${num(x.ref)} ${x.unit} pro Tag` }, h('i', { style: `width:${Math.min(100, x.pct)}%` }))]),
    h('p', { class: 'small muted' }, `Gerichte mit viel davon kommen öfter dran. Bezug: DGE-Referenzwerte für Gesunde – bei einem Mangel legt deine Ärztin fest, wie viel du brauchst und ob du ergänzt.${ids.includes('vd') ? ' Vitamin D steckt in wenigen Lebensmitteln.' : ''} Zutaten ohne Wert zählen nicht mit.`));
}

function weekView(rerender) {
  if (!rs().started) { setTimeout(() => { location.hash = '#/rezepte/start'; }, 0); return h('div', {}); }
  const head = h('header', { class: 'page-head' }, h('h1', {}, 'Woche'));
  if (!ensureReady(rerender)) return h('div', {}, head, subnav('/rezepte/woche'), h('section', { class: 'card' }, h('p', { class: 'small muted' }, 'Nährwerte werden geladen …')));
  const today = isoDate();
  const { days, meals, slots } = ensureWeek(today);
  const shown = days.flatMap((d) => meals.map((m) => slots[slotKey(d, m)]).filter(Boolean));
  const okN = shown.filter((s) => s.ok).length;
  const all = shown.length > 0 && okN === shown.length;

  return h('div', { class: 'wk' },
    head, subnav('/rezepte/woche'),
    h('div', { class: 'wk-sum' },
      h('b', {}, `${okN} von ${shown.length} übernommen`),
      h('span', {}, hasGoal(today) ? `Ziel ca. ${fmt(kcalGoal(today))} kcal pro Tag` : 'ohne Tagesziel mit 2.000 kcal gerechnet', infoBtn('Mengen im Wochenplan', weekInfo))),
    h('div', { class: 'btn-row wk-bar' },
      h('button', { class: 'btn', type: 'button', disabled: !shown.length, onclick: () => { setAllOk(!all, today); rerender(); } }, all ? 'Keins übernehmen' : 'Alle übernehmen'),
      h('button', { class: 'btn', type: 'button', disabled: all, onclick: () => { remix(today); rerender(); } }, 'Rest neu mischen')),
    deficitCard(days),
    shown.length ? null : h('section', { class: 'card' }, h('p', { class: 'small muted' }, 'Gerade passt kein Rezept zu deinen Einstellungen. Ändere Ernährungsform, Geschmack oder Kochzeit unter „Ich → Ernährung & Rezepte“.')),
    ...days.map((d) => {
      const f = dayFactors(d);
      const rows = meals.filter((m) => slots[slotKey(d, m)]).map((m) => row(slotKey(d, m), slots[slotKey(d, m)], f[slotKey(d, m)] || 1, today, rerender));
      if (!rows.length) return null;
      return h('section', { class: 'wk-day' },
        h('div', { class: 'wk-dh' }, h('b', {}, longDay(d, today)), h('span', {}, `≈ ${fmt(round10(dayKcal(d)))} kcal`)),
        h('div', { class: 'card list' }, ...rows));
    }),
    h('p', { class: 'small muted page-note' }, 'Blasse Zeilen sind Vorschläge. Tipp auf den Kreis zum Übernehmen, auf die Zeile für Rezept, ein anderes Rezept oder Tauschen. Übernommene Gerichte kommen auf die Einkaufsliste und unter Rezepte zuerst. kcal mit Menge sind Schätzungen.'),
    settingsCard(rerender),
    h('p', { class: 'small muted page-note' }, 'Ernährungsform, Allergene, Geschmack und Kochzeiten gelten auch hier. ', h('a', { class: 'link', href: '#/ich/ernaehrung' }, 'Ändern')));
}

export const weekRoutes = { '/rezepte/woche': weekView };
