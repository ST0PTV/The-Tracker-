// Kurzer Start beim ersten Öffnen der Rezepte (Nutzerwunsch 2026-10-27; eine große Einführung folgt später) und
// dieselben Einstellungen unter „Ich → Ernährung & Rezepte“. Nach viewStart1–3 im Rezeptbuch (JuliaKelp, MIT), ohne
// Ginger, Name, Alter und Regel-Frage (Körperdaten und Regel-Frage liegen unter „Schlaf & Körper“, Zyklus seit 0.2.6).
// Ernährungsform und Allergene speichert core/profile.js (diet), alles andere recipes.js.
import { h } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { pageHead } from '../../core/ui.js';
import { fmt } from '../../core/format.js';
import { getGoals } from '../../core/profile.js';
import { rs, setRs, tasteFoods, setTaste, addTasteFood, dietForm, setDietForm, allergenCodes, toggleAllergen, mainMeals,
  DIET_FORMS, ALLERGEN_NAMES, MAIN_MEALS, TIME_OPTIONS } from './recipes.js';
import { qp } from './parts.js';
import { deficits, setDeficit, person } from '../analyse/deficits.js';
import { DGE, DGE_ORDER, dgeRef, dgeNote } from '../analyse/dge.js';

const seg = (label, items, cur, set) => h('div', { class: 'seg', role: 'radiogroup', 'aria-label': label },
  ...items.map(([k, l]) => h('button', { type: 'button', role: 'radio', 'aria-checked': k === cur ? 'true' : 'false', onclick: () => set(k) }, l)));

function dietCards(rerender) {
  const g = getGoals();
  const codes = allergenCodes();
  return [
    h('section', { class: 'card' },
      h('span', { class: 'label' }, 'Wie isst du?'),
      seg('Ernährungsform', DIET_FORMS, dietForm(), (k) => { setDietForm(k); rerender(); }),
      h('span', { class: 'label' }, 'Was verträgst du nicht?'),
      h('div', { class: 'chips', role: 'group', 'aria-label': 'Allergene' }, ...Object.entries(ALLERGEN_NAMES).map(([k, l]) => h('button', {
        class: `chip${codes.includes(k) ? ' on' : ''}`, type: 'button', 'aria-pressed': codes.includes(k) ? 'true' : 'false', onclick: () => { toggleAllergen(k); rerender(); } }, l))),
      h('p', { class: 'small muted' }, 'Rezepte mit diesen Allergenen schlägt die App nicht vor. Die Angaben sind aus den Zutaten geschätzt (z.\u00a0B. Brühe zählt als Sellerie, Essig als Sulfite) und ersetzen keinen Blick auf die Verpackung.')),
    h('p', { class: 'small muted page-note' }, g?.goal ? `Geplant wird mit deinem Tagesziel ${fmt(g.goal)} kcal. ` : 'Noch kein Tagesziel – bis dahin rechnet die Auswahl mit 2.000 kcal. ',
      h('a', { class: 'link', href: '#/ich/ziel' }, g?.goal ? 'Tagesziel ändern' : 'Tagesziel festlegen'))
  ];
}

function tasteCards(rerender) {
  const t = rs().taste;
  const inp = h('input', { class: 'input', placeholder: 'z. B. Kürbis', 'aria-label': 'Lebensmittel ergänzen', autocomplete: 'off' });
  const add = () => { if (inp.value.trim()) { addTasteFood(inp.value); rerender(); } };
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
  return [
    h('p', { class: 'small muted page-note' }, 'Herz für Lieblingsessen: kommt öfter. Kreuz: kommt gar nicht mehr. Ohne Auswahl bleibt alles neutral.'),
    h('section', { class: 'card list taste' }, ...tasteFoods().map((f) => h('div', { class: 'taste-row' },
      h('span', { class: 't' }, f),
      h('button', { class: `icon-btn sm like${t[f] === 'like' ? ' on' : ''}`, type: 'button', 'aria-pressed': t[f] === 'like' ? 'true' : 'false', 'aria-label': `${f} mag ich sehr`, onclick: () => { setTaste(f, 'like'); rerender(); } }, icon('heart', { size: 16 })),
      h('button', { class: `icon-btn sm no${t[f] === 'no' ? ' on' : ''}`, type: 'button', 'aria-pressed': t[f] === 'no' ? 'true' : 'false', 'aria-label': `${f} mag ich nicht`, onclick: () => { setTaste(f, 'no'); rerender(); } }, icon('close', { size: 14 }))))),
    h('div', { class: 'rz-have' }, inp, h('button', { class: 'btn', type: 'button', onclick: add }, 'Dazu'))
  ];
}

