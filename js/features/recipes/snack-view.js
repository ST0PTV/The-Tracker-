// „Rezepte → Vorrat → Snack: Was darf ich jetzt?“ (0.5.0): freier Snack-Rahmen und was davon aus dem Vorrat passt.
// Nach viewSnacks im Rezeptbuch (app.js; Copyright (c) 2026 JuliaKelp, MIT); Rechnung in snack.js.
import { h } from '../../core/util.js';
import { toast } from '../../core/ui.js';
import { openSheet } from '../../core/sheet.js';
import { openInfo, infoBtn } from '../../core/info.js';
import { fmt, num, isoDate } from '../../core/format.js';
import { addEntry, entriesOf, entryTotals, removeEntry } from '../journal/journal.js';
import { rs, mealBudget, mainMeals, hasGoal, ideasFor } from './recipes.js';
import { ensureReady, recipeRow } from './parts.js';
import { backLink } from '../../core/setui.js';
import { pantry, foodOf, groupOf, grams, eat, giveBack, microsOfItem } from './pantry.js';
import { usualPortion, snackAllowance, snackAmount, richLevel } from './snack.js';
import { deficits, refOf } from '../analyse/deficits.js';
import { DGE } from '../analyse/dge.js';

let showAll = false;

export function snackInfo() {
  openInfo({
    title: 'Snack-Rahmen',
    body: ['Der Rahmen ist ein Teil deines Tagesziels: 10 % für Snacks, bei zwei Hauptmahlzeiten zweimal 15 %. Hauptmahlzeiten über ihrem Rahmen nehmen davon etwas weg, Mahlzeiten darunter geben Platz dazu.',
      'Je Lebensmittel zeigt die App eine übliche Portion – oder so viel, wie noch in den Rahmen passt und im Vorrat ist. Gesund oder nicht spielt dabei keine Rolle.',
      'Portionen sind Richtwerte (italienische Referenzportionen SINU/LARN 2024, wie im Rezeptbuch); bei Packungen gilt die Portion der Packung, wenn sie kleiner ist.'],
    src: [['SINU (2024). LARN – Livelli di assunzione di riferimento di nutrienti ed energia, V revisione: Porzioni standard', null],
      ['Rezeptbuch (JuliaKelp) – Snack-Rahmen und Portionen, MIT', 'https://github.com/juliakelp/Rezeptbuch']]
  });
}

const richOf = (x, ids) => {
  const m = microsOfItem(x);
  if (!m || !ids.length) return [];
  return ids.filter((id) => richLevel(m[id], refOf(id), !!x.liq) === 2).map((id) => DGE[id].name);
};

function eatSheet(x, a, rerender) {
  const unitG = x.liq ? 'ml' : 'g';
  const input = h('input', { class: 'input', type: 'text', inputmode: 'decimal', 'aria-label': `Menge in ${unitG}`, value: String(a.g || a.portion) });
  let sheet = null;
  const go = () => {
    const g = num(input.value);
    if (!(g > 0)) { toast('Bitte eine Menge eingeben.', { error: true }); return; }
    const iso = isoDate();
    const food = { src: x.src || 'custom', id: x.ref, n: x.n, brand: x.brand, liq: x.liq, serving: x.serving, k: x.k, p: x.p || 0, c: x.c || 0, f: x.f || 0, fi: x.fi || 0, su: x.su || 0, fs: x.fs ?? null };
    const entry = addEntry(iso, food, g, 'snack');
    const used = eat(x.id, g);
    sheet.close(); rerender();
    toast(`${x.n} als Snack eingetragen`, { action: { label: 'Rückgängig', onClick: () => { removeEntry(iso, entry.id); giveBack(used); rerender(); } } });
  };
  sheet = openSheet(h('div', {},
    h('p', { class: 'small muted' }, `${fmt(x.k)} kcal je 100 ${unitG} · übliche Portion ${fmt(a.portion)} ${unitG}`),
    h('label', { class: 'form-label' }, h('span', {}, `Menge (${unitG})`), input),
    h('button', { class: 'btn primary block', type: 'button', onclick: go }, 'Als Snack eintragen'),
    h('p', { class: 'small muted' }, 'Wird vom Vorrat abgezogen, wenn die Menge dort bekannt ist.')), { title: x.n });
}

