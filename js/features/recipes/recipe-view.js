// Rezeptseite, Entwurf P1 „untereinander“ (Nutzerwahl 2026-10-27): Bild, Titel, Aktionen, Makros pro Portion,
// Zutaten mit Portionen, Nährwerte gegen die Tagesziele, Schritte zum Abhaken, Notiz, unten Mahlzeit + „Gekocht“.
// Nach viewRezept im Rezeptbuch (JuliaKelp, MIT); ohne Stempel, XP und Ginger-Sprechblasen.
// „Gekocht“ trägt 1 Portion über recipes.cookRecipe ins Journal ein (Rückgängig im Hinweis). Kommt man aus dem
// Wochenplan (Parameter f), zählt dessen Mengenfaktor. „Einplanen“ setzt das Rezept an Tage im Wochenplan (0.2.3).
import { h } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { toast } from '../../core/ui.js';
import { openSheet } from '../../core/sheet.js';
import { openInfo, infoBtn } from '../../core/info.js';
import { fmt, r1, isoDate } from '../../core/format.js';
import { getGoals } from '../../core/profile.js';
import { mealByMin } from '../journal/journal.js';
import { nutrientsOfText } from './ingredients.js';
import { rs, recipeById, recipeNutrients, kcalOfRecipe, isFav, toggleFav, reject, unreject, rejectFood, setNote, toggleStep,
  setRs, scaledIngredients, cookRecipe, undoCook, removeOwn, restoreOwn, DIET_LABEL, MEAL_SHORT, MEAL_OF, mealBudget } from './recipes.js';
import { ensureReady, qp, thumb, fmtFactor } from './parts.js';
import { weekDays, wk, slotKey, planAt, unplanAt, planMeals, togglePlanMeal, ensureWeek } from './week.js';

const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const portionsUi = {}; // { id: Portionen } nur für diese Sitzung
const mealUi = {};

export function recipeInfo() {
  openInfo({
    title: 'Nährwerte der Rezepte',
    body: ['Die Werte rechnet die App aus den Zutaten mit dem Bundeslebensmittelschlüssel (BLS 4.0): jede Zutat ist einem BLS-Lebensmittel zugeordnet, Mengen wie „1 Zwiebel“ oder „1 EL“ sind in Gramm umgerechnet.',
      'Das sind Schätzungen: Sorten, Größen und Garverluste unterscheiden sich. Gewürze ohne Menge zählen nicht.',
      'Die Balken zeigen den Anteil an deinen Tageszielen (Ich → Tagesziel); beim freien Zucker ist das Ziel eine Höchstmenge.'],
    src: [['Max Rubner-Institut (2025). Bundeslebensmittelschlüssel (BLS) 4.0, CC BY 4.0', 'https://doi.org/10.25826/Data20251217-134202-0'], ['Rezeptbuch (JuliaKelp) – Rezepte und Zutaten-Zuordnung, MIT', 'https://github.com/juliakelp/rezeptbuch']]
  });
}

