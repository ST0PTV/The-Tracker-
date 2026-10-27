// Eigenes Rezept anlegen und bearbeiten: Name, Portionen, Zeit, Mahlzeiten, Zutaten (Menge, Einheit, Zutat),
// Schritte; darunter die Rechnung pro Portion gegen den kcal-Rahmen der Mahlzeit. Nach viewNeu/analyze im Rezeptbuch
// (JuliaKelp, MIT). Geändert: ohne Ginger und ohne Spar-Tipps („spart x kcal“) – nur Rahmen, Warnungen und
// unbekannte Zutaten (Regel: keine Anreize für sehr niedrige Zufuhr).
import { h } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { toast, pageHead } from '../../core/ui.js';
import { fmt, r1 } from '../../core/format.js';
import { FOODS, findFood } from './ingredients.js';
import { rs, analyzeOwn, saveOwn, recipeById, UNITS, MAIN_MEALS, MEAL_SHORT, mealBudget, dietForm, blockedAllergens, ALLERGEN_CODES, ALLERGEN_NAMES, DIET_LABEL, MEAL_OF } from './recipes.js';
import { ensureReady, qp } from './parts.js';

let form = null;
const blank = () => ({ id: null, name: '', portions: 2, time: 20, meals: ['dinner'], steps: '', rows: [{ amount: '', unit: 'g', name: '' }, { amount: '', unit: 'g', name: '' }, { amount: '', unit: 'g', name: '' }] });
const fromRecipe = (r) => ({ id: r.id, name: r.name, portions: r.portions, time: r.time, meals: (r.meals || []).map((m) => MEAL_OF[m] || m), steps: r.steps.join('\n'), rows: r.rows.map((x) => ({ ...x, amount: String(x.amount), ...(x.kcal100 != null ? { kcal100: String(x.kcal100) } : {}) })) });
const ALLOWS = { vegan: ['vegan'], vegetarian: ['vegan', 'vegetarisch'], all: ['vegan', 'vegetarisch', 'fisch', 'fleisch'] };

function analysisBox() {
  const a = analyzeOwn(form);
  if (!a.lines.length) return [h('p', { class: 'small muted' }, 'Trag Zutaten mit Mengen ein, dann rechnet die App die Nährwerte aus.')];
  const share = Math.max(...form.meals.map((m) => mealBudget(m)), mealBudget('dinner') * 0);
  const budget = Math.round(share || mealBudget('dinner'));
  const pp = a.perPortion, nut = a.nutrients, P = a.portions;
  const warn = [];
  if (!ALLOWS[dietForm()].includes(a.diet)) warn.push(`Passt nicht zu deiner Ernährungsform (${DIET_LABEL[a.diet]}). Es wird dir deshalb nicht vorgeschlagen.`);
  const bad = a.allergens.filter((x) => blockedAllergens().includes(x));
  if (bad.length) warn.push(`Enthält ${bad.map((x) => ALLERGEN_NAMES[ALLERGEN_CODES[x][0]]).join(', ')} – unter „Ernährung & Rezepte“ als Allergen angegeben.`);
  const disliked = Object.entries(rs().taste).filter(([f, v]) => v === 'no' && a.lines.some((x) => x.row.name.toLowerCase().includes(f.toLowerCase()) || (x.food && x.food.name === f))).map(([f]) => f);
  if (disliked.length) warn.push(`Enthält ${disliked.join(', ')} – laut deinen Angaben magst du das nicht.`);
  return [
    h('div', { class: 'trk-sum own-sum' }, h('b', {}, `≈ ${fmt(pp)}`), h('span', {}, 'kcal pro Portion')),
    h('div', { class: 'rp-bar own-bar' }, h('i', { style: `width:${Math.min(100, (pp / budget) * 100)}%` })),
    h('p', { class: 'small muted' }, `Rahmen für ${form.meals.map((m) => MEAL_SHORT[m]).join('/') || 'die Mahlzeit'}: etwa ${fmt(budget)} kcal · insgesamt ${fmt(a.total)} kcal für ${P} ${P === 1 ? 'Portion' : 'Portionen'}`),
    h('p', { class: 'small' }, `Pro Portion: ${r1(nut.protein / P)} g Eiweiß · ${r1(nut.kh / P)} g Kohlenhydrate · ${r1(nut.fett / P)} g Fett · ${r1(nut.ballast / P)} g Ballaststoffe`),
    a.unknown.length ? h('p', { class: 'small warn' }, `Unbekannt: ${a.unknown.map((x) => x.row.name).join(', ')}. Trag kcal pro 100 g ein, sonst zählen sie nicht mit.`) : null,
    ...warn.map((w) => h('p', { class: 'small warn' }, w)),
    h('p', { class: 'small muted' }, `Ernährungsform aus den Zutaten: ${DIET_LABEL[a.diet]}. Alle Werte sind Schätzungen aus dem BLS 4.0.`)];
}

