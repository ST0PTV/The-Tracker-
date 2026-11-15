// Reiter „Rezepte → Vorrat“, Entwurf A „Liste mit −/+“ (Nutzerwahl 2026-10-29): Suche, Scannen, Zutat dazu, Gruppen
// mit Menge zum Ändern; Tipp auf den Namen für Menge, „zählt als“, Gegessen und Entfernen.
// Aufbau nach viewEinkauf/Vorratskammer im Rezeptbuch (JuliaKelp, MIT). Seit 0.5.0 mit Snack-Markierung, „viel …“-Hinweisen
// bei eingetragenem Mangel (richLevel, Filter wie „Mangel“ im Rezeptbuch) und dem Weg zu „Snack: Was darf ich jetzt?“.
import { h } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { toast } from '../../core/ui.js';
import { openSheet } from '../../core/sheet.js';
import { openInfo, infoBtn } from '../../core/info.js';
import { fmt, num, isoDate } from '../../core/format.js';
import { addEntry, mealByMin, mealLabel, removeEntry } from '../journal/journal.js';
import { openAdd } from '../journal/add-sheet.js';
import { FOODS } from './ingredients.js';
import { rs } from './recipes.js';
import { ensureReady, subnav } from './parts.js';
import { pantry, pantryById, label, step, foodOf, groupOf, GROUPS, addFood, addLoose, setQty, setFoodOf, removeItem, restoreItem, eat, giveBack, clearEmpty, UNIT, setSnack, microsOfItem } from './pantry.js';
import { richLevel } from './snack.js';
import { list, switchRow } from '../../core/setui.js';
import { deficits, refOf } from '../analyse/deficits.js';
import { DGE } from '../analyse/dge.js';

const ui = { query: '', rich: null }; // rich: Mangel-ID als Filter (0.5.0)
const levelOf = (x, id) => { const m = microsOfItem(x); return m ? richLevel(m[id], refOf(id), !!x.liq) : null; };
const richNames = (x) => deficits().filter((id) => levelOf(x, id) === 2).map((id) => DGE[id].name);
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const LOOSE = FOODS.filter((f) => !['Gewürze', 'Gekochter Reis', 'Kokosmilch light'].includes(f.name)).map((f) => f.name).sort((a, b) => a.localeCompare(b, 'de'));
const low = (x) => x.qty > 0 && ((x.qu === 'g' || x.qu === 'ml') ? x.qty <= 50 : x.qty <= 0.5);

export function pantryInfo() {
  openInfo({
    title: 'Vorrat',
    body: ['Hier steht, was du zu Hause hast. „Zählt als“ verbindet einen Eintrag mit einer Rezept-Zutat: Beim „Gekocht“ zieht die App diese Zutaten ab (Rückgängig gibt sie zurück), die Einkaufsliste lässt weg, was reicht, und Vorschläge mit vorhandenen Zutaten kommen zuerst.',
      'Ohne Packungsgröße kennt die App nur die Anzahl der Packungen, nicht die Gramm. Dann gilt die Zutat als „da“, wird aber beim Kochen nicht abgezogen.',
      'Alle Mengen sind Schätzungen: Stück und Esslöffel werden über typische Gewichte in Gramm umgerechnet. Die Daten bleiben auf dem Gerät.'],
    src: [['Rezeptbuch (JuliaKelp) – Vorratskammer, MIT', 'https://github.com/juliakelp/Rezeptbuch']]
  });
}

