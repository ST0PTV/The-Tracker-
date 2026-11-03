// „Ich → Heute anpassen“ (0.4.2): welche Karten auf „Heute“ erscheinen und in welcher Reihenfolge.
// Die Schalter sind die bestehenden Einstellungen der Bereiche (Wasser, Koffein … an/aus); neu ist nur die Reihenfolge
// in tt_settings.todayOrder. Die Tagesübersicht steht immer oben. Ziehen am Griff; mit Tastatur/VoiceOver Pfeil hoch/runter.
import { h } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { pageHead } from '../../core/ui.js';
import { getSettings, setSettings } from '../../core/settings.js';
import { getWeightGoal, setWeightGoal } from '../../core/profile.js';
import { backLink, sec, list, note, row, switchRow } from '../../core/setui.js';
import { cycleAvailable, cycleSettings, setCycleSettings } from '../cycle/cycle.js';
import { waterSettings, setWaterSettings } from '../drinks/water.js';
import { caffSettings, setCaffSettings } from '../drinks/caffeine.js';
import { alcSettings, setAlcSettings } from '../drinks/alcohol.js';
import { suppSettings, setSuppSettings } from '../supp/supplements.js';
import * as tstore from '../training/store.js';

// Karten in der Standard-Reihenfolge. get/set = bestehende Einstellung; ohne get = immer an (Mahlzeiten).
export const TODAY_CARDS = [
  { key: 'cycle', title: 'Zyklus', sub: 'nur am heutigen Tag', badge: ['cyc', 'drop'],
    get: () => cycleSettings().on !== false, set: (v) => setCycleSettings({ on: v }), avail: cycleAvailable,
    off: 'unter „Schlaf & Körper“ einschalten' },
  { key: 'training', title: 'Training', sub: 'Plan des Tages, Woche', badge: ['train', 'dumbbell'],
    get: () => tstore.get('settings').todayCard !== false, set: (v) => tstore.set('settings', { ...tstore.get('settings'), todayCard: v }) },
  { key: 'supp', title: 'Supplements', badge: ['supp', 'pill'], get: () => !!suppSettings().enabled, set: (v) => setSuppSettings({ enabled: v }) },
  { key: 'meals', title: 'Mahlzeiten', sub: 'erscheinen mit dem ersten Eintrag', badge: ['food', 'book'] },
  { key: 'water', title: 'Wasser', badge: ['water', 'drop'], get: () => !!waterSettings().enabled, set: (v) => setWaterSettings({ enabled: v }) },
  { key: 'caff', title: 'Koffein', badge: ['caf', 'cup'], get: () => !!caffSettings().enabled, set: (v) => setCaffSettings({ enabled: v }) },
  { key: 'alc', title: 'Alkohol', badge: ['alc', 'glass'], get: () => !!alcSettings().enabled, set: (v) => setAlcSettings({ enabled: v }) },
  { key: 'weight', title: 'Gewicht', sub: 'Karte mit Verlauf', badge: ['wt', 'scale'], get: () => !!getWeightGoal().card, set: (v) => setWeightGoal({ card: v }) }
];
const KEYS = TODAY_CARDS.map((c) => c.key);
const byKey = (k) => TODAY_CARDS.find((c) => c.key === k);

/** Reihenfolge der Karten: gespeicherte zuerst (unbekannte fallen weg), fehlende an ihrer Standardstelle. */
export function todayOrder(settings = getSettings()) {
  const saved = Array.isArray(settings && settings.todayOrder) ? settings.todayOrder.filter((k, i, a) => KEYS.includes(k) && a.indexOf(k) === i) : [];
  const out = [...saved];
  KEYS.forEach((k, i) => {
    if (out.includes(k)) return;
    // hinter die letzte Karte, die im Standard davor kommt
    const before = KEYS.slice(0, i).reverse().find((b) => out.includes(b));
    out.splice(before ? out.indexOf(before) + 1 : 0, 0, k);
  });
  return out;
}

/** An = Karte kann erscheinen (Bereich eingeschaltet und verfügbar). */
export const cardOn = (c) => (c.avail ? c.avail() : true) && (c.get ? c.get() : true);

/** Kurzform für „Ich“: „7 von 8 Karten“. */
export function todaySummary() {
  const n = TODAY_CARDS.filter(cardOn).length;
  return `${n + 1} von ${TODAY_CARDS.length + 1} Karten · Reihenfolge`;
}

let editing = false;
// Beim Verlassen der Seite endet der Reihenfolge-Modus (sonst steht er beim nächsten Öffnen noch an)
if (typeof window !== 'undefined') window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/ich/heute')) editing = false; });

