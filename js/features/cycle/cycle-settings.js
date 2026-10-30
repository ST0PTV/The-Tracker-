// „Ich → Zyklus“ (Einstellungen, Erinnerungen, Daten übernehmen) und „Zyklus → Bericht“ für die Frauenärztin.
// Nach viewEinstellungen, remSection, viewBericht und dem Import in zyklus.js im Rezeptbuch (Copyright (c) 2026
// JuliaKelp, MIT). Neu: Karten- und Kalenderstil, feinere Methoden, Hinweise im Bericht. Die PIN liegt jetzt unter
// „Ich → PIN-Sperre“ (core/lock.js) und gilt wahlweise für die ganze App.
import { h } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { pageHead, toast } from '../../core/ui.js';
import { isoDate } from '../../core/format.js';
import { lockSettings } from '../../core/lock.js';
import * as M from './model.js';
import { TRACK, cycleSettings, setCycleSettings, cycleAvailable, cycleDays, cycleAnalysis, importBleedDays, deleteCycleDays } from './cycle.js';

const back = (href, label) => h('a', { class: 'back', href }, icon('chevron', { size: 16, cls: 'flip' }), label);
const seg = (label, items, cur, set) => h('div', { class: 'seg', role: 'radiogroup', 'aria-label': label },
  ...items.map(([k, l]) => h('button', { type: 'button', role: 'radio', 'aria-checked': k === cur ? 'true' : 'false', onclick: () => set(k) }, l)));
function toggle(label, on, set, hint = '') {
  const inp = h('input', { type: 'checkbox', 'aria-label': label });
  inp.checked = !!on;
  inp.addEventListener('change', () => set(inp.checked));
  return h('label', { class: 'check-row' }, inp, h('span', {}, label, hint ? h('small', { class: 'form-hint' }, hint) : null));
}

