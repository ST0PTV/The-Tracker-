// Hinzufügen-Sheet einer Mahlzeit mit drei Reitern:
//  Suche   – BLS, eigene und gescannte Produkte; ohne Suchbegriff Favoriten und zuletzt verwendet
//  Scannen – Barcode mit der Kamera oder eingetippt; unbekannt → Nummer falsch / Foto der Nährwerttabelle / abtippen
//  Neu     – eigenes Lebensmittel (abtippen oder fotografieren)
// Nach openAdd, renderEatScan und eatHit im Kalorien-Tracker (Rezeptbuch/tracker/js/app.js und food.js, ST0PTV/JuliaKelp, MIT).
import { h } from '../../core/util.js';
import { openSheet } from '../../core/sheet.js';
import { icon } from '../../core/icons.js';
import { toast } from '../../core/ui.js';
import { fmt } from '../../core/format.js';
import { searchFoods, loadFoods, foodsState, allFoods, foodById, unitOf } from '../food/foods.js';
import { customFoods, customById } from '../food/custom.js';
import { fetchProduct, scannedFoods, offCache, validCode } from '../food/off.js';
import { startScanner, stopScanner } from '../food/barcode.js';
import { mealLabel, favs, recent, isFav } from './journal.js';
import { openAmount } from './amount-sheet.js';
import { openFoodForm } from './food-form.js';

const TABS = [['search', 'Suche'], ['scan', 'Scannen'], ['new', 'Neu']];
let lastTab = 'search'; // zuletzt genutzter Reiter (nur für diese Sitzung)

/** Gespeicherte Kopie (Favorit, Zuletzt) mit aktuellen Werten auffrischen; fehlt das Original, bleibt die Kopie. */
function live(snap) {
  const id = String(snap.id);
  const cur = id.startsWith('bls:') ? foodById(id) : id.startsWith('off:') ? offCache()[id.slice(4)] : id.startsWith('custom:') ? customById(id) : null;
  return { ...snap, ...(cur || {}), id };
}

const TAG = { off: 'Barcode', custom: 'Eigenes' };
function foodRow(food, onPick) {
  return h('button', { class: 'row', type: 'button', onclick: () => onPick(food) },
    h('span', { class: 't' },
      h('b', {}, isFav(food.id) ? h('span', { class: 'fav-mark', 'aria-label': 'Favorit' }, '★ ') : null, food.n, TAG[food.src] ? h('span', { class: 'tag' }, TAG[food.src]) : null),
      h('small', {}, `${food.brand ? food.brand + ' · ' : ''}${fmt(food.k)} kcal / 100 ${unitOf(food)}`)),
    icon('chevron', { size: 18 }));
}

