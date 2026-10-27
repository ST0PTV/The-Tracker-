// „+“-Menü (Tab-Leiste): alles Eintragen an einer Stelle. Idee aus dem „+“-Menü des Calorie-Trackers (ST0PTV, MIT),
// vom Nutzer gewählter Entwurf M2 (2026-10-26): gruppierte Liste wie in den iOS-Einstellungen.
// Oben die Mahlzeit (vorgewählt nach Uhrzeit), Gruppe „Essen“ (Suchen, Scannen, Schnell – nur kcal),
// Gruppe „Tracker“ in der Reihenfolge Wasser, Supplements, Koffein, Alkohol, Gewicht. Ausgeschaltete Tracker fehlen.
import { h } from '../core/util.js';
import { icon } from '../core/icons.js';
import { openSheet } from '../core/sheet.js';
import { toast } from '../core/ui.js';
import { isoDate, addDays, fmt, num, r1 } from '../core/format.js';
import { currentWeight, getWeightGoal } from '../core/profile.js';
import { MEALS, mealByMin, addQuick, updateQuick, removeEntry, restoreEntry, entriesOf, sumEntries, copyEntries } from './journal/journal.js';
import { openAdd } from './journal/add-sheet.js';
import { waterSettings, waterRows, waterTotal } from './drinks/water.js';
import { quickWater, openWaterDetails } from './drinks/water-card.js';
import { caffSettings, caffWaterRows } from './drinks/caffeine.js';
import { openCaffeine } from './drinks/caffeine-card.js';
import { alcSettings } from './drinks/alcohol.js';
import { openAlcohol } from './drinks/alcohol-card.js';
import { openWeight } from './goal/weight-card.js';
import { suppSettings, itemsFor, isTaken, setTaken, slotLabel } from './supp/supplements.js';
import { suppIcon } from './supp/supp-card.js';

const MEAL_SHORT = { breakfast: 'Frühstück', lunch: 'Mittag', dinner: 'Abend', snack: 'Snack' };
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const litres = (ml) => (ml / 1000).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function row({ kind, ico, title, sub, onClick, action = null, label }) {
  return h('button', { class: `qa-row k-${kind}`, type: 'button', onclick: onClick, 'aria-label': label || title },
    h('span', { class: 'qa-badge' }, icon(ico, { size: 20 })),
    h('span', { class: 't' }, h('b', {}, title), sub ? h('small', {}, sub) : null),
    action || h('span', { class: 'qa-chev' }, icon('chevron', { size: 16 })));
}