/** Datei teilen (iOS: Teilen-Menü) oder herunterladen. */
async function shareFile(text, name, type) {
  const blob = new Blob([text], { type });
  try {
    const file = new File([blob], name, { type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return; }
  } catch (err) { if (err && err.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

let confirmDel = false;

export function cycleSettingsView(rerender) {
  const c = cycleSettings();
  const set = (patch) => { setCycleSettings(patch); rerender(); };
  const today = isoDate();
  const n = Object.keys(cycleDays()).length;
  const L = lockSettings();

  const startIn = h('input', { class: 'input', type: 'date', max: today, 'aria-label': 'Erster Tag einer Periode' });
  const file = h('input', { type: 'file', accept: '.ics,.csv,.txt,text/calendar,text/csv,text/plain', hidden: true });
  file.addEventListener('change', () => {
    const f = file.files && file.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const keys = M.parseDates(String(r.result || ''));
      const added = importBleedDays(keys);
      toast(keys.length ? `${added} Tage mit Blutung übernommen${keys.length > added ? `, ${keys.length - added} waren schon da oder liegen in der Zukunft` : ''}` : 'In der Datei habe ich keine Daten gefunden.', { error: !keys.length });
      rerender();
    };
    r.readAsText(f);
  });
  const paste = h('textarea', { class: 'input', rows: 3, placeholder: 'Ein Datum pro Zeile, z. B. 03.09.2026 oder 01.10.2026 bis 05.10.2026', 'aria-label': 'Daten einfügen' });

  const remRow = (k, label, hint, timeKey) => {
    const t = timeKey ? h('input', { class: 'input cy-time', type: 'time', value: c.rem[timeKey], 'aria-label': `Uhrzeit für ${label}` }) : null;
    if (t) t.addEventListener('change', () => { if (/^\d{2}:\d{2}$/.test(t.value)) setCycleSettings({ rem: { ...c.rem, [timeKey]: t.value } }); });
    return h('div', { class: 'cy-rem-row' }, toggle(label, c.rem[k], (v) => set({ rem: { ...c.rem, [k]: v } }), hint), t);
  };

  return h('div', { class: 'cy' },
    back('#/ich', 'Ich'),
    pageHead('Zyklus', 'Karte auf „Heute“, Kalender, Erinnerungen und Bericht. Alles bleibt auf diesem Handy.'),
    cycleAvailable() ? null : h('p', { class: 'hint small' }, 'Der Zyklus erscheint, wenn du unter „Schlaf & Körper“ bei „Hast du deine Regel?“ Ja wählst. ', h('a', { class: 'link', href: '#/ich/koerper' }, 'Öffnen')),
    h('h3', { class: 'sec' }, 'Allgemein'),
    h('section', { class: 'card' },
      toggle('Zyklus-Karte auf „Heute“', c.on, (v) => set({ on: v })),
      toggle('Fruchtbare Tage zeigen', c.fert, (v) => set({ fert: v }), 'Breite Schätzung aus deinen Zykluslängen. Keine Verhütung.'),
      h('span', { class: 'label' }, 'Karte auf „Heute“'), seg('Kartenstil', [['strip', 'Streifen'], ['ring', 'Ring']], c.card, (k) => set({ card: k })),
      h('span', { class: 'label' }, 'Kalender'), seg('Kalenderstil', [['circles', 'Kreise'], ['band', 'Band']], c.cal, (k) => set({ cal: k }))),
    h('h3', { class: 'sec' }, 'Verhütung'),
    h('section', { class: 'card' },
      h('div', { class: 'chips' }, ...M.METHODS.map(([k, l]) => h('button', { class: `chip${c.method === k ? ' on' : ''}`, type: 'button', 'aria-pressed': c.method === k ? 'true' : 'false', onclick: () => set({ method: k }) }, l))),
      h('p', { class: 'small muted' }, 'Mit hormoneller Verhütung zeigt die App keine fruchtbaren Tage und keine Phasen. Bei Pille und Minipille fragt „Eintragen“ nach der Pille.')),
    h('h3', { class: 'sec' }, 'Lebensphase'),
    h('section', { class: 'card' },
      h('div', { class: 'chips' }, ...M.PHASES.map(([k, l]) => h('button', { class: `chip${c.phase === k ? ' on' : ''}`, type: 'button', 'aria-pressed': c.phase === k ? 'true' : 'false', onclick: () => set({ phase: k }) }, l))),
      h('p', { class: 'small muted' }, 'Schwangerschaft, Stillzeit und Wechseljahre pausieren die Vorhersagen. Eintragen geht weiter.')),
    h('h3', { class: 'sec' }, 'Erinnerungen'),
    h('section', { class: 'card' },
      remRow('period', 'Periode bald', 'Ab 2 Tage vor dem frühesten Termin'),
      M.dailyPill(c.method) ? remRow('pill', 'Pille', 'Täglich ab dieser Uhrzeit, bis sie eingetragen ist', 'pillTime') : null,
      c.track.temp ? remRow('temp', 'Temperatur messen', 'Morgens ab dieser Uhrzeit', 'tempTime') : null,
      h('p', { class: 'small muted' }, 'Ohne Server kann die App dich nicht von selbst anstupsen. Die Erinnerung steht auf „Heute“, sobald du die App öffnest. Für einen echten Wecker übernimmst du die Termine in den Kalender deines Handys; die Titel heißen nur „The Tracker“.'),
      h('button', { class: 'btn block', type: 'button', onclick: () => {
        const text = M.icsFile(cycleAnalysis(today), today, { rem: c.rem, method: c.method, phase: c.phase, track: c.track });
        if (!text) { toast('Schalte erst eine Erinnerung ein, die in den Kalender passt.', { error: true }); return; }
        shareFile(text, 'the-tracker-erinnerungen.ics', 'text/calendar');
      } }, 'In den Kalender übernehmen (.ics)')),
    h('h3', { class: 'sec' }, 'Was ich tracke'),
    h('section', { class: 'card' },
      h('div', { class: 'chips' }, ...TRACK.map(([k, l]) => h('button', { class: `chip${c.track[k] ? ' on' : ''}`, type: 'button', 'aria-pressed': c.track[k] ? 'true' : 'false', onclick: () => set({ track: { ...c.track, [k]: !c.track[k] } }) }, l))),
      h('p', { class: 'small muted' }, 'Ausgeschaltetes erscheint beim Eintragen nicht. Die Blutung ist immer da.')),
    h('h3', { class: 'sec' }, 'Daten übernehmen'),
    h('section', { class: 'card' },
      h('span', { class: 'label' }, 'Erster Tag einer Periode'),
      h('div', { class: 'rz-have' }, startIn, h('button', { class: 'btn', type: 'button', onclick: () => {
        const v = startIn.value;
        if (!M.isIso(v) || v > today) { toast('Bitte ein Datum bis heute wählen.', { error: true }); return; }
        importBleedDays([v]); toast(`Periodenbeginn am ${M.dateOf(v).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })} eingetragen`); rerender();
      } }, 'Dazu')),
      h('span', { class: 'label' }, 'Mehrere Daten einfügen'), paste,
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn', type: 'button', onclick: () => {
          const keys = M.parseDates(paste.value);
          if (!keys.length) { toast('Keine Daten erkannt.', { error: true }); return; }
          const added = importBleedDays(keys); toast(`${added} Tage mit Blutung übernommen`); rerender();
        } }, 'Übernehmen'),
        h('label', { class: 'btn' }, 'Datei wählen', file)),
      h('p', { class: 'small muted' }, 'Kalenderdatei (.ics) oder Tabelle (.csv, .txt) mit einem Datum pro Zeile. Ganztägige Termine über mehrere Tage zählen als Blutungstage. Übernommene Tage tragen die Stärke „Mittel“.'),
      h('p', { class: 'small muted' }, n ? `${n} Tage mit Einträgen gespeichert.` : 'Noch keine Einträge.')),
    h('section', { class: 'card list me-grp' },
      h('a', { class: 'me-row k-cyc', href: '#/zyklus/bericht' }, h('span', { class: 'qa-badge' }, icon('list', { size: 20 })), h('span', { class: 't' }, h('b', {}, 'Bericht für die Ärztin'), h('small', {}, 'Zykluslängen, Blutung, Beschwerden')), h('span', { class: 'qa-chev' }, icon('chevron', { size: 16 }))),
      h('a', { class: 'me-row k-app', href: '#/ich/sperre' }, h('span', { class: 'qa-badge' }, icon('lock', { size: 20 })), h('span', { class: 't' }, h('b', {}, 'PIN-Sperre'), h('small', {}, L.on ? (L.scope === 'app' ? 'an · ganze App' : 'an · nur Zyklus') : 'aus')), h('span', { class: 'qa-chev' }, icon('chevron', { size: 16 }))),
      h('a', { class: 'me-row k-app', href: '#/zyklus/wissen' }, h('span', { class: 'qa-badge' }, icon('info', { size: 20 })), h('span', { class: 't' }, h('b', {}, 'Wissen und Quellen')), h('span', { class: 'qa-chev' }, icon('chevron', { size: 16 })))),
    n ? h('div', { class: 'cy-danger' }, confirmDel
      ? [h('p', { class: 'small' }, 'Wirklich alle Zyklusdaten löschen? Das geht nur mit einem Backup rückgängig.'),
        h('div', { class: 'btn-row' }, h('button', { class: 'btn', type: 'button', onclick: () => { confirmDel = false; rerender(); } }, 'Abbrechen'),
          h('button', { class: 'btn danger', type: 'button', onclick: () => { confirmDel = false; deleteCycleDays(); toast('Zyklusdaten gelöscht'); rerender(); } }, 'Ja, löschen'))]
      : h('button', { class: 'link danger', type: 'button', onclick: () => { confirmDel = true; rerender(); } }, 'Zyklusdaten löschen …')) : null);
}