export function openAdd(iso, meal, { tab = lastTab } = {}) {
  let current = tab;
  let sheet = null;
  const body = h('div', { class: 'add-body' });
  const seg = h('div', { class: 'seg', role: 'tablist', 'aria-label': 'Hinzufügen' });

  // Nach dem Eintragen: in der Suche Sheet schließen, im Scanner weiterscannen
  const pick = (food) => {
    if (current === 'scan') stopScanner();
    openAmount(food, {
      iso, meal,
      onDone: () => { if (current !== 'scan') sheet.close(); },
      onClose: () => { if (current === 'scan' && sheet.panel.isConnected) drawScan(); }
    });
  };

  // ---------- Suche ----------
  let query = '';
  const results = h('div', { class: 'results' });
  const input = h('input', { class: 'search-input', type: 'search', placeholder: 'Lebensmittel suchen, z. B. Haferflocken', autocomplete: 'off', enterkeyhint: 'search', 'aria-label': 'Lebensmittel suchen' });
  input.addEventListener('input', () => { query = input.value; drawResults(); });
  const section = (title, items) => items.length ? [h('h3', { class: 'sec' }, title), h('div', { class: 'card list' }, ...items.map((f) => foodRow(f, pick)))] : [];

  function drawResults() {
    const q = query.trim();
    const favIds = new Set(favs().map((f) => f.id));
    if (!q) {
      const fav = favs().map(live);
      const rec = recent().filter((r) => !favIds.has(r.id)).slice(0, 20).map(live);
      const status = foodsState() === 'failed' ? 'Lebensmitteldaten konnten nicht geladen werden. Bitte einmal online öffnen.'
        : foodsState() !== 'ready' ? 'Lade Lebensmitteldaten …'
          : `${allFoods().length.toLocaleString('de-DE')} Lebensmittel aus dem Bundeslebensmittelschlüssel.`;
      results.replaceChildren(...section('Favoriten', fav), ...section('Zuletzt verwendet', rec), h('p', { class: 'muted small center' }, status));
      return;
    }
    const hits = searchFoods(q, { favIds, extra: [...customFoods(), ...scannedFoods()].map((f) => ({ ...f })) });
    results.replaceChildren(hits.length
      ? h('div', { class: 'card list' }, ...hits.map((f) => foodRow(f, pick)))
      : h('p', { class: 'muted center' }, foodsState() !== 'ready' ? 'Lade Lebensmitteldaten …' : `Nichts gefunden für „${q}“. Andere Schreibweise versuchen oder unter „Neu“ anlegen.`));
  }
  const drawSearch = () => {
    body.replaceChildren(h('div', { class: 'search' }, icon('search', { size: 18 }), input), results);
    drawResults();
    if (!favs().length && !recent().length && !query) setTimeout(() => input.focus(), 250);
  };

  // ---------- Scannen ----------
  let busy = false;
  function drawScan() {
    const video = h('video', { playsinline: true, muted: true, autoplay: true, 'aria-label': 'Kamerabild' });
    const torchBtn = h('button', { class: 'chip torch', type: 'button', hidden: true }, 'Licht an');
    const out = h('div', { class: 'scan-out', 'aria-live': 'polite' });
    const code = h('input', { class: 'input', type: 'text', inputmode: 'numeric', placeholder: 'Barcode eintippen', 'aria-label': 'Barcode eintippen', autocomplete: 'off' });
    const lookup = h('button', { class: 'btn', type: 'button' }, 'Suchen');

    const hit = async (c) => {
      if (busy) return;
      busy = true;
      out.replaceChildren(h('p', { class: 'muted' }, `Barcode ${c}: suche bei Open Food Facts …`));
      const r = await fetchProduct(c, { own: customFoods() });
      busy = false;
      if (!body.isConnected || current !== 'scan') return;
      if (r.food) { out.replaceChildren(); pick(r.food); return; }
      if (r.missing) {
        out.replaceChildren(h('div', { class: 'card scan-miss' },
          h('b', {}, `Barcode ${c} ist unbekannt.`),
          h('p', { class: 'small muted' }, 'Ist die Nummer falsch, oder willst du die Nährwerttabelle fotografieren?'),
          h('div', { class: 'chips' },
            h('button', { class: 'chip', type: 'button', onclick: () => { out.replaceChildren(); code.value = c; code.focus(); } }, 'Nummer falsch'),
            h('button', { class: 'chip', type: 'button', onclick: () => newFood({ barcode: c }, true) }, 'Nährwerttabelle fotografieren'),
            h('button', { class: 'chip', type: 'button', onclick: () => newFood({ barcode: c }, false) }, 'Abtippen'))));
      } else {
        out.replaceChildren(h('div', { class: 'card scan-miss' },
          h('b', {}, 'Keine Verbindung zu Open Food Facts.'),
          h('div', { class: 'chips' }, h('button', { class: 'chip', type: 'button', onclick: () => hit(c) }, 'Nochmal'),
            h('button', { class: 'chip', type: 'button', onclick: () => newFood({ barcode: c }, false) }, 'Abtippen'))));
      }
    };
    const submit = () => {
      const c = validCode(code.value);
      if (!c) { toast('Ein Barcode hat 8, 12 oder 13 Ziffern.', { error: true }); return; }
      code.value = ''; hit(c);
    };
    lookup.addEventListener('click', submit);
    code.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });

    body.replaceChildren(
      h('div', { class: 'scanner' }, video, h('div', { class: 'frame', 'aria-hidden': 'true' }), torchBtn),
      h('p', { class: 'small muted' }, 'Barcode ins Bild halten. Nur die Nummer wird an Open Food Facts gesendet.'),
      h('div', { class: 'code-row' }, code, lookup),
      out,
      h('button', { class: 'btn block', type: 'button', onclick: () => newFood({}, true) }, 'Ohne Barcode: Nährwerte fotografieren'));
    startScanner(video, { onCode: hit, onError: (msg) => out.replaceChildren(h('p', { class: 'muted' }, msg)), torchBtn });
  }

  // ---------- Neu ----------
  function newFood(base, photo) {
    stopScanner();
    openFoodForm(base, { photo, onSaved: (food) => pick(food) });
  }
  const drawNew = () => {
    body.replaceChildren(h('div', { class: 'card list' },
      h('button', { class: 'row', type: 'button', onclick: () => newFood({}, false) },
        h('span', { class: 't' }, h('b', {}, 'Eigenes Lebensmittel'), h('small', {}, 'Nährwerte pro 100 g abtippen, z. B. von der Verpackung')), icon('chevron', { size: 18 })),
      h('button', { class: 'row', type: 'button', onclick: () => newFood({}, true) },
        h('span', { class: 't' }, h('b', {}, 'Nährwerttabelle fotografieren'), h('small', {}, 'Die Zahlen werden auf dem Handy gelesen; du prüfst sie vor dem Speichern')), icon('chevron', { size: 18 }))),
    customFoods().length ? h('p', { class: 'small muted center' }, `${customFoods().length} eigene Lebensmittel; sie erscheinen auch in der Suche.`) : null);
  };

  const draw = () => {
    seg.replaceChildren(...TABS.map(([k, label]) => h('button', {
      type: 'button', role: 'tab', 'aria-selected': k === current ? 'true' : 'false', 'aria-checked': k === current ? 'true' : 'false',
      onclick: () => { if (k !== current) { current = k; lastTab = k === 'scan' ? lastTab : k; draw(); } }
    }, label)));
    if (current !== 'scan') stopScanner();
    if (current === 'search') drawSearch(); else if (current === 'scan') drawScan(); else drawNew();
  };

  const onFoods = () => { if (current === 'search') drawResults(); };
  const onVisible = () => { if (document.visibilityState === 'visible' && current === 'scan' && sheet.panel.isConnected && document.querySelectorAll('.sheet').length === 1) drawScan(); };
  document.addEventListener('tt-foods', onFoods);
  document.addEventListener('visibilitychange', onVisible);
  loadFoods();

  sheet = openSheet(h('div', { class: 'add' }, seg, body), {
    title: `${mealLabel(meal)} hinzufügen`, full: true,
    onClose: () => { stopScanner(); document.removeEventListener('tt-foods', onFoods); document.removeEventListener('visibilitychange', onVisible); }
  });
  draw();
  return sheet;
}