/** Öffnet das Menü für einen Tag (Standard: heute); meal = Vorauswahl, sonst nach Uhrzeit. */
export function openQuickAdd(iso = isoDate(), meal = null) {
  let sel = meal || (iso === isoDate() ? mealByMin(nowMin()) : 'lunch');
  let sheet = null;
  const box = h('div', { class: 'qa' });
  const go = (fn) => { sheet.close(); setTimeout(fn, 60); };
  // „Heute“ klappt die gewählte Mahlzeit auf, damit der neue Eintrag sofort zu sehen ist
  const goFood = (fn) => { document.dispatchEvent(new CustomEvent('tt-open-meal', { detail: sel })); go(fn); };
  // „Wie am Vortag“: nur, wenn die gewählte Mahlzeit heute leer ist und gestern Einträge hatte
  const copyRow = () => {
    const prev = entriesOf(addDays(iso, -1)).filter((e) => e.meal === sel && !e.link);
    if (!prev.length || entriesOf(iso).some((e) => e.meal === sel)) return null;
    return row({ kind: 'food', ico: 'swap', title: 'Wie am Vortag', sub: `${MEAL_SHORT[sel]} · ${fmt(sumEntries(prev).k)} kcal`,
      onClick: () => { document.dispatchEvent(new CustomEvent('tt-open-meal', { detail: sel })); const n = copyEntries(addDays(iso, -1), iso, sel); sheet.close(); toast(`${n} vom Vortag übernommen`); } });
  };
  // Platz für „Wie am Vortag“: Das Sheet hängt unten und wächst mit dem Inhalt, die Oberkante würde beim Erscheinen der Zeile
  // nach oben springen. Solange die Zeile bei irgendeiner Mahlzeit erscheinen kann, bleibt unten ihre Höhe frei.
  const canCopy = (m) => entriesOf(addDays(iso, -1)).some((e) => e.meal === m && !e.link) && !entriesOf(iso).some((e) => e.meal === m);
  const draw = () => {
    const W = waterSettings(), C = caffSettings(), A = alcSettings(), S = suppSettings(), G = getWeightGoal();
    const due = S.enabled ? itemsFor(iso) : [];
    const open = due.filter((x) => !isTaken(iso, x.id)).length;
    const ml = W.enabled ? waterTotal(waterRows(iso, caffWaterRows(iso))) : 0;
    const w = currentWeight(iso);
    const trackers = [
      W.enabled ? row({ kind: 'water', ico: 'drop', title: 'Wasser', sub: `heute ${litres(ml)} l`, onClick: () => go(() => openWaterDetails(iso)),
        label: 'Wasser: andere Mengen und Einträge',
        action: h('button', { class: 'qa-quick', type: 'button', 'aria-label': `${fmt(W.step || 250)} ml Wasser eintragen`,
          onclick: (e) => { e.stopPropagation(); quickWater(iso, W.step || 250); draw(); } }, `+ ${fmt(W.step || 250)} ml`) }) : null,
      S.enabled ? row({ kind: 'supp', ico: 'pill', title: 'Supplements', sub: S.items.length ? (due.length ? (open ? `${open} offen` : 'alle genommen') : 'heute keine fällig') : 'noch keine angelegt',
        onClick: () => go(() => (S.items.length ? openSuppTick(iso) : (location.hash = '#/ich/supplements'))) }) : null,
      C.enabled ? row({ kind: 'caf', ico: 'cup', title: 'Koffein', sub: 'Kaffee, Tee, Energy …', onClick: () => go(() => openCaffeine(iso)) }) : null,
      A.enabled ? row({ kind: 'alc', ico: 'glass', title: 'Alkohol', sub: 'Bier, Wein, Schnaps …', onClick: () => go(() => openAlcohol(iso)) }) : null,
      G.card ? row({ kind: 'wt', ico: 'scale', title: 'Gewicht', sub: w != null ? `zuletzt ${r1(w)} kg` : 'noch nicht eingetragen', onClick: () => go(() => openWeight(iso)) }) : null
    ].filter(Boolean);
    const copy = copyRow(), copyRowShown = !!copy;
    box.replaceChildren(
      h('div', { class: 'seg qa-meal', role: 'radiogroup', 'aria-label': 'Mahlzeit' }, ...MEALS.map((m) => h('button', {
        type: 'button', role: 'radio', 'aria-checked': m.id === sel ? 'true' : 'false', onclick: () => { sel = m.id; draw(); }
      }, MEAL_SHORT[m.id] || m.label))),
      h('h3', { class: 'sec' }, `Essen · ${MEAL_SHORT[sel]}`),
      h('div', { class: 'card list qa-grp' },
        row({ kind: 'food', ico: 'search', title: 'Lebensmittel', sub: 'suchen, Favoriten, Zuletzt', onClick: () => goFood(() => openAdd(iso, sel, { tab: 'search' })) }),
        row({ kind: 'food', ico: 'scan', title: 'Scannen', sub: 'Barcode oder Nährwerttabelle', onClick: () => goFood(() => openAdd(iso, sel, { tab: 'scan' })) }),
        row({ kind: 'food', ico: 'bolt', title: 'Schnell', sub: 'nur kcal', onClick: () => goFood(() => openQuick(iso, sel)) }),
        row({ kind: 'food', ico: 'book', title: 'Rezept', sub: 'Vorschläge passend zur Mahlzeit', onClick: () => go(() => { location.hash = `#/rezepte?m=${sel}`; }) }),
        copy),
      trackers.length ? h('h3', { class: 'sec' }, 'Tracker') : null,
      trackers.length ? h('div', { class: 'card list qa-grp' }, ...trackers) : null,
      !copyRowShown && MEALS.some((m) => canCopy(m.id)) ? h('div', { class: 'qa-reserve', 'aria-hidden': 'true' }) : null);
  };
  draw();
  sheet = openSheet(box, { title: 'Eintragen' });
  return sheet;
}

