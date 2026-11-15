// „Ich → Meine Lebensmittel“ (0.5.1, Mockup 7A, Nutzerwahl 2026-11-15): eine Liste mit Suche und Filter-Chips über
// eigene Lebensmittel, eigene Rezepte (je 100 g), gescannte Produkte, Favoriten und zuletzt verwendete.
// Oben „Einkauf erfassen“ (scannen und merken, ohne einzutragen) und „Teilen“ (Lebensmittel-Datei, food/share.js).
// Nach dem Reiter „Lebensmittel“ im Calorie-Tracker (food.js, ST0PTV, MIT). Zeile antippen = Aktionen.
// Dazu der Baukasten „Eigenes Rezept“ (#/ich/lebensmittel/rezept, Rechnung in food/recipe-food.js).
import { h } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { toast, pageHead } from '../../core/ui.js';
import { openSheet } from '../../core/sheet.js';
import { backLink, sec, list, note } from '../../core/setui.js';
import { shareOrDownload } from '../../core/file-share.js';
import { fmt, r1, num, norm, isoDate } from '../../core/format.js';
import { loadFoods, foodById, unitOf } from './foods.js';
import { customFoods, customById, removeCustom, saveCustom, makeCustom } from './custom.js';
import { scannedFoods, offCache, removeScanned, addScanned } from './off.js';
import { buildFoods, foodsFileName, parseFoods, newFoods, applyFoods, FOODS_MAX_BYTES } from './share.js';
import { recipeFoodFrom } from './recipe-food.js';
import { favs, recent, isFav, toggleFav, mealByMin, foodSnap } from '../journal/journal.js';
import { openAdd } from '../journal/add-sheet.js';
import { openAmount } from '../journal/amount-sheet.js';
import { openFoodForm } from '../journal/food-form.js';

const FILTERS = [['all', 'Alle'], ['own', 'Eigene'], ['recipe', 'Rezepte'], ['scan', 'Gescannt'], ['fav', '★'], ['recent', 'Zuletzt']];
const SRC = { custom: 'Eigen', off: 'Scan', bls: 'BLS', recipe: 'Rezept' };
let filter = 'all';
let query = '';

const isRecipe = (f) => f.src === 'custom' && f.ns === 'rezept';
const srcOf = (f) => (isRecipe(f) ? 'Rezept' : SRC[f.src] || '');

/** Aktuelle Werte zu einer gespeicherten Kopie (Favorit, Zuletzt). */
function live(snap) {
  const id = String(snap.id);
  const cur = id.startsWith('bls:') ? foodById(id) : id.startsWith('off:') ? offCache()[id.slice(4)] : id.startsWith('custom:') ? customById(id) : null;
  return { ...snap, ...(cur || {}), id };
}
const findFood = (id) => (id.startsWith('bls:') ? foodById(id) : id.startsWith('off:') ? offCache()[id.slice(4)] || null : id.startsWith('custom:') ? customById(id) : null);

/** Alle Lebensmittel der Person, ohne Doppelte (ID). */
export function myFoods() {
  const out = new Map();
  for (const f of customFoods()) out.set(f.id, f);
  for (const f of scannedFoods()) out.set(f.id, f);
  for (const f of favs()) if (!out.has(f.id)) out.set(f.id, live(f));
  return [...out.values()];
}

function filtered() {
  let l;
  if (filter === 'recent') l = recent().map(live);
  else if (filter === 'fav') l = favs().map(live);
  else {
    l = myFoods();
    if (filter === 'own') l = l.filter((f) => f.src === 'custom' && !isRecipe(f));
    if (filter === 'recipe') l = l.filter(isRecipe);
    if (filter === 'scan') l = l.filter((f) => f.src === 'off');
    l.sort((a, b) => a.n.localeCompare(b.n, 'de'));
  }
  const q = norm(query).trim();
  return q ? l.filter((f) => norm(`${f.n} ${f.brand || ''}`).includes(q)) : l;
}