// Menge wählen, wenn ein Lebensmittel aus Suche oder Scan in den Vorrat kommt
function addSheet(food, { onDone } = {}) {
  const liq = !!food.liq;
  const units = [[liq ? 'ml' : 'g', liq ? 'ml' : 'g'], ...(food.pq ? [['pkg', `Packung (${fmt(food.pq)} ${liq ? 'ml' : 'g'})`]] : [])];
  let unit = food.pq ? 'pkg' : units[0][0];
  let sheet = null;
  const input = h('input', { class: 'input', type: 'text', inputmode: 'decimal', 'aria-label': 'Menge', value: unit === 'pkg' ? '1' : String(food.pq || 100) });
  const seg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Einheit' });
  const drawSeg = () => seg.replaceChildren(...units.map(([k, l]) => h('button', { type: 'button', role: 'radio', 'aria-checked': k === unit ? 'true' : 'false', onclick: () => { unit = k; input.value = k === 'pkg' ? '1' : String(food.pq || 100); drawSeg(); } }, l)));
  drawSeg();
  const save = () => {
    const a = num(input.value);
    try { addFood(food, a, unit); } catch (e) { toast(e.message, { error: true }); return; }
    sheet.close();
    toast(`${food.n} im Vorrat`);
    if (onDone) onDone();
  };
  sheet = openSheet(h('div', { class: 'vr-add' },
    h('p', { class: 'small muted' }, `${food.brand ? food.brand + ' · ' : ''}${fmt(food.k || 0)} kcal / 100 ${liq ? 'ml' : 'g'}`),
    units.length > 1 ? seg : null,
    h('label', { class: 'form-label' }, h('span', {}, 'Menge'), input),
    h('button', { class: 'btn primary block', type: 'button', onclick: save }, 'In den Vorrat')), { title: food.n });
  setTimeout(() => input.focus(), 250);
}

function openPicker(tab, rerender) {
  openAdd(isoDate(), 'snack', {
    tab, title: 'In den Vorrat',
    onPick: (food, ctx) => addSheet(food, { onDone: () => { rerender(); ctx.again(); } })
  });
}

function looseSheet(rerender) {
  let sheet = null, unit = 'g';
  const name = h('input', { class: 'input', type: 'search', list: 'vr-foods', placeholder: 'z. B. Zwiebel', 'aria-label': 'Zutat', autocomplete: 'off' });
  const amount = h('input', { class: 'input', type: 'text', inputmode: 'decimal', 'aria-label': 'Menge', value: '' });
  const seg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Einheit' });
  const drawSeg = () => seg.replaceChildren(...[['g', 'g'], ['ml', 'ml'], ['stk', 'Stück']].map(([k, l]) => h('button', { type: 'button', role: 'radio', 'aria-checked': k === unit ? 'true' : 'false', onclick: () => { unit = k; drawSeg(); } }, l)));
  drawSeg();
  const save = () => {
    const f = LOOSE.find((x) => x.toLowerCase() === name.value.trim().toLowerCase());
    if (!f) { toast('Bitte eine Zutat aus der Liste wählen.', { error: true }); return; }
    try { addLoose(f, num(amount.value), unit); } catch (e) { toast(e.message, { error: true }); return; }
    toast(`${f} im Vorrat`);
    name.value = ''; amount.value = ''; name.focus();
    rerender();
  };
  sheet = openSheet(h('div', { class: 'vr-add' },
    h('p', { class: 'small muted' }, 'Für Lose ohne Barcode, z. B. Gemüse vom Markt. Mehrere nacheinander möglich.'),
    h('label', { class: 'form-label' }, h('span', {}, 'Zutat'), name),
    h('datalist', { id: 'vr-foods' }, ...LOOSE.map((n) => h('option', { value: n }))),
    seg,
    h('label', { class: 'form-label' }, h('span', {}, 'Menge'), amount),
    h('button', { class: 'btn primary block', type: 'button', onclick: save }, 'Dazulegen'),
    h('button', { class: 'btn block', type: 'button', onclick: () => sheet.close() }, 'Fertig')), { title: 'Zutat dazulegen' });
  setTimeout(() => name.focus(), 250);
}

