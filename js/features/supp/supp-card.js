// Supplements: Karte unter „Heute“ (antippen = genommen; offene hervorgehoben, „Alle genommen“, „Später“),
// Verwaltung unter „Ich → Supplements“ (Katalog, Plan, ⓘ mit Studienlage und Quellen).
// Nach suppCardHtml/suppSettingsHtml im Kalorien-Tracker (Rezeptbuch/tracker/js/supplements.js; ST0PTV/JuliaKelp, MIT).
// Farben: je Supplement aus dem Katalog (c hell, cd dunkel) – Wahl per CSS über --sc-l/--sc-d, siehe css/app.css.
import { h } from '../../core/util.js';
import { openSheet } from '../../core/sheet.js';
import { icon } from '../../core/icons.js';
import { toast, pageHead } from '../../core/ui.js';
import { openInfo, infoBtn } from '../../core/info.js';
import { num } from '../../core/format.js';
import { getProfile } from '../../core/profile.js';
import { SUPP_CAT, SUPP_CAT_MAP, SUPP_EV } from './catalog.js';
import { suppSettings, setSuppSettings, itemsFor, isTaken, setTaken, slotLabel, summary, addItem, updateItem, removeItem, overNote,
  SUPP_SLOTS, SUPP_DAYS, SUPP_UNITS, SUPP_FORMS } from './supplements.js';

const NEUTRAL = { c: '#8A7666', cd: '#AEAEB2' }; // eigene Supplements ohne Katalogfarbe

/* Icons nach Darreichungsform (gefüllte Formen), in currentColor */
const SHAPES = {
  powder: '<path d="M3.5 17.5h17l-1.4 2.5H4.9z" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M5.5 17.5c1.3-3.4 3.6-5.5 6.5-5.5s5.2 2.1 6.5 5.5z" fill="currentColor"/><circle cx="9" cy="9" r=".9" fill="currentColor"/><circle cx="14.5" cy="7.5" r=".9" fill="currentColor"/><circle cx="12" cy="5" r=".9" fill="currentColor"/>',
  tablet: '<circle cx="12" cy="12" r="8.5" fill="currentColor"/><path d="M4 12h16" style="stroke:var(--bg)" stroke-opacity="0.45" stroke-width="1.6"/><path d="M8 7.8a6 6 0 0 1 4-1.6" stroke="#fff" stroke-opacity="0.55" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
  softgel: '<g transform="rotate(-35 12 12)"><rect x="2.8" y="7" width="18.4" height="10" rx="5" fill="currentColor"/><rect x="5.5" y="9" width="9" height="2.2" rx="1.1" fill="#fff" fill-opacity="0.5"/></g>',
  capsule: '<g transform="rotate(-35 12 12)"><rect x="2.8" y="7.5" width="18.4" height="9" rx="4.5" fill="currentColor" fill-opacity="0.38" stroke="currentColor" stroke-width="1.4"/><path d="M12 7.5h5.2a4.5 4.5 0 0 1 0 9H12z" fill="currentColor"/></g>',
  drops: '<path d="M12 3.2c3.2 4.3 5.6 7.6 5.6 10.6a5.6 5.6 0 0 1-11.2 0c0-3 2.4-6.3 5.6-10.6z" fill="currentColor"/><path d="M9.2 13.6a2.9 2.9 0 0 0 2 2.8" stroke="#fff" stroke-opacity="0.55" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
  custom: '<g transform="rotate(-35 12 12)"><rect x="2.8" y="7.5" width="18.4" height="9" rx="4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2.4"/></g><path d="M12 9.5v5M9.5 12h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>'
};
const escT = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const badgeOf = (x) => (SUPP_CAT_MAP[x.kind] || {}).k || String(x.name || '?').replace(/^Vitamin\s+/i, '').replace(/[^A-Za-zÄÖÜäöüß0-9]/g, '').slice(0, 2) || '?';
const colorsOf = (x) => SUPP_CAT_MAP[x.kind] || NEUTRAL;