export function todayLayoutView(rerender) {
  const order = todayOrder();
  const on = order.filter((k) => cardOn(byKey(k)));
  const off = order.filter((k) => !cardOn(byKey(k)));
  const save = (keys) => { setSettings({ todayOrder: [...keys, ...off] }); };
  const fixed = row({ title: 'Tagesübersicht', sub: editing ? '' : 'Kalorien und Makros', badge: ['food', 'target'], right: h('span', { class: 'cfg-fixed' }, 'immer oben') });

  const toggleBtn = h('button', { type: 'button', class: 'cfg-edit', 'aria-pressed': editing ? 'true' : 'false',
    onclick: () => { editing = !editing; rerender(); } }, editing ? 'Fertig' : 'Reihenfolge');

  let rows;
  if (!editing) {
    rows = order.map((k) => {
      const c = byKey(k);
      if (!c.get) return row({ title: c.title, sub: c.sub, badge: c.badge, right: h('span', { class: 'cfg-fixed' }, 'immer') });
      const avail = c.avail ? c.avail() : true;
      return switchRow({ title: c.title, sub: avail ? c.sub || '' : c.off, badge: c.badge, on: avail && c.get(), disabled: !avail,
        set: (v) => { c.set(v); rerender(); } });
    });
  } else {
    rows = [...on.map((k, i) => dragRow(byKey(k), i, on, save, rerender)),
      ...off.map((k) => row({ title: byKey(k).title, badge: byKey(k).badge, right: h('span', { class: 'cfg-fixed' }, 'aus') }))];
  }
  return h('div', { class: 'today-layout' },
    backLink(),
    pageHead('Heute anpassen', 'Welche Karten auf „Heute“ erscheinen und in welcher Reihenfolge.'),
    h('div', { class: 'cfg-sec' }, h('span', {}, 'Karten'), toggleBtn),
    list(fixed, ...rows),
    editing
      ? note('Am Griff ziehen. Ausgeschaltete Karten stehen unten. ',
        h('a', { href: '#/ich/heute', onclick: (e) => { e.preventDefault(); setSettings({ todayOrder: [] }); rerender(); } }, 'Standard wiederherstellen'))
      : note('Aus heißt: Karte und Eintrag im „+“ verschwinden. Deine Daten bleiben und kommen beim Einschalten zurück.'));
}

// Zeile im Bearbeiten-Modus: Griff zum Ziehen (Zeiger) und für Pfeiltasten (Tastatur, VoiceOver)
function dragRow(c, i, keys, save, rerender) {
  const move = (to) => {
    if (to < 0 || to >= keys.length || to === i) return;
    const next = [...keys]; next.splice(to, 0, next.splice(i, 1)[0]);
    save(next); rerender();
    // Fokus bleibt auf dem verschobenen Griff
    requestAnimationFrame(() => document.querySelector(`.cfg-grip[data-key="${c.key}"]`)?.focus());
  };
  const grip = h('button', { type: 'button', class: 'cfg-grip', 'data-key': c.key,
    'aria-label': `${c.title} verschieben, Position ${i + 1} von ${keys.length}. Pfeil hoch oder runter.`,
    onkeydown: (e) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); move(i - 1); }
      if (e.key === 'ArrowDown') { e.preventDefault(); move(i + 1); }
    } }, icon('grip', { size: 20 }));
  const el = row({ title: c.title, badge: c.badge, right: grip, cls: 'cfg-drag' });
  grip.addEventListener('pointerdown', (e) => startDrag(e, el, i, keys.length, move));
  return el;
}

// Ziehen: Zeile folgt dem Finger, die anderen weichen aus; beim Loslassen wird die neue Stelle gespeichert.
function startDrag(e, el, from, count, move) {
  e.preventDefault();
  const grip = e.currentTarget;
  grip.setPointerCapture(e.pointerId);
  const listEl = el.parentElement;
  const rows = [...listEl.querySelectorAll('.cfg-drag')];
  const hgt = el.getBoundingClientRect().height;
  const y0 = e.clientY;
  let to = from;
  el.classList.add('dragging');
  const onMove = (ev) => {
    const dy = ev.clientY - y0;
    to = Math.max(0, Math.min(count - 1, from + Math.round(dy / hgt)));
    el.style.transform = `translateY(${dy}px)`;
    rows.forEach((r, j) => {
      if (r === el) return;
      const shift = from < to && j > from && j <= to ? -hgt : from > to && j < from && j >= to ? hgt : 0;
      r.style.transform = shift ? `translateY(${shift}px)` : '';
    });
  };
  const onUp = () => {
    grip.removeEventListener('pointermove', onMove);
    grip.removeEventListener('pointerup', onUp);
    grip.removeEventListener('pointercancel', onUp);
    rows.forEach((r) => { r.style.transform = ''; });
    el.classList.remove('dragging');
    if (to !== from) move(to);
  };
  grip.addEventListener('pointermove', onMove);
  grip.addEventListener('pointerup', onUp);
  grip.addEventListener('pointercancel', onUp);
}