function itemSheet(id, rerender) {
  const x = pantryById(id);
  if (!x) return;
  let sheet = null;
  const qty = h('input', { class: 'input', type: 'text', inputmode: 'decimal', 'aria-label': `Menge in ${UNIT[x.qu]}`, value: String(x.qty ?? '').replace('.', ',') });
  const fn = h('select', { class: 'input', 'aria-label': 'Zählt als' },
    h('option', { value: '' }, 'keine Rezept-Zutat'),
    ...LOOSE.map((n) => h('option', { value: n, selected: foodOf(x) === n }, n)));
  const unitG = x.liq ? 'ml' : 'g';
  const eatG = h('input', { class: 'input', type: 'text', inputmode: 'decimal', 'aria-label': `Gegessen in ${unitG}`, value: String(Math.round(x.serving || (x.ug && x.qu !== 'g' && x.qu !== 'ml' ? x.ug : 100))) });
  const saveQty = () => { const q = num(qty.value); if (!(q >= 0)) { toast('Bitte eine Menge eingeben.', { error: true }); return; } setQty(id, q); setFoodOf(id, fn.value); sheet.close(); rerender(); };
  const doEat = () => {
    const g = num(eatG.value);
    if (!(g > 0)) { toast('Bitte eine Menge eingeben.', { error: true }); return; }
    if (x.k == null) { toast('Für dieses Lebensmittel sind keine Nährwerte bekannt.', { error: true }); return; }
    const iso = isoDate(), meal = mealByMin(nowMin());
    const food = { src: x.src || 'custom', id: x.ref, n: x.n, brand: x.brand, liq: x.liq, serving: x.serving, k: x.k, p: x.p || 0, c: x.c || 0, f: x.f || 0, fi: x.fi || 0, su: x.su || 0, fs: x.fs ?? null };
    const entry = addEntry(iso, food, g, meal);
    const used = eat(id, g);
    sheet.close(); rerender();
    toast(`${x.n} als ${mealLabel(meal)} eingetragen${used.length ? ', vom Vorrat abgezogen' : ''}`, { action: { label: 'Rückgängig', onClick: () => { removeEntry(iso, entry.id); giveBack(used); rerender(); } } });
  };
  const del = () => { const gone = removeItem(id); sheet.close(); rerender(); toast(`${x.n} entfernt`, { action: { label: 'Rückgängig', onClick: () => { restoreItem(gone); rerender(); } } }); };
  sheet = openSheet(h('div', { class: 'vr-item' },
    h('p', { class: 'small muted' }, `${label(x)}${x.brand ? ' · ' + x.brand : ''}${x.k != null ? ` · ${fmt(x.k)} kcal / 100 ${unitG}` : ''}`),
    h('label', { class: 'form-label' }, h('span', {}, `Menge (${UNIT[x.qu]}${x.qu === 'pkg' && x.ug ? `, je ${fmt(x.ug)} ${unitG}` : ''})`), qty),
    h('label', { class: 'form-label' }, h('span', {}, 'Zählt beim Kochen als'), fn),
    h('button', { class: 'btn primary block', type: 'button', onclick: saveQty }, 'Speichern'),
    x.k > 0 ? list(switchRow({ title: 'Als Snack vorschlagen', sub: 'erscheint unter „Snack: Was darf ich jetzt?“', on: !!x.snack, set: (v) => { setSnack(id, v); rerender(); } })) : null,
    microLines(x),
    h('h3', { class: 'sec' }, 'Gegessen'),
    h('div', { class: 'vr-eat' }, eatG, h('span', {}, unitG), h('button', { class: 'btn', type: 'button', onclick: doEat }, 'Ins Journal')),
    h('p', { class: 'small muted' }, x.ug ? 'Wird als Mahlzeit passend zur Uhrzeit eingetragen und vom Vorrat abgezogen.' : 'Wird eingetragen; ohne Packungsgröße zieht die App nichts ab – ändere die Menge oben.'),
    h('button', { class: 'btn block rp-del', type: 'button', onclick: del }, 'Aus dem Vorrat entfernen')), { title: x.n });
}