function ownView(rerender) {
  if (!ensureReady(rerender)) return h('div', {}, h('p', { class: 'small muted' }, 'Nährwerte werden geladen …'));
  const id = qp('id');
  if (!form || (form.id || null) !== (id || null)) { const r = id ? recipeById(id) : null; form = r && r.own ? fromRecipe(r) : blank(); }
  const box = h('div', { class: 'own-ana' });
  const redraw = () => box.replaceChildren(...analysisBox());
  const field = (label, el) => h('label', { class: 'form-label' }, h('span', {}, label), el);
  const inp = (key, attrs) => { const i = h('input', { class: 'input', value: form[key] ?? '', ...attrs }); i.addEventListener('input', () => { form[key] = i.value; redraw(); }); return i; };

  const rowsBox = h('div', { class: 'own-rows' });
  const drawRows = () => rowsBox.replaceChildren(...form.rows.map((row, i) => {
    const amt = h('input', { class: 'input own-amt', inputmode: 'decimal', placeholder: '200', value: row.amount, 'aria-label': `Menge Zutat ${i + 1}` });
    const unit = h('select', { class: 'input own-unit', 'aria-label': `Einheit Zutat ${i + 1}` }, ...UNITS.map(([k, l]) => h('option', { value: k, selected: row.unit === k }, l)));
    const name = h('input', { class: 'input own-name', list: 'own-foods', placeholder: 'Zutat', value: row.name, autocomplete: 'off', 'aria-label': `Zutat ${i + 1}` });
    const unknown = () => row.name.trim() && !findFood(row.name);
    const k100 = h('input', { class: 'input own-k', inputmode: 'numeric', placeholder: 'kcal/100 g', value: row.kcal100 ?? '', 'aria-label': `kcal pro 100 g Zutat ${i + 1}` });
    const kBox = h('label', { class: 'form-label own-kbox', hidden: !unknown() }, h('span', {}, 'Unbekannt – kcal pro 100 g'), k100);
    amt.addEventListener('input', () => { row.amount = amt.value; redraw(); });
    unit.addEventListener('change', () => { row.unit = unit.value; redraw(); });
    name.addEventListener('input', () => { row.name = name.value; kBox.hidden = !unknown(); redraw(); });
    k100.addEventListener('input', () => { row.kcal100 = k100.value; redraw(); });
    return h('div', { class: 'own-row' },
      h('div', { class: 'own-line' }, amt, unit, name,
        h('button', { class: 'icon-btn sm', type: 'button', 'aria-label': `Zutat ${i + 1} entfernen`, onclick: () => { form.rows.splice(i, 1); if (!form.rows.length) form.rows.push({ amount: '', unit: 'g', name: '' }); drawRows(); redraw(); } }, icon('close', { size: 14 }))),
      kBox);
  }));
  drawRows();
  redraw();

  const steps = h('textarea', { class: 'input own-steps', placeholder: 'Zwiebel würfeln.\nIn Öl anbraten.', 'aria-label': 'Schritte' });
  steps.value = form.steps;
  steps.addEventListener('input', () => { form.steps = steps.value; });
  const mealChips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Passt zu' });
  const drawMeals = () => mealChips.replaceChildren(...[...MAIN_MEALS.map(([k]) => k), 'snack'].map((k) => h('button', { class: `chip${form.meals.includes(k) ? ' on' : ''}`, type: 'button', 'aria-pressed': form.meals.includes(k) ? 'true' : 'false', onclick: () => { form.meals = form.meals.includes(k) ? form.meals.filter((x) => x !== k) : form.meals.concat(k); drawMeals(); redraw(); } }, MEAL_SHORT[k])));
  drawMeals();
  const save = () => {
    try { const r = saveOwn(form); form = null; toast('Rezept gespeichert'); location.hash = `#/rezepte/rezept?id=${encodeURIComponent(r.id)}`; }
    catch (e) { toast(e.message, { error: true }); }
  };

  return h('div', { class: 'own' },
    h('a', { class: 'back', href: form.id ? `#/rezepte/rezept?id=${encodeURIComponent(form.id)}` : '#/rezepte' }, icon('chevron', { size: 16, cls: 'flip' }), form.id ? 'Rezept' : 'Rezepte'),
    pageHead(form.id ? 'Rezept bearbeiten' : 'Eigenes Rezept'),
    h('section', { class: 'card' },
      field('Name', inp('name', { placeholder: 'z. B. Omas Kartoffelsuppe', 'aria-label': 'Name' })),
      h('div', { class: 'two' }, field('Portionen', inp('portions', { inputmode: 'numeric', 'aria-label': 'Portionen' })), field('Minuten', inp('time', { inputmode: 'numeric', 'aria-label': 'Minuten' }))),
      h('span', { class: 'label' }, 'Passt zu'), mealChips),
    h('h3', { class: 'sec' }, 'Zutaten (für alle Portionen)'),
    h('section', { class: 'card' }, rowsBox,
      h('datalist', { id: 'own-foods' }, ...FOODS.map((x) => h('option', { value: x.name }))),
      h('button', { class: 'btn block', type: 'button', onclick: () => { form.rows.push({ amount: '', unit: 'g', name: '' }); drawRows(); } }, '+ Zutat')),
    h('h3', { class: 'sec' }, 'Schritte (eine Zeile pro Schritt)'),
    h('section', { class: 'card' }, steps),
    h('h3', { class: 'sec' }, 'Rechnung'),
    h('section', { class: 'card' }, box),
    h('button', { class: 'btn primary block', type: 'button', onclick: save }, 'Rezept speichern'));
}

export const ownRoutes = { '/rezepte/neu': ownView };