function counts() {
  const all = myFoods();
  return { all: all.length, own: all.filter((f) => f.src === 'custom' && !isRecipe(f)).length, recipe: all.filter(isRecipe).length,
    scan: all.filter((f) => f.src === 'off').length, fav: favs().length, recent: recent().length };
}

function meta(f) {
  if (isRecipe(f)) return `${fmt(f.k)} kcal/100 g${f.serving ? ` · Portion ${fmt(f.serving)} g` : ''}${f.total ? ` · ${fmt(f.total)} g gesamt` : ''}`;
  return `${f.brand ? f.brand + ' · ' : ''}${fmt(f.k)} kcal/100 ${unitOf(f)}`;
}

// Aktionen zu einem Lebensmittel
function openFood(f, rerender) {
  let sheet = null;
  const close = () => sheet && sheet.close();
  const now = new Date();
  const acts = [
    ['Eintragen', () => { close(); openAmount(f, { iso: isoDate(), meal: mealByMin(now.getHours() * 60 + now.getMinutes()) }); }],
    [isFav(f.id) ? 'Aus Favoriten entfernen' : 'Als Favorit merken', () => { const on = toggleFav(f); toast(on ? 'Favorit' : 'Kein Favorit mehr'); close(); rerender(); }],
    f.src === 'custom' ? ['Bearbeiten', () => { close(); if (isRecipe(f)) location.hash = `#/ich/lebensmittel/rezept?id=${encodeURIComponent(f.id)}`; else openFoodForm(f, { onSaved: () => rerender() }); }] : null,
    f.src === 'custom' ? ['Löschen', () => {
      const gone = customById(f.id); removeCustom(f.id); close(); rerender();
      toast(`„${f.n}“ gelöscht`, { action: { label: 'Rückgängig', onClick: () => { saveCustom(gone); rerender(); } } });
    }, true] : null,
    f.src === 'off' ? ['Vergessen', () => {
      const gone = removeScanned(f.barcode); close(); rerender();
      toast(`„${f.n}“ vergessen`, { action: { label: 'Rückgängig', onClick: () => { addScanned(gone); rerender(); } } });
    }, true] : null
  ].filter(Boolean);
  const nut = (k, l) => h('div', { class: 'stat' }, h('b', {}, k === 'k' ? fmt(f.k) : `${r1(f[k] || 0)}`), h('span', {}, l));
  sheet = openSheet(h('div', { class: 'mf-sheet' },
    h('p', { class: 'muted' }, `${srcOf(f)}${f.brand ? ' · ' + f.brand : ''} · je 100 ${unitOf(f)}`),
    h('div', { class: 'stats' }, nut('k', 'kcal'), nut('p', 'Eiweiß g'), nut('c', 'KH g')),
    isRecipe(f) && f.parts?.length ? h('p', { class: 'small muted mf-parts' }, f.parts.map((x) => `${fmt(x.g)} g ${x.n}`).join(' · ')) : null,
    h('div', { class: 'cfg-list mf-acts' }, ...acts.map(([l, fn, danger]) => h('button', { type: 'button', class: `cfg-row cfg-action${danger ? ' danger' : ''}`, onclick: fn }, h('span', { class: 't' }, h('b', {}, l)))))),
  { title: f.n });
}

// „Einkauf erfassen“: scannen und als Favorit merken, ohne einzutragen
function shopScan(rerender) {
  openAdd(isoDate(), 'snack', {
    tab: 'scan', title: 'Einkauf erfassen',
    onPick: (food, { again }) => {
      if (!isFav(food.ref || food.id)) toggleFav(food);
      toast(`„${food.n}“ gemerkt`);
      rerender();
      again();
    }
  });
}

async function exportFoods() {
  const d = buildFoods();
  if (!d.custom.length && !d.scanned.length && !d.favs.length) { toast('Noch keine eigenen Lebensmittel zum Teilen.', { error: true }); return; }
  const r = await shareOrDownload(JSON.stringify(d), foodsFileName(), 'The Tracker – Lebensmittel');
  if (r !== 'aborted') toast(`${d.custom.length + d.scanned.length} Lebensmittel geteilt`);
}