function mealCards(rerender) {
  const s = rs();
  return [
    h('section', { class: 'card' },
      h('span', { class: 'label' }, 'Wie oft isst du am Tag?'),
      seg('Mahlzeiten am Tag', [[2, '2 Mahlzeiten'], [3, '3 Mahlzeiten']], s.mealCount, (k) => { setRs({ mealCount: k }); rerender(); }),
      s.mealCount === 2 ? h('span', { class: 'label' }, 'Welche lässt du aus?') : null,
      s.mealCount === 2 ? seg('Ausgelassene Mahlzeit', MAIN_MEALS.map(([k, l]) => [k, l.replace('essen', '')]), s.skip, (k) => { setRs({ skip: k }); rerender(); }) : null,
      s.mealCount === 2 ? h('p', { class: 'small muted' }, 'Die Mahlzeiten bleiben normal groß; der Rest kommt als zwei kleine Snacks.') : null),
    h('h3', { class: 'sec' }, 'Zeit zum Kochen (Minuten)'),
    h('section', { class: 'card' }, ...mainMeals().flatMap(([k, l]) => [h('span', { class: 'label' }, l),
      seg(`Zeit für ${l}`, TIME_OPTIONS.map((n) => [n, String(n)]), s.times[k], (n) => { setRs({ times: { ...rs().times, [k]: n } }); rerender(); })]),
    h('p', { class: 'small muted' }, 'Vorgeschlagen wird nur, was in diese Zeit passt; bei wenig Zeit auch Gerichte zum Vorbereiten am Vorabend.')),
    h('h3', { class: 'sec' }, 'Ich koche meist für'),
    h('section', { class: 'card' }, seg('Portionen', [1, 2, 3, 4, 6].map((n) => [n, String(n)]), s.portions, (n) => { setRs({ portions: n }); rerender(); }),
      h('p', { class: 'small muted' }, 'Danach richten sich die Zutatenmengen; in jedem Rezept einzeln änderbar.'))
  ];
}

const STEPS = [['Ernährung', dietCards], ['Geschmack', tasteCards], ['Mahlzeiten', mealCards]];

function startView(rerender) {
  const i = Math.min(3, Math.max(1, Number(qp('s')) || 1));
  const [title, cards] = STEPS[i - 1];
  const next = () => { if (i < 3) location.hash = `#/rezepte/start?s=${i + 1}`; else { setRs({ started: true }); location.hash = '#/rezepte'; } };
  return h('div', { class: 'me rz-start' },
    h('div', { class: 'rz-steps', 'aria-label': `Schritt ${i} von 3` }, ...[1, 2, 3].map((k) => h('span', { class: k <= i ? 'on' : '' })), h('b', {}, `${i} von 3`)),
    pageHead(i === 1 ? 'Rezepte einrichten' : title, i === 1 ? 'Drei kurze Fragen, damit die Vorschläge passen. Später unter „Ich“ änderbar.' : ''),
    ...cards(rerender),
    h('button', { class: 'btn primary block', type: 'button', onclick: next }, i < 3 ? 'Weiter' : 'Fertig'),
    i > 1 ? h('a', { class: 'link rz-backstep', href: `#/rezepte/start?s=${i - 1}` }, 'Zurück') : null);
}

// Ärztlich festgestellter Mangel (0.3.0, Entwurf S2): je Nährstoff ein Schalter mit DGE-Wert der Person.
function deficitCards(rerender) {
  const on = deficits(), p = person();
  const val = (id) => `${dgeRef(id, p).toLocaleString('de-DE')} ${DGE[id].unit} pro Tag (DGE)${dgeNote(id, p) ? ` · ${dgeNote(id, p)}` : ''}`;
  return [
    h('section', { class: 'card list df-list' }, ...DGE_ORDER.map((id) => {
      const inp = h('input', { type: 'checkbox', role: 'switch', 'aria-label': `Mangel an ${DGE[id].name}` });
      inp.checked = on.includes(id);
      inp.addEventListener('change', () => { setDeficit(id, inp.checked); rerender(); });
      return h('label', { class: 'df-row' }, h('span', { class: 't' }, h('b', {}, DGE[id].name), h('small', {}, val(id))),
        h('span', { class: 'switch' }, inp, h('span', { class: 'slider' })));
    })),
    h('p', { class: 'small muted page-note' }, 'Nur eintragen, was deine Ärztin oder dein Arzt festgestellt hat. Die App bevorzugt dann Rezepte mit viel davon im Verhältnis zu ihren kcal und zeigt den Schnitt im Wochenplan. Das ersetzt keine Behandlung: Wie viel du brauchst und ob du ergänzt, klärst du ärztlich. Die DGE-Werte gelten für Gesunde nach Alter und Geschlecht (unter „Schlaf & Körper“).')];
}

/** „Ich → Ernährung & Rezepte“: alle drei Bereiche auf einer Seite. */
export function prefsView(rerender) {
  return h('div', { class: 'me' },
    h('a', { class: 'back', href: '#/ich' }, icon('chevron', { size: 16, cls: 'flip' }), 'Ich'),
    pageHead('Ernährung & Rezepte', 'Ernährungsform, Allergene, Geschmack, Mahlzeiten und Portionen für die Rezeptvorschläge.'),
    h('h3', { class: 'sec' }, 'Ernährung'), ...dietCards(rerender),
    h('h3', { class: 'sec' }, 'Geschmack'), ...tasteCards(rerender),
    h('h3', { class: 'sec' }, 'Mahlzeiten'), ...mealCards(rerender),
    h('h3', { class: 'sec' }, 'Ärztlich festgestellter Mangel'), ...deficitCards(rerender));
}

export const startRoutes = { '/rezepte/start': startView };