function snackView(rerender) {
  if (!rs().started) { setTimeout(() => { location.hash = '#/rezepte/start'; }, 0); return h('div', {}); }
  const back = backLink('#/rezepte/vorrat', 'Vorrat');
  const head = h('header', { class: 'page-head' }, h('h1', {}, 'Snack'), h('p', { class: 'sub' }, 'Was darf ich jetzt?'));
  if (!ensureReady(rerender)) return h('div', {}, back, head, h('section', { class: 'card' }, h('p', { class: 'small muted' }, 'Nährwerte werden geladen …')));
  const iso = isoDate();
  const eatenBy = {};
  for (const e of entriesOf(iso)) eatenBy[e.meal] = (eatenBy[e.meal] || 0) + entryTotals(e).k;
  const goal = hasGoal(iso);
  const A = snackAllowance({ eatenBy, budget: (m) => mealBudget(m, iso), mains: mainMeals().map(([id]) => id), mealCount: rs().mealCount });
  const ids = deficits();
  const items = pantry().filter((x) => x.qty !== 0 && x.k > 0).map((x) => {
    const name = foodOf(x), portion = usualPortion(x, name, groupOf(x));
    if (portion == null) return null;
    const a = snackAmount({ portion, k: x.k, stock: grams(x), free: A.free });
    return a ? { x, a: { ...a, portion }, rich: richOf(x, ids) } : null;
  }).filter(Boolean)
    .sort((p, q) => (q.x.snack ? 1 : 0) - (p.x.snack ? 1 : 0) || q.rich.length - p.rich.length || (q.a.status === 'none' ? -1 : 0) - (p.a.status === 'none' ? -1 : 0) || p.x.n.localeCompare(q.x.n, 'de'));
  const unit = (x) => (x.liq ? 'ml' : 'g');
  const line = ({ x, a }) => a.status === 'full' ? `1 Portion (${fmt(a.g)} ${unit(x)}) · ${fmt(a.kcal)} kcal`
    : a.status === 'stock' ? `${fmt(a.g)} ${unit(x)} · ${fmt(a.kcal)} kcal · mehr hast du nicht da`
      : a.status === 'part' ? `${fmt(a.g)} ${unit(x)} · ${fmt(a.kcal)} kcal · mehr passt heute nicht`
        : `heute nicht mehr drin · 1 Portion (${fmt(a.portion)} ${unit(x)}) hat ${fmt(a.kcal)} kcal`;
  const shown = showAll ? items : items.slice(0, 12);
  const ideas = ideasFor('snack', iso).slice(0, 4);
  return h('div', { class: 'vr sn st k-food' },
    back, head,
    h('section', { class: 'card' },
      h('div', { class: 'trk-sum' }, h('b', {}, goal ? `${fmt(A.free)} kcal` : '–'), h('span', {}, goal ? (A.free > A.total ? `frei für Snacks · Rahmen ${fmt(A.total)} kcal plus ${fmt(A.free - A.total)} aus Mahlzeiten unter ihrem Rahmen` : `frei für Snacks · Rahmen heute ${fmt(A.total)} kcal`) : 'Ohne Tagesziel kein Rahmen'), infoBtn('Snack-Rahmen', snackInfo)),
      !goal ? h('a', { class: 'link', href: '#/ich/ziel' }, 'Tagesziel festlegen') : null),
    h('h3', { class: 'sec' }, 'Aus dem Vorrat'),
    items.length ? h('section', { class: 'card list' }, ...shown.map((it) => h('button', { class: `entry sn-row${it.a.status === 'none' ? ' off' : ''}`, type: 'button', onclick: () => eatSheet(it.x, it.a, rerender) },
      h('span', { class: 't' }, h('b', {}, it.x.n, it.x.snack ? h('span', { class: 'sn-tag' }, 'Snack') : null, ...it.rich.map((r) => h('span', { class: 'sn-tag rich' }, `viel ${r}`))), h('small', {}, line(it))))))
      : h('section', { class: 'card' }, h('p', { class: 'small muted' }, 'Nichts im Vorrat mit üblicher Snack-Portion. Im Vorrat ein Produkt antippen und „Als Snack vorschlagen“ wählen – z. B. einen Riegel.')),
    items.length > 12 ? h('button', { class: 'btn block', type: 'button', onclick: () => { showAll = !showAll; rerender(); } }, showAll ? 'Weniger zeigen' : `Alle ${items.length} zeigen`) : null,
    ideas.length ? h('h3', { class: 'sec' }, 'Snack-Rezepte') : null,
    ideas.length ? h('section', { class: 'card list' }, ...ideas.map((x) => recipeRow(x.recipe, { meal: 'snack', mode: x.mode }))) : null,
    h('p', { class: 'small muted page-note' }, 'Gesund oder nicht spielt keine Rolle. Portionen sind Richtwerte, kcal Schätzungen.'));
}

export const snackRoutes = { '/rezepte/snack': snackView };