function nutrientCard(r) {
  const n = recipeNutrients(r), g = getGoals() || {};
  const rows = [['Kalorien', kcalOfRecipe(r), g.goal, 'kcal'], ['Eiweiß', n.protein, g.protein, 'g'], ['Kohlenhydrate', n.kh, g.carbs, 'g'], ['davon Zucker', n.zucker, null, 'g', true],
    ['freier Zucker', n.zugesetzt, g.sugar, 'g', true, true], ['Fett', n.fett, g.fat, 'g'], ['Ballaststoffe', n.ballast, g.fiber, 'g']];
  return h('section', { class: 'card rp-nut' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Nährwerte pro Portion'), infoBtn('Nährwerte', recipeInfo)),
    ...rows.map(([label, v, goal, unit, sub, max]) => h('div', { class: `rp-nrow${sub ? ' sub' : ''}` },
      h('span', {}, label), h('b', {}, `${unit === 'kcal' ? fmt(v) : r1(v)} ${unit}`),
      goal ? h('span', { class: 'rp-bar' }, h('i', { style: `width:${Math.min(100, (v / goal) * 100)}%` })) : h('span', {}),
      h('small', {}, goal ? `${Math.round((v / goal) * 100)} %` : ''))),
    h('p', { class: 'small muted' }, 'Prozent vom Tagesziel, beim freien Zucker von der Höchstmenge. Schätzung aus dem BLS 4.0.'));
}

function rejectSheet(r, rerender) {
  let sheet = null;
  const foods = [...new Set(r.foods || [])].filter((f) => rs().taste[f] !== 'no');
  const done = (msg, undo) => { sheet.close(); toast(msg, { action: { label: 'Rückgängig', onClick: () => { undo(); rerender(); } } }); location.hash = '#/rezepte'; };
  sheet = openSheet(h('div', {},
    h('p', { class: 'small muted page-note' }, 'Ähnliche Rezepte kommen danach seltener. Tippst du eine Zutat an, schlägt die App nichts mehr damit vor.'),
    foods.length ? h('div', { class: 'chips' }, ...foods.map((f) => h('button', { class: 'chip', type: 'button', onclick: () => { const prev = rs().taste[f]; rejectFood(r.id, f); done(`${f} wird nicht mehr vorgeschlagen`, () => setRs({ taste: Object.fromEntries(Object.entries({ ...rs().taste, [f]: prev }).filter(([, v]) => v)) })); } }, f))) : null,
    h('button', { class: 'btn primary block', type: 'button', onclick: () => { reject(r.id); done('Rezept wird nicht mehr vorgeschlagen', () => unreject(r.id)); } }, 'Nur dieses Rezept')), { title: 'Was magst du daran nicht?' });
}

function planSheet(r, rerender) {
  let sheet = null, meal = null;
  const meals = (r.meals || []).map((m) => MEAL_OF[m] || m).filter((m) => ['breakfast', 'lunch', 'dinner', 'snack'].includes(m));
  const body = h('div', {});
  const draw = () => {
    ensureWeek();
    const plan = planMeals();
    meal = meal || meals.find((m) => plan.includes(m)) || meals[0];
    const days = weekDays();
    const isOn = (d) => { const s = wk().slots[slotKey(d, meal)]; return !!(s && s.ok && s.id === r.id && plan.includes(meal)); };
    body.replaceChildren(
      meals.length > 1 ? h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Mahlzeit' }, ...meals.map((m) => h('button', { type: 'button', role: 'radio', 'aria-checked': m === meal ? 'true' : 'false', onclick: () => { meal = m; draw(); } }, MEAL_SHORT[m]))) : null,
      h('div', { class: 'chips wk-days' }, ...days.map((d, i) => h('button', { class: `chip${isOn(d) ? ' on' : ''}`, type: 'button', 'aria-pressed': isOn(d) ? 'true' : 'false',
        onclick: () => { if (!plan.includes(meal)) togglePlanMeal(meal); if (isOn(d)) unplanAt(d, meal); else planAt(r.id, d, meal); draw(); } },
        i === 0 ? 'Heute' : new Date(d + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric' })))),
      h('p', { class: 'small muted' }, plan.includes(meal) ? 'Tipp auf die Tage, an denen du es essen willst. Es steht dann übernommen im Wochenplan und auf der Einkaufsliste.' : `${MEAL_SHORT[meal]} wird im Wochenplan dazugenommen.`),
      h('button', { class: 'btn primary block', type: 'button', onclick: () => sheet.close() }, 'Fertig'));
  };
  draw();
  sheet = openSheet(body, { title: 'Einplanen', onClose: rerender });
}

function recipeView(rerender) {
  const id = qp('id');
  if (!ensureReady(rerender)) return h('div', {}, h('p', { class: 'small muted' }, 'Nährwerte werden geladen …'));
  const r = id ? recipeById(id) : null;
  if (!r) return h('div', {}, h('a', { class: 'back', href: '#/rezepte' }, icon('chevron', { size: 16, cls: 'flip' }), 'Rezepte'), h('section', { class: 'card' }, h('p', {}, 'Dieses Rezept gibt es nicht mehr.')));
  const s = rs();
  const n = portionsUi[r.id] || s.portions || 1;
  const nut = recipeNutrients(r);
  const meals = (r.meals || []).map((m) => MEAL_OF[m] || m);
  const meal = mealUi[r.id] || (['breakfast', 'lunch', 'dinner', 'snack'].includes(qp('m')) ? qp('m') : meals.includes(mealByMin(nowMin())) || !meals.length ? mealByMin(nowMin()) : meals[0]);
  const done = new Set(s.cooking[r.id] || []);
  const doneN = r.steps.filter((_, i) => done.has(i)).length;
  const share = Math.round((kcalOfRecipe(r) / mealBudget(meal)) * 100);
  const fq = Number(qp('f'));
  const factor = fq >= 0.5 && fq <= 2 ? Math.round(fq * 20) / 20 : 1;

  const note = h('textarea', { class: 'input rp-note', placeholder: 'z. B. mit mehr Knoblauch', 'aria-label': 'Meine Notiz' });
  note.value = s.notes[r.id] || '';
  note.addEventListener('change', () => setNote(r.id, note.value));

  const cook = () => {
    try {
      const iso = isoDate();
      const e = cookRecipe(r, meal, factor);
      toast(`${r.name} als ${MEAL_SHORT[meal]} eingetragen`, { action: { label: 'Rückgängig', onClick: () => { undoCook(iso, e); rerender(); } } });
      rerender();
    } catch (err) { toast(err.message, { error: true }); }
  };
  const del = () => {
    const gone = removeOwn(r.id);
    location.hash = '#/rezepte';
    toast(`${r.name} gelöscht`, { action: { label: 'Rückgängig', onClick: () => restoreOwn(gone) } });
  };

  return h('div', { class: 'rp' },
    h('a', { class: 'back', href: '#/rezepte' }, icon('chevron', { size: 16, cls: 'flip' }), 'Rezepte'),
    thumb(r, { size: 0, cls: 'rp-hero', peek: 110 }),
    h('h1', {}, r.name),
    h('p', { class: 'rp-meta' }, [`${r.time} Min`, r.prep ? 'am Vorabend vorbereiten' : null, r.mealprep && !r.prep ? 'gut zum Vorkochen' : null, DIET_LABEL[r.diet] || null, r.own ? 'eigenes Rezept' : null].filter(Boolean).join(' · ')),
    h('div', { class: 'rp-acts' },
      h('button', { class: `chip${isFav(r) ? ' on' : ''}`, type: 'button', 'aria-pressed': isFav(r) ? 'true' : 'false', onclick: () => { toggleFav(r.id); rerender(); }, 'aria-label': isFav(r) ? 'Favorit, antippen zum Entfernen' : 'Zu Favoriten' }, icon('heart', { size: 16 }), 'Favorit'),
      r.own
        ? h('a', { class: 'chip', href: `#/rezepte/neu?id=${encodeURIComponent(r.id)}` }, 'Bearbeiten')
        : h('button', { class: 'chip', type: 'button', onclick: () => rejectSheet(r, rerender) }, 'Mag ich nicht'),
      h('button', { class: 'chip', type: 'button', onclick: () => planSheet(r, rerender) }, 'Einplanen')),
    h('div', { class: 'rp-macros' },
      ...[[fmt(kcalOfRecipe(r)), 'kcal'], [`${fmt(nut.protein)} g`, 'Eiweiß'], [`${fmt(nut.kh)} g`, 'KH'], [`${fmt(nut.fett)} g`, 'Fett']].map(([v, l]) => h('div', {}, h('b', {}, v), h('span', {}, l)))),
    h('p', { class: 'small muted page-note' }, `Pro Portion etwa ${share} % deines kcal-Rahmens für ${({ breakfast: 'das Frühstück', lunch: 'das Mittagessen', dinner: 'das Abendessen', snack: 'einen Snack' })[meal]} (Schätzung).`),
    h('section', { class: 'card' },
      h('div', { class: 'card-head rp-portions' }, h('h2', {}, 'Zutaten'),
        h('div', { class: 'rp-stp', role: 'group', 'aria-label': 'Portionen' },
          h('button', { class: 'icon-btn sm', type: 'button', 'aria-label': 'Eine Portion weniger', disabled: n <= 1, onclick: () => { portionsUi[r.id] = n - 1; rerender(); } }, icon('minus', { size: 16 })),
          h('b', {}, `${n} ${n === 1 ? 'Portion' : 'Portionen'}`),
          h('button', { class: 'icon-btn sm', type: 'button', 'aria-label': 'Eine Portion mehr', disabled: n >= 12, onclick: () => { portionsUi[r.id] = n + 1; rerender(); } }, icon('plus', { size: 16 })))),
      h('ul', { class: 'rp-ing' }, ...scaledIngredients(r, n).map((line) => {
        const k = r.own ? 0 : nutrientsOfText(line).kcal;
        return h('li', {}, h('span', {}, line), k >= 1 ? h('small', {}, `${fmt(k)} kcal`) : null);
      }))),
    h('h3', { class: 'sec' }, `Zubereitung · ${doneN} von ${r.steps.length}`),
    h('section', { class: 'card list rp-steps' }, ...r.steps.map((st, i) => h('button', { class: `rp-step${done.has(i) ? ' done' : ''}`, type: 'button', role: 'checkbox', 'aria-checked': done.has(i) ? 'true' : 'false', onclick: () => { toggleStep(r.id, i); rerender(); } },
      h('i', {}, done.has(i) ? icon('check', { size: 14 }) : null), h('span', {}, st)))),
    nutrientCard(r),
    h('h3', { class: 'sec' }, 'Meine Notiz'),
    h('section', { class: 'card' }, note, h('small', { class: 'form-hint' }, 'Wird beim Verlassen des Felds gespeichert, nur auf diesem Gerät.')),
    h('div', { class: 'rp-cook' },
      h('span', { class: 'label' }, 'Eintragen als'),
      h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Mahlzeit' }, ...['breakfast', 'lunch', 'dinner', 'snack'].map((m) => h('button', { type: 'button', role: 'radio', 'aria-checked': m === meal ? 'true' : 'false', onclick: () => { mealUi[r.id] = m; rerender(); } }, MEAL_SHORT[m]))),
      factor !== 1 ? h('p', { class: 'small muted' }, `Laut Wochenplan ${fmtFactor(factor)}× die Rezeptmenge, damit der Tag zu deinem Ziel passt (Schätzung).`) : null,
      h('button', { class: 'btn primary block', type: 'button', onclick: cook }, factor !== 1 ? `Gekocht – ${fmtFactor(factor)} Portionen ins Journal` : 'Gekocht – 1 Portion ins Journal'),
      r.own ? h('button', { class: 'btn block rp-del', type: 'button', onclick: del }, 'Rezept löschen') : null));
}

export const recipeRoutes = { '/rezepte/rezept': recipeView };