/** „Schnell – nur kcal“: neu oder bearbeiten. */
export function openQuick(iso, meal, entry = null) {
  let sel = entry ? entry.meal : meal || 'snack';
  const kc = h('input', { class: 'input', type: 'text', inputmode: 'numeric', value: entry ? Math.round(entry.k) : '', placeholder: 'z. B. 250', 'aria-label': 'Energie in kcal' });
  const nm = h('input', { class: 'input', type: 'text', value: entry ? entry.n : '', placeholder: 'optional, z. B. Kuchen beim Bäcker', 'aria-label': 'Bezeichnung' });
  const seg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Mahlzeit' });
  const drawSeg = () => seg.replaceChildren(...MEALS.map((m) => h('button', { type: 'button', role: 'radio', 'aria-checked': m.id === sel ? 'true' : 'false', onclick: () => { sel = m.id; drawSeg(); } }, MEAL_SHORT[m.id])));
  drawSeg();
  let sheet = null;
  const save = () => {
    try {
      if (entry) updateQuick(iso, entry.id, { kcal: num(kc.value), name: nm.value, meal: sel });
      else addQuick(iso, num(kc.value), sel, nm.value);
      toast(entry ? 'Gespeichert' : `${fmt(num(kc.value))} kcal eingetragen`);
      sheet.close();
    } catch (e) { toast(e.message, { error: true }); }
  };
  const del = entry ? h('button', { class: 'btn block danger-text', type: 'button', onclick: () => {
    const gone = removeEntry(iso, entry.id); sheet.close();
    toast('Gelöscht', { action: { label: 'Rückgängig', onClick: () => restoreEntry(iso, gone) } });
  } }, 'Eintrag löschen') : null;
  sheet = openSheet(h('div', {},
    seg,
    h('label', { class: 'form-label' }, h('span', {}, 'Energie (kcal)'), kc),
    h('label', { class: 'form-label' }, h('span', {}, 'Bezeichnung'), nm),
    h('p', { class: 'small muted' }, 'Ohne Makros: Die kcal zählen zum Tag, im Ring erscheinen sie grau.'),
    h('button', { class: 'btn primary block', type: 'button', onclick: save }, entry ? 'Speichern' : 'Eintragen'),
    del), { title: entry ? 'Schnell-Eintrag' : 'Schnell – nur kcal' });
  setTimeout(() => kc.focus(), 250);
}

/** Supplements des Tages abhaken (aus dem Menü). */
export function openSuppTick(iso) {
  const box = h('div', {});
  const draw = () => {
    const due = itemsFor(iso);
    box.replaceChildren(due.length ? h('div', { class: 'card list' }, ...due.map((x) => {
      const taken = isTaken(iso, x.id);
      return h('button', { class: `row qa-supp${taken ? ' taken' : ''}`, type: 'button', 'aria-pressed': taken ? 'true' : 'false',
        onclick: () => { setTaken(iso, x.id, !taken); draw(); } },
      suppIcon(x, 28), h('span', { class: 't' }, h('b', {}, x.name), h('small', {}, taken ? 'genommen' : slotLabel(x))),
      h('span', { class: `qa-tick${taken ? ' on' : ''}` }, taken ? icon('check', { size: 16 }) : null));
    })) : h('p', { class: 'muted' }, 'Heute ist kein Supplement fällig.'),
    h('a', { class: 'link', href: '#/ich/supplements' }, 'Supplements verwalten'));
  };
  draw();
  return openSheet(box, { title: 'Supplements' });
}
