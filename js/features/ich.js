// Reiter „Ich“: Ziele, Körperdaten, Darstellung, Quellen & Lizenzen.
// Das Ziel-Formular ist bewusst schlicht; Phase 2 übernimmt die volle Zielseite aus dem Calorie-Tracker
// (Bedarf aus Uhr, Gewichtsziel, Ziel-Verlauf).
import { h } from '../core/util.js';
import { pageHead, toast } from '../core/ui.js';
import { icon } from '../core/icons.js';
import * as store from '../core/store.js';
import { getGoals, getProfile, setProfile, setGoal, macrosFrom, fatCheck, PRESETS } from '../core/profile.js';
import { getSettings, setSettings } from '../core/settings.js';
import { applyTheme, APPEARANCES } from '../core/theme.js';
import { VERSION } from '../core/version.js';

const fmt = (n) => Math.round(n).toLocaleString('de-DE');

const row = (href, title, detail) =>
  h('a', { class: 'row', href }, h('span', { class: 't' }, h('b', {}, title), detail ? h('small', {}, detail) : null), icon('chevron', { size: 18 }));

function ichView(rerender) {
  const g = getGoals();
  const s = getSettings();
  return h('div', {},
    pageHead('Ich'),
    h('section', { class: 'card list' },
      row('#/ich/ziel', 'Tagesziel', g?.goal ? `${fmt(g.goal)} kcal · ${PRESETS[g.preset]?.label || ''}` : 'noch nicht festgelegt')),
    h('section', { class: 'card' },
      h('h2', {}, 'Darstellung'),
      h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Darstellung' },
        ...APPEARANCES.map(([key, label]) => h('button', {
          type: 'button', role: 'radio', 'aria-checked': s.appearance === key ? 'true' : 'false',
          onclick: () => { setSettings({ appearance: key }); applyTheme(key); rerender(); }
        }, label))),
      h('p', { class: 'muted small' }, 'Weitere Themes kommen später.')),
    h('section', { class: 'card list' },
      row('#/ich/quellen', 'Quellen & Lizenzen')),
    h('p', { class: 'muted small center' }, `The Tracker ${VERSION} · ${store.usageKB()} KB lokal gespeichert`));
}

function zielView() {
  const g = getGoals() || {};
  const p = getProfile();
  let preset = g.preset && PRESETS[g.preset] ? g.preset : 'dge';
  const kcalIn = h('input', { class: 'input', type: 'number', inputmode: 'numeric', min: 800, max: 6000, value: g.goal ?? '', placeholder: 'z. B. 2200', 'aria-label': 'Kalorienziel' });
  const wIn = h('input', { class: 'input', type: 'number', inputmode: 'decimal', step: '0.1', min: 30, max: 300, value: p.weightKg ?? '', placeholder: 'z. B. 75', 'aria-label': 'Körpergewicht' });
  const preview = h('div', { class: 'stats' });
  const note = h('p', { class: 'muted small' });
  const seg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Makro-Verteilung' });

  const num = (el) => { const v = parseFloat(String(el.value).replace(',', '.')); return Number.isFinite(v) ? v : null; };
  const update = () => {
    seg.replaceChildren(...Object.entries(PRESETS).filter(([k]) => k !== 'custom').map(([k, P]) =>
      h('button', { type: 'button', role: 'radio', 'aria-checked': k === preset ? 'true' : 'false', onclick: () => { preset = k; update(); } }, P.label)));
    const P = PRESETS[preset];
    const m = macrosFrom(num(kcalIn), num(wIn), P.pf, P.ff);
    const stat = (label, v) => h('div', { class: 'stat' }, h('b', {}, v == null ? '–' : `${fmt(v)} g`), h('span', {}, label));
    preview.replaceChildren(stat('Eiweiß', m?.protein), stat('Kohlenhydrate', m?.carbs), stat('Fett', m?.fat));
    const fc = m ? fatCheck(preset, m.fatPct) : null;
    note.textContent = !m
      ? 'Kalorienziel und Gewicht eintragen, dann rechne ich die Makros.'
      : `Fett ${m.fatPct} % der Energie${fc === 0 ? ' – im empfohlenen Bereich.' : fc === 1 ? ' – über dem empfohlenen Bereich.' : fc === -1 ? ' – unter dem empfohlenen Bereich.' : '.'}`;
  };
  kcalIn.addEventListener('input', update);
  wIn.addEventListener('input', update);
  update();

  const save = () => {
    const kcal = num(kcalIn);
    const w = num(wIn);
    if (!(kcal >= 800 && kcal <= 6000)) { toast('Bitte ein Kalorienziel zwischen 800 und 6.000 eintragen.', { error: true }); return; }
    if (w != null) setProfile({ weightKg: w });
    setGoal({ goal: kcal, preset, weight: w });
    toast('Ziel gespeichert');
    location.hash = '#/ich';
  };

  return h('div', {},
    h('a', { class: 'back', href: '#/ich' }, icon('chevron', { size: 16, cls: 'flip' }), 'Ich'),
    pageHead('Tagesziel', 'Gilt ab heute. Rezepte und Wochenplan rechnen mit diesem Ziel.'),
    h('section', { class: 'card form' },
      h('label', {}, h('span', {}, 'Kalorien pro Tag'), kcalIn),
      h('label', {}, h('span', {}, 'Körpergewicht (kg)'), wIn),
      h('span', { class: 'label' }, 'Makro-Verteilung'), seg, preview, note),
    h('button', { class: 'btn primary block', type: 'button', onclick: save }, 'Speichern'));
}

// Quellen und Lizenzen aller übernommenen Teile. Wird mit jeder Phase ergänzt.
const CREDITS = [
  ['Workout-Tracker', 'Speicherschicht, Router, Bottom Sheets, Icons und das Design „Apple nativ“ übernommen.', 'ST0PTV · MIT-Lizenz', 'https://github.com/ST0PTV/Workout-Tracker'],
  ['Calorie-Tracker', 'Makro-Presets und Datenform der Ziel-Historie übernommen (Herleitung und Studien dort in der README).', 'ST0PTV · MIT-Lizenz', 'https://github.com/ST0PTV/Calorie-Tracker'],
  ['Rezeptbuch', 'Aufbau der Navigation (Heute · Rezepte · Ich); Rezepte, Wochenplan und Zyklus folgen in Phase 3.', 'JuliaKelp · MIT-Lizenz', 'https://github.com/juliakelp/Rezeptbuch']
];

function quellenView() {
  return h('div', {},
    h('a', { class: 'back', href: '#/ich' }, icon('chevron', { size: 16, cls: 'flip' }), 'Ich'),
    pageHead('Quellen & Lizenzen', 'Eigener Code: MIT-Lizenz. Übernommene Teile behalten ihre Lizenz.'),
    ...CREDITS.map(([name, what, who, link]) => h('section', { class: 'card' },
      h('h2', {}, name), h('p', {}, what), h('p', { class: 'muted small' }, who),
      h('a', { class: 'link', href: link, target: '_blank', rel: 'noopener' }, 'Repository öffnen'))));
}

export const ichRoutes = { '/ich': ichView, '/ich/ziel': zielView, '/ich/quellen': quellenView };