// ---------- Bericht ----------
export function reportView() {
  const today = isoDate();
  const a = cycleAnalysis(today);
  const c = cycleSettings();
  const days = cycleDays();
  const rows = M.cycleRows(a, days, today);
  const flags = M.flags(a, days, today, { method: c.method, phase: c.phase });
  const d = (k) => M.dateOf(k).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const tally = (key) => { const s = {}; rows.forEach((r) => Object.entries(r[key]).forEach(([b, n]) => { s[b] = (s[b] || 0) + n; })); return Object.entries(s).sort((x, y) => y[1] - x[1]); };
  const body = tally('body').slice(0, 10), meds = tally('meds');
  const tr = (k, v) => h('div', { class: 'cy-up-row' }, h('span', {}, k), h('b', {}, v));
  const text = () => M.reportText(a, days, today, { method: c.method, flagList: flags });
  return h('div', { class: 'cy cy-report' },
    h('div', { class: 'no-print' }, back('#/zyklus/verlauf', 'Verlauf')),
    pageHead('Zyklusbericht', `Erstellt am ${d(today)} aus deinen Einträgen. Ohne Namen, damit du selbst entscheidest, was du weitergibst.`),
    a.last ? null : h('p', { class: 'hint small' }, 'Noch keine Periode eingetragen.'),
    a.own ? h('section', { class: 'card list' },
      tr('Zykluslänge typisch', `${a.median} Tage (${a.usable.length} Zyklen)`),
      tr('Kürzester / längster', `${a.min} / ${a.max} Tage`),
      tr('Blutung im Mittel', `${a.bleedAvg} Tage`),
      tr('Verhütung', (M.METHODS.find(([k]) => k === c.method) || M.METHODS[0])[1]),
      tr('Heute', `Zyklustag ${a.dayNo}`)) : null,
    rows.length ? [h('h3', { class: 'sec' }, 'Zyklen'), h('section', { class: 'card cy-scroll' }, h('table', { class: 'cy-table' },
      h('thead', {}, h('tr', {}, ...['Beginn', 'Länge', 'Blutung', 'stark', 'Schmier', 'Schmerz'].map((t) => h('th', {}, t)))),
      h('tbody', {}, ...rows.map((r) => h('tr', {}, h('td', {}, d(r.start)), h('td', {}, r.len ? `${r.len} T.` : 'läuft'), h('td', {}, r.imp ? '–' : `${r.bleed} T.`), h('td', {}, String(r.strong)), h('td', {}, String(r.spot)), h('td', {}, String(r.pain))))))),
    h('p', { class: 'small muted page-note' }, 'Normalwerte nach FIGO 2018: 24 bis 38 Tage, Unterschied bis 7 bis 9 Tage, Blutung bis 8 Tage. „–“: Tag aus einem Import, Dauer unbekannt.')] : null,
    body.length ? [h('h3', { class: 'sec' }, 'Häufigste Beschwerden'), h('section', { class: 'card list' }, ...body.map(([b, n]) => tr(b, `${n} ${n === 1 ? 'Tag' : 'Tage'}`)))] : null,
    meds.length ? [h('h3', { class: 'sec' }, 'Medikamente'), h('section', { class: 'card list' }, ...meds.map(([m, n]) => tr(m, `an ${n} ${n === 1 ? 'Tag' : 'Tagen'}`)))] : null,
    flags.length ? [h('h3', { class: 'sec' }, 'Auffällig in den Einträgen'), h('section', { class: 'card' }, h('ul', {}, ...flags.map((f) => h('li', {}, f.text))))] : null,
    h('div', { class: 'btn-row no-print' },
      h('button', { class: 'btn', type: 'button', onclick: () => window.print() }, 'Drucken oder PDF'),
      h('button', { class: 'btn primary', type: 'button', onclick: () => {
        const t = text();
        if (navigator.share) navigator.share({ title: 'Zyklusbericht', text: t }).catch(() => {});
        else shareFile(t, 'zyklusbericht.txt', 'text/plain');
      } }, 'Als Text teilen')));
}