/** Icon mit Kürzel-Plakette; Farbe über CSS-Variablen (hell/dunkel). */
export function suppIcon(x, size = 34) {
  const col = colorsOf(x);
  const b = badgeOf(x);
  const fs = b.length >= 3 ? 5.2 : 6.2;
  const span = h('span', { class: 'supp-ico', style: `--sc-l:${col.c};--sc-d:${col.cd || col.c}` });
  span.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><g transform="translate(-1.6 -1.6) scale(.86)">${SHAPES[x.form] || SHAPES.custom}</g><rect x="12.6" y="13.6" width="10.6" height="8.6" rx="3" style="fill:var(--surface)" stroke="currentColor" stroke-width="1"/><text x="17.9" y="19.9" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-weight="700" font-size="${fs}" fill="currentColor">${escT(b)}</text></svg>`;
  return span;
}

// ---------- ⓘ ----------
const NOREC = 'Keine Empfehlung. Diese Angaben fassen Fachquellen zusammen und ersetzen keine ärztliche oder pharmazeutische Beratung. Ob ein Supplement für dich sinnvoll ist, klärst du am besten mit deiner Ärztin, deinem Arzt oder in der Apotheke.';
function ironRef() {
  const sx = getProfile().sex;
  if (sx === 'm') return 'Bedarf laut DGE (2024) für Männer: 11 mg/Tag.';
  if (sx === 'f') return 'Bedarf laut DGE (2024) für Frauen: 14–16 mg/Tag (je nach Alter; in der Schwangerschaft 27 mg).';
  return 'Bedarf laut DGE (2024): Männer 11 mg, Frauen 14–16 mg pro Tag.';
}
export function suppInfo(kind) {
  const c = SUPP_CAT_MAP[kind];
  if (!c) { openInfo({ title: 'Eigenes Supplement', note: NOREC, body: ['Für eigene Supplements hat die App keine hinterlegten Informationen. Angaben zu Menge und Wirkung stehen auf der Packung oder bei Fachstellen wie dem BfR oder der Verbraucherzentrale.'] }); return; }
  const [evT] = SUPP_EV[c.ev];
  openInfo({
    title: c.name, note: NOREC,
    points: [['Was', c.what], ['Studienlage', `${evT} – ${c.study}${c.iron ? ' ' + ironRef() : ''}`],
      ...(c.max ? [['BfR-Höchstmenge', `für Nahrungsergänzungsmittel ${String(c.max[0]).replace('.', ',')} ${c.max[1]} pro Tag`]] : []),
      ['Vorsicht', c.care]],
    src: c.src
  });
}
export function remindInfo() {
  openInfo({ title: 'Supplements', body: [
    'Sind beim Öffnen der App noch Supplements offen, wird die Karte hervorgehoben und zeigt „Alle genommen“. „Später“ blendet die Hervorhebung für eine Stunde aus.',
    'Eine Benachrichtigung bei geschlossener App ist ohne Server nicht möglich.',
    'Koffein-Tabletten (Menge in mg) zählen beim Abhaken im Koffein-Tracker mit.'] });
}

// ---------- Karte ----------
let snoozeUntil = 0; // nur im Speicher: „Später“ = eine Stunde

export function suppCard(iso, today) {
  const s = suppSettings();
  if (!s.enabled) return null;
  const items = itemsFor(iso);
  if (!items.length) {
    return s.items.length ? null : h('section', { class: 'card tk supp is-empty' },
      h('div', { class: 'tk-head' }, h('div', {}, h('span', { class: 'tk-label' }, 'Supplements'), h('p', { class: 'small muted' }, 'Noch keine angelegt.')),
        h('a', { class: 'btn', href: '#/ich/supplements' }, 'Anlegen')));
  }
  const done = items.filter((x) => isTaken(iso, x.id)).length;
  const open = items.length - done;
  const hi = open > 0 && s.remind && iso === today && Date.now() >= snoozeUntil;
  const pills = items.map((x) => {
    const taken = isTaken(iso, x.id);
    return h('button', {
      class: `supp-pill${taken ? ' taken' : ''}`, type: 'button', 'aria-pressed': taken ? 'true' : 'false', 'aria-label': `${x.name} ${taken ? 'genommen' : 'noch offen'}`,
      onclick: () => { setTaken(iso, x.id, !taken); if (navigator.vibrate) navigator.vibrate(15); }
    },
    h('span', { class: 'supp-icw' }, suppIcon(x), taken ? h('i', { class: 'supp-check' }, icon('check', { size: 12 })) : null),
    h('span', { class: 'supp-n' }, x.name.replace(/^Vitamin /, '')),
    h('span', { class: 'supp-s' }, taken ? 'erledigt' : slotLabel(x)));
  });
  return h('section', { class: `card tk supp${hi ? ' due' : ''}` },
    h('div', { class: 'tk-head' },
      h('span', { class: 'tk-label' }, 'Supplements ', h('span', { class: `count${done === items.length ? ' all' : ''}` }, `${done}/${items.length}`)),
      hi ? h('span', { class: 'supp-acts' },
        h('button', { class: 'chip', type: 'button', onclick: (e) => { snoozeUntil = Date.now() + 3600000; toast('Hervorhebung für 1 Stunde aus'); e.currentTarget.closest('.supp').classList.remove('due'); e.currentTarget.parentElement.remove(); } }, 'Später'),
        h('button', { class: 'chip on', type: 'button', onclick: () => { for (const x of items) if (!isTaken(iso, x.id)) setTaken(iso, x.id, true); toast('Alle abgehakt'); } }, 'Alle genommen')) : null),
    h('div', { class: 'supp-grid' }, ...pills));
}

// ---------- Verwaltung ----------
function editSheet(x, rerender) {
  let sheet = null;
  const name = h('input', { class: 'input', type: 'text', value: x.name, 'aria-label': 'Name' });
  const amount = h('input', { class: 'input', type: 'text', inputmode: 'decimal', value: String(x.amount).replace('.', ','), 'aria-label': 'Menge' });
  const unit = h('select', { class: 'input', 'aria-label': 'Einheit' }, ...SUPP_UNITS.map((u) => h('option', { value: u, selected: u === x.unit }, u)));
  const form = h('select', { class: 'input', 'aria-label': 'Form' }, ...SUPP_FORMS.map(([k, l]) => h('option', { value: k, selected: k === x.form }, l)));
  const st = { mode: x.mode, days: x.days.slice(), slot: x.slot, time: x.time };
  const modeSeg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Wann' });
  const dayChips = h('div', { class: 'chips' });
  const slotChips = h('div', { class: 'chips' });
  const time = h('input', { class: 'input', type: 'time', value: x.time, 'aria-label': 'Uhrzeit' });
  const warn = h('p', { class: 'small warn' });
  const draw = () => {
    modeSeg.replaceChildren(...[['daily', 'Täglich'], ['every2', 'Jeden 2. Tag'], ['days', 'Wochentage']].map(([k, l]) => h('button', {
      type: 'button', role: 'radio', 'aria-checked': st.mode === k ? 'true' : 'false', onclick: () => { st.mode = k; draw(); } }, l)));
    dayChips.hidden = st.mode !== 'days';
    dayChips.replaceChildren(...SUPP_DAYS.map((d, i) => h('button', { class: `chip${st.days.includes(i + 1) ? ' on' : ''}`, type: 'button',
      onclick: () => { st.days = st.days.includes(i + 1) ? st.days.filter((q) => q !== i + 1) : st.days.concat(i + 1); draw(); } }, d)));
    slotChips.replaceChildren(...SUPP_SLOTS.map(([k, l]) => h('button', { class: `chip${st.slot === k ? ' on' : ''}`, type: 'button', onclick: () => { st.slot = k; draw(); } }, l)));
    time.hidden = st.slot !== 'time';
    warn.textContent = overNote({ ...x, amount: num(amount.value), unit: unit.value });
    warn.hidden = !warn.textContent;
  };
  amount.addEventListener('input', draw); unit.addEventListener('change', draw);
  const save = () => {
    try {
      updateItem(x.id, { name: name.value, amount: num(amount.value), unit: unit.value, form: form.value, mode: st.mode, days: st.days, slot: st.slot, time: time.value || '08:00' });
    } catch (e) { toast(e.message, { error: true }); return; }
    toast('Gespeichert'); sheet.close(); rerender();
  };
  const del = () => { if (!confirm(`„${x.name}“ löschen? Bereits abgehakte Tage bleiben gespeichert.`)) return; removeItem(x.id); sheet.close(); rerender(); };
  draw();
  sheet = openSheet(h('div', { class: 'supp-edit' },
    h('label', { class: 'form-label' }, h('span', {}, 'Name'), name),
    h('div', { class: 'two' }, h('label', { class: 'form-label' }, h('span', {}, 'Menge'), amount), h('label', { class: 'form-label' }, h('span', {}, 'Einheit'), unit)),
    warn,
    h('label', { class: 'form-label' }, h('span', {}, 'Form (Icon)'), form),
    h('span', { class: 'label' }, 'Wann'), modeSeg, dayChips,
    h('span', { class: 'label' }, 'Zu welcher Mahlzeit / Uhrzeit'), slotChips, time,
    h('button', { class: 'btn primary block', type: 'button', onclick: save }, 'Speichern'),
    h('button', { class: 'btn block danger-text', type: 'button', onclick: del }, 'Supplement löschen')),
  { title: x.name, full: true });
}

function pickSheet(rerender) {
  let sheet = null;
  const pick = (kind) => { const x = addItem(kind); toast(`${x.name} hinzugefügt`); sheet.close(); rerender(); editSheet(x, rerender); };
  sheet = openSheet(h('div', {},
    h('p', { class: 'small muted' }, 'Zu jedem Supplement gibt es ein ⓘ mit Studienlage, BfR-Höchstmenge und Quellen – keine Empfehlung.'),
    h('div', { class: 'card list' }, ...SUPP_CAT.map((c) => h('div', { class: 'row' },
      h('button', { class: 't plain-btn', type: 'button', onclick: () => pick(c.kind) },
        suppIcon(c, 28), h('span', {}, h('b', {}, c.name), h('small', {}, SUPP_EV[c.ev][0]))),
      infoBtn(c.name, () => suppInfo(c.kind)))),
    h('div', { class: 'row' }, h('button', { class: 't plain-btn', type: 'button', onclick: () => pick('custom') },
      suppIcon({ kind: 'custom', form: 'custom', name: '+' }, 28), h('span', {}, h('b', {}, 'Eigenes Supplement'), h('small', {}, 'ohne hinterlegte Infos')))))),
  { title: 'Supplement hinzufügen', full: true });
}

export function suppSettingsView(rerender) {
  const s = suppSettings();
  const sw = (key, label) => {
    const inp = h('input', { type: 'checkbox', 'aria-label': label });
    inp.checked = !!s[key];
    inp.addEventListener('change', () => setSuppSettings({ [key]: inp.checked }));
    return h('label', { class: 'check-row' }, inp, h('span', {}, label));
  };
  return h('div', {},
    h('a', { class: 'back', href: '#/ich' }, icon('chevron', { size: 16, cls: 'flip' }), 'Ich'),
    pageHead('Supplements', 'Abhaken unter „Heute“. Hinweise sind Information, keine Empfehlung.'),
    h('section', { class: 'card' }, sw('enabled', 'Supplement-Karte unter „Heute“ anzeigen'),
      h('div', { class: 'check-wrap' }, sw('remind', 'Offene Supplements hervorheben'), infoBtn('Hervorheben', remindInfo))),
    s.items.length ? h('section', { class: 'card list' }, ...s.items.map((x) => {
      const on = h('input', { type: 'checkbox', 'aria-label': `${x.name} aktiv` });
      on.checked = !!x.on;
      on.addEventListener('change', () => { updateItem(x.id, { on: on.checked }); rerender(); });
      return h('div', { class: 'row' },
        h('button', { class: 't plain-btn', type: 'button', onclick: () => editSheet(x, rerender) },
          suppIcon(x, 28), h('span', {}, h('b', {}, x.name), h('small', {}, x.on ? summary(x) : 'ausgeschaltet'))),
        infoBtn(x.name, () => suppInfo(SUPP_CAT_MAP[x.kind] ? x.kind : 'custom')),
        h('label', { class: 'switch' }, on, h('span', { class: 'slider' })));
    })) : h('p', { class: 'muted center' }, 'Noch keine Supplements angelegt.'),
    h('button', { class: 'btn primary block', type: 'button', onclick: () => pickSheet(rerender) }, '+ Supplement hinzufügen'));
}