// Mikronährstoffe je 100 g für die eingetragenen Mängel (0.5.0); unbekannt bleibt unbekannt
function microLines(x) {
  const ids = deficits();
  if (!ids.length) return null;
  const m = microsOfItem(x);
  return h('div', { class: 'vr-micro' }, h('h3', { class: 'sec' }, 'Bei deinem Mangel'),
    ...ids.map((id) => {
      const v = m ? m[id] : null, ref = refOf(id), lvl = richLevel(v, ref, !!x.liq);
      return h('p', { class: 'small' }, h('b', {}, DGE[id].name), v == null ? ' – Wert unbekannt' : ` ${String(Math.round(v * 10) / 10).replace('.', ',')} ${DGE[id].unit} je 100 ${x.liq ? 'ml' : 'g'} · ${Math.round((v / ref) * 100)} % vom Tageswert${lvl === 2 ? ' · viel' : lvl === 1 ? ' · etwas' : ''}`);
    }));
}

function row(x, rerender) {
  const name = foodOf(x);
  const sub = [x.snack ? 'Snack' : null, ...richNames(x).map((n) => `viel ${n}`), x.src === 'off' ? 'Scan' : null, name && name !== x.n ? `zählt als ${name}` : name ? null : 'keine Rezept-Zutat', low(x) ? 'fast leer' : null].filter(Boolean).join(' · ');
  const change = (d) => { setQty(x.id, (x.qty || 0) + d); rerender(); };
  const s = step(x);
  return h('div', { class: `vr-row${low(x) ? ' low' : ''}` },
    h('button', { class: 'vr-main', type: 'button', 'aria-label': `${x.n}, ${label(x)}. Bearbeiten`, onclick: () => itemSheet(x.id, rerender) },
      h('b', {}, x.n), sub ? h('small', {}, sub) : null),
    h('div', { class: 'vr-stp', role: 'group', 'aria-label': `Menge ${x.n}` },
      h('button', { class: 'icon-btn sm', type: 'button', 'aria-label': `${x.n}: weniger`, disabled: !(x.qty > 0), onclick: () => change(-Math.min(s, x.qty)) }, icon('minus', { size: 16 })),
      h('span', {}, label(x).replace(/ \(≈.*\)$/, '')),
      h('button', { class: 'icon-btn sm', type: 'button', 'aria-label': `${x.n}: mehr`, onclick: () => change(s) }, icon('plus', { size: 16 }))));
}