async function importFoods(input, rerender) {
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  if (file.size > FOODS_MAX_BYTES) { toast('Die Datei ist größer als 5 MB.', { error: true }); return; }
  let parsed;
  try { parsed = parseFoods(await file.text()); } catch (e) { toast(e.message, { error: true }); return; }
  await loadFoods(); // Favoriten aus dem BLS brauchen die Liste
  const n = newFoods(parsed);
  const favNew = n.favs.filter((id) => !isFav(id) && findFood(id)).length;
  if (!n.custom.length && !n.scanned.length && !favNew) { toast('Alles aus der Datei ist schon da.'); return; }
  let sheet = null;
  sheet = openSheet(h('div', { class: 'mf-import' },
    h('p', {}, 'Neu aus der Datei:'),
    h('ul', {}, n.custom.length ? h('li', {}, `${n.custom.length} eigene Lebensmittel und Rezepte`) : null,
      n.scanned.length ? h('li', {}, `${n.scanned.length} gescannte Produkte`) : null,
      favNew ? h('li', {}, `${favNew} Favoriten`) : null),
    h('p', { class: 'small muted' }, `Vorhandenes bleibt unverändert.${parsed.skipped ? ` ${parsed.skipped} fehlerhafte Einträge werden übersprungen.` : ''}`),
    h('button', { class: 'btn primary block', type: 'button', onclick: () => {
      const r = applyFoods(parsed, findFood);
      sheet.close(); rerender();
      toast(`${r.custom + r.scanned} Lebensmittel übernommen`);
    } }, 'Übernehmen')), { title: 'Lebensmittel laden' });
}

export function foodsView(rerender) {
  const c = counts();
  const results = h('div', {});
  const drawList = () => {
    const l = filtered();
    results.replaceChildren(l.length
      ? h('section', { class: 'card list mf-list' }, ...l.slice(0, 300).map((f) => h('button', { class: 'row', type: 'button', onclick: () => openFood(f, rerender) },
        h('span', { class: 't' }, h('b', {}, f.n, isFav(f.id) ? h('span', { class: 'fav-mark', 'aria-label': 'Favorit' }, ' ★') : null),
          h('small', {}, h('span', { class: 'mf-src' }, srcOf(f)), meta(f))),
        icon('chevron', { size: 18 }))))
      : h('p', { class: 'muted center mf-empty' }, query ? `Nichts gefunden für „${query}“.` : filter === 'recipe' ? 'Noch keine eigenen Rezepte.' : 'Hier erscheinen eigene, gescannte und gemerkte Lebensmittel.'));
  };
  const search = h('input', { class: 'search-input', type: 'search', placeholder: 'Suchen', value: query, autocomplete: 'off', 'aria-label': 'Meine Lebensmittel durchsuchen' });
  search.addEventListener('input', () => { query = search.value; drawList(); });
  const fileIn = h('input', { type: 'file', accept: 'application/json,.json', class: 'visually-hidden', 'aria-label': 'Lebensmittel-Datei wählen' });
  fileIn.addEventListener('change', () => importFoods(fileIn, rerender));
  drawList();
  loadFoods().then(() => { if (results.isConnected) drawList(); });
  return h('div', { class: 'mf' },
    backLink(),
    pageHead('Meine Lebensmittel'),
    h('div', { class: 'btn-row mf-top' },
      h('button', { class: 'btn', type: 'button', onclick: () => shopScan(rerender) }, icon('scan', { size: 18 }), 'Einkauf erfassen'),
      h('button', { class: 'btn', type: 'button', onclick: exportFoods }, icon('download', { size: 18 }), 'Teilen')),
    h('div', { class: 'search' }, icon('search', { size: 18 }), search),
    h('div', { class: 'chips mf-chips', role: 'radiogroup', 'aria-label': 'Filter' },
      ...FILTERS.map(([k, l]) => h('button', { class: `chip${k === filter ? ' on' : ''}`, type: 'button', role: 'radio', 'aria-checked': k === filter ? 'true' : 'false',
        onclick: () => { filter = k; rerender(); } }, `${l} · ${c[k]}`))),
    results,
    list(
      h('a', { class: 'cfg-row cfg-link', href: '#/ich/lebensmittel/rezept' }, h('span', { class: 't' }, h('b', {}, 'Eigenes Rezept anlegen'), h('small', {}, 'Zutaten roh wiegen, Nährwerte je 100 g')), h('span', { class: 'cfg-chev' }, icon('chevron', { size: 15 }))),
      h('label', { class: 'cfg-row cfg-link' }, h('span', { class: 't' }, h('b', {}, 'Lebensmittel-Datei laden'), h('small', {}, 'fügt nur Neues hinzu')), fileIn, h('span', { class: 'cfg-chev' }, icon('chevron', { size: 15 })))),
    note('„Einkauf erfassen“ scannt Produkte und merkt sie als Favorit, ohne sie einzutragen. „Teilen“ erstellt eine Datei mit deinen eigenen, gescannten und gemerkten Lebensmitteln – ohne Tagebuch.'));
}

