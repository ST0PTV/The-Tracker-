// „Ich → Darstellung“ (0.4.1): Theme als Vorschaukarten, darunter Hell, Dunkel oder System.
// Die Vorschau nutzt dieselben Tokens wie die App: data-pv am Element (css/app.css, Abschnitt Themes).
import { h } from '../../core/util.js';
import { pageHead } from '../../core/ui.js';
import { icon } from '../../core/icons.js';
import { getSettings, setSettings } from '../../core/settings.js';
import { applyTheme, PALETTES, APPEARANCES, paletteOf, appearanceOf } from '../../core/theme.js';

/** Kurzform für die Zeile unter „Ich“, z. B. „Sand · System“. */
export function lookSummary(s = getSettings()) {
  const pal = PALETTES.find(([k]) => k === paletteOf(s));
  const app = APPEARANCES.find(([k]) => k === appearanceOf(s));
  return `${pal[1]} · ${app[1]}`;
}

// Mini-Bildschirm: Grund (bei Glas mit Verlauf), eine Karte mit Ring in der Akzentfarbe, zwei Textzeilen, Knopf
function preview() {
  return h('span', { class: 'pv', 'aria-hidden': 'true' },
    h('span', { class: 'pv-card' },
      h('span', { class: 'pv-ring' }),
      h('span', { class: 'pv-lines' }, h('span', { class: 'pv-l1' }), h('span', { class: 'pv-l2' }), h('span', { class: 'pv-l2 short' }))),
    h('span', { class: 'pv-card pv-row' }, h('span', { class: 'pv-l1' }), h('span', { class: 'pv-dot' })),
    h('span', { class: 'pv-btn' }));
}

export function lookView(rerender) {
  const s = getSettings();
  const pal = paletteOf(s), app = appearanceOf(s);
  const set = (patch) => { setSettings(patch); applyTheme(getSettings()); rerender(); };
  return h('div', { class: 'look' },
    h('a', { class: 'back', href: '#/ich' }, icon('chevron', { size: 16, cls: 'flip' }), 'Ich'),
    pageHead('Darstellung', 'Theme und Helligkeit gelten für die ganze App.'),
    h('h3', { class: 'sec' }, 'Theme'),
    h('div', { class: 'pal-grid', role: 'radiogroup', 'aria-label': 'Theme' },
      ...PALETTES.map(([key, label, desc]) => h('button', {
        type: 'button', class: 'pal-card', role: 'radio', 'data-pv': key, 'aria-checked': key === pal ? 'true' : 'false',
        'aria-label': `${label}: ${desc}`, onclick: () => { if (key !== pal) set({ palette: key }); }
      }, preview(),
      h('span', { class: 'pal-name' }, h('b', {}, label), key === pal ? icon('check', { size: 16 }) : null),
      h('small', { class: 'pal-desc' }, desc)))),
    h('h3', { class: 'sec' }, 'Erscheinung'),
    h('section', { class: 'card' },
      h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Erscheinung' },
        ...APPEARANCES.map(([key, label]) => h('button', {
          type: 'button', role: 'radio', 'aria-checked': key === app ? 'true' : 'false',
          onclick: () => { if (key !== app) set({ appearance: key }); }
        }, label))),
      h('p', { class: 'small muted look-note' }, app === 'system'
        ? 'Folgt der Einstellung des Geräts und wechselt mit ihr, z. B. abends auf Dunkel.'
        : 'Bei „System“ folgt die App der Einstellung des Geräts.')),
    pal === 'glas' ? h('p', { class: 'small muted page-note' }, 'Glas legt Karten mit Unschärfe über einen Farbverlauf. Ist auf dem iPhone „Transparenz reduzieren“ an, werden die Karten deckend.') : null);
}