function pantryView(rerender) {
  if (!rs().started) { setTimeout(() => { location.hash = '#/rezepte/start'; }, 0); return h('div', {}); }
  const head = h('header', { class: 'page-head rz-head' }, h('h1', {}, 'Vorrat'),
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Lebensmittel suchen und in den Vorrat legen', onclick: () => openPicker('search', rerender) }, icon('plus', { size: 20 })));
  if (!ensureReady(rerender)) return h('div', {}, head, subnav('/rezepte/vorrat'), h('section', { class: 'card' }, h('p', { class: 'small muted' }, 'Nährwerte werden geladen …')));
  const all = pantry();
  const have = all.filter((x) => x.qty !== 0);
  const empty = all.filter((x) => x.qty === 0);
  const lowN = have.filter(low).length;
  const search = h('input', { class: 'input vr-search', type: 'search', placeholder: 'Im Vorrat suchen', value: ui.query, 'aria-label': 'Im Vorrat suchen', autocomplete: 'off' });
  const listBox = h('div', {});
  const draw = () => {
    const q = ui.query.trim().toLowerCase();
    const shown = have.filter((x) => (!q || `${x.n} ${x.brand} ${foodOf(x) || ''}`.toLowerCase().includes(q)) && (!ui.rich || levelOf(x, ui.rich) >= 1))
      .sort((a, b) => (ui.rich ? levelOf(b, ui.rich) - levelOf(a, ui.rich) : 0));
    const groups = GROUPS.map(([g, l]) => [l, shown.filter((x) => groupOf(x) === g).sort((a, b) => a.n.localeCompare(b.n, 'de'))]).filter(([, l]) => l.length);
    listBox.replaceChildren(...(groups.length ? groups.flatMap(([l, items]) => [h('h3', { class: 'sec' }, l), h('section', { class: 'card list' }, ...items.map((x) => row(x, rerender)))])
      : [h('section', { class: 'card' }, h('p', { class: 'small muted' }, ui.rich ? `Gerade nichts im Vorrat mit viel oder etwas ${DGE[ui.rich].name}. Gescannte Packungen ohne BLS-Wert zählen als unbekannt.` : q ? `Nichts im Vorrat mit „${ui.query.trim()}“.` : 'Noch nichts im Vorrat. Scanne Einkäufe, lege lose Zutaten dazu oder übernimm Gekauftes von der Einkaufsliste.'))]));
  };
  search.addEventListener('input', () => { ui.query = search.value; draw(); });
  draw();
  return h('div', { class: 'vr' },
    head, subnav('/rezepte/vorrat'),
    h('div', { class: 'wk-sum' },
      h('b', {}, `${have.length} ${have.length === 1 ? 'Lebensmittel' : 'Lebensmittel'} im Vorrat`),
      h('span', {}, `Kochen zieht ab${lowN ? ` · ${lowN} fast leer` : ''}`, infoBtn('Vorrat', pantryInfo))),
    have.length > 5 ? search : null,
    h('div', { class: 'btn-row wk-bar' },
      h('button', { class: 'btn', type: 'button', onclick: () => openPicker('scan', rerender) }, 'Scannen'),
      h('button', { class: 'btn', type: 'button', onclick: () => looseSheet(rerender) }, 'Zutat dazu')),
    have.length ? h('a', { class: 'cfg-row cfg-link vr-snacklink card', href: '#/rezepte/snack' }, h('span', { class: 't' }, h('b', {}, 'Snack: Was darf ich jetzt?'), h('small', {}, 'freier Rahmen und passende Portionen')), h('span', { class: 'cfg-val' }, h('span', { class: 'cfg-chev' }, icon('chevron', { size: 15 })))) : null,
    deficits().length && have.length ? h('div', { class: 'chips vr-rich', role: 'group', 'aria-label': 'Nach Mangel filtern' },
      h('button', { class: `chip${ui.rich ? '' : ' on'}`, type: 'button', 'aria-pressed': String(!ui.rich), onclick: () => { ui.rich = null; rerender(); } }, 'Alle'),
      ...deficits().map((id) => h('button', { class: `chip${ui.rich === id ? ' on' : ''}`, type: 'button', 'aria-pressed': String(ui.rich === id), onclick: () => { ui.rich = ui.rich === id ? null : id; rerender(); } }, `${DGE[id].name}`))) : null,
    ui.rich && deficits().includes(ui.rich) ? h('p', { class: 'small muted' }, `Sortiert nach ${DGE[ui.rich].name}: „viel“ ab 30 %, „etwas“ ab 15 % des Tageswerts je 100 g (Getränke halbe Schwellen). Nur BLS-Werte; Gescanntes ohne Wert fehlt.`) : null,
    listBox,
    empty.length ? h('h3', { class: 'sec' }, 'Aufgebraucht') : null,
    empty.length ? h('section', { class: 'card' },
      h('p', { class: 'small muted' }, empty.map((x) => x.n).join(', ')),
      h('button', { class: 'btn block', type: 'button', onclick: () => { const n = clearEmpty(); toast(`${n} entfernt`); rerender(); } }, 'Aufgebrauchtes entfernen')) : null,
    h('p', { class: 'small muted page-note' }, 'Mengen sind Schätzungen. Nur auf diesem Gerät.'));
}
export const pantryRoutes = { '/rezepte/vorrat': pantryView };