/** Untertitel für „Ich“. */
export function foodsSummary() {
  const c = counts();
  return c.all ? `${c.all} gespeichert${c.fav ? ` · ${c.fav} Favoriten` : ''}` : 'eigene, gescannte, Favoriten';
}

// ---------- Eigenes Rezept je 100 g ----------
let draft = null; // { id, name, parts: [{ id, n, g, k, p, c, f, fi, su, fs }], total, portions }

function askGrams(food, onOk) {
  let sheet = null;
  const inp = h('input', { class: 'input big-input', type: 'text', inputmode: 'decimal', placeholder: 'Gramm', 'aria-label': `Menge ${food.n} in Gramm` });
  const ok = () => { const g = num(inp.value); if (!(g > 0 && g <= 5000)) { toast('Bitte eine Menge zwischen 1 und 5.000 g.', { error: true }); return; } sheet.close(); onOk(g); };
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); });
  sheet = openSheet(h('div', {}, h('label', { class: 'form-label' }, h('span', {}, `Rohe Menge in ${unitOf(food)}`), inp),
    h('button', { class: 'btn primary block', type: 'button', onclick: ok }, 'Hinzufügen')), { title: food.n });
  setTimeout(() => inp.focus(), 250);
}

export function recipeFoodView(rerender) {
  const id = new URLSearchParams(location.hash.split('?')[1] || '').get('id');
  if (!draft || draft.id !== (id || null)) {
    const f = id ? customById(id) : null;
    draft = f && isRecipe(f)
      ? { id: f.id, name: f.n, parts: (f.parts || []).map((x) => ({ ...x })), total: f.total || null, portions: f.portions || 1 }
      : { id: null, name: '', parts: [], total: null, portions: 1 };
  }
  const d = draft;
  let res = null, err = null;
  try { res = d.parts.length ? recipeFoodFrom({ parts: d.parts.map((x) => ({ food: x, g: x.g })), total: d.total, portions: d.portions }) : null; } catch (e) { err = e.message; }
  const nameIn = h('input', { class: 'input', type: 'text', value: d.name, maxlength: 60, placeholder: 'z. B. Mein Müsli', 'aria-label': 'Name des Rezepts' });
  nameIn.addEventListener('input', () => { d.name = nameIn.value; });
  const numIn = (label, v, set, ph) => {
    const el = h('input', { class: 'cfg-in', type: 'text', inputmode: 'numeric', value: v ?? '', placeholder: ph, 'aria-label': label });
    el.addEventListener('change', () => { set(el.value.trim() ? num(el.value) : null); rerender(); });
    return el;
  };
  const addPart = () => openAdd(isoDate(), 'snack', { tab: 'search', title: 'Zutat hinzufügen', onPick: (food, { close }) => {
    close();
    askGrams(food, (g) => { d.parts.push({ id: food.ref || food.id, n: food.n, g, ...Object.fromEntries(['k', 'p', 'c', 'f', 'fi', 'su', 'fs'].map((k) => [k, foodSnap(food)[k] ?? 0])) }); rerender(); });
  } });
  const save = () => {
    if (!d.name.trim()) { toast('Bitte einen Namen eingeben.', { error: true }); return; }
    if (!res) { toast(err || 'Bitte mindestens eine Zutat eintragen.', { error: true }); return; }
    try {
      const f = makeCustom({ n: d.name, ...res.per100, serving: res.serving, ns: 'rezept' }, d.id);
      Object.assign(f, { ns: 'rezept', parts: d.parts.map((x) => ({ ...x })), total: d.total || null, portions: d.portions });
      saveCustom(f);
      toast(d.id ? 'Rezept gespeichert' : `„${f.n}“ angelegt`);
      draft = null;
      location.hash = '#/ich/lebensmittel';
    } catch (e) { toast(e.message, { error: true }); }
  };
  const stat = (v, l) => h('div', { class: 'stat' }, h('b', {}, v), h('span', {}, l));
  return h('div', { class: 'rf' },
    backLink('#/ich/lebensmittel', 'Meine Lebensmittel'),
    pageHead(d.id ? 'Rezept bearbeiten' : 'Eigenes Rezept', 'Zutaten roh wiegen. Das Rezept erscheint danach in der Suche wie ein Lebensmittel.'),
    h('label', { class: 'form-label' }, h('span', {}, 'Name'), nameIn),
    sec('Zutaten'),
    list(...d.parts.map((x, i) => h('div', { class: 'cfg-row' }, h('span', { class: 't' }, h('b', {}, x.n), h('small', {}, `${fmt(x.g)} g · ${fmt((x.k * x.g) / 100)} kcal`)),
      h('button', { class: 'icon-btn sm gl-del', type: 'button', 'aria-label': `${x.n} entfernen`, onclick: () => { d.parts.splice(i, 1); rerender(); } }, icon('trash', { size: 16 })))),
    h('button', { type: 'button', class: 'cfg-row cfg-action', onclick: addPart }, h('span', { class: 't' }, h('b', {}, 'Zutat hinzufügen')))),
    sec('Fertig'),
    list(h('label', { class: 'cfg-row' }, h('span', { class: 't' }, h('b', {}, 'Endgewicht'), h('small', {}, res ? `roh zusammen ${fmt(res.raw)} g` : 'nach dem Kochen gewogen')),
      h('span', { class: 'cfg-val' }, numIn('Endgewicht', d.total, (v) => { d.total = v; }, 'optional'), h('span', { class: 'cfg-unit' }, 'g'))),
    h('label', { class: 'cfg-row' }, h('span', { class: 't' }, h('b', {}, 'Portionen')),
      h('span', { class: 'cfg-val' }, numIn('Portionen', d.portions, (v) => { d.portions = Math.max(1, Math.min(50, Math.round(v || 1))); }, '1')))),
    note('Ohne Endgewicht zählt das Gewicht der rohen Zutaten. Wasser, das beim Kochen verdampft, ändert nur das Gewicht – darum am besten nach dem Kochen wiegen. Werte sind Schätzungen.'),
    err ? h('p', { class: 'warn small' }, err) : null,
    res ? h('div', {}, sec('Je 100 g'), h('div', { class: 'stats' }, stat(fmt(res.per100.k), 'kcal'), stat(`${r1(res.per100.p)} g`, 'Eiweiß'), stat(`${r1(res.per100.c)} g`, 'KH')),
      h('p', { class: 'cfg-note' }, `Portion ${fmt(res.serving)} g = ${fmt((res.per100.k * res.serving) / 100)} kcal · Fett ${r1(res.per100.f)} g je 100 g`)) : null,
    h('button', { class: 'btn primary block cfg-save', type: 'button', onclick: save }, 'Speichern'));
}
