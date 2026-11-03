// „Ich → Zyklus“ (Einstellungen, Erinnerungen, Daten übernehmen) und „Zyklus → Bericht“ für die Frauenärztin.
// Nach viewEinstellungen, remSection, viewBericht und dem Import in zyklus.js im Rezeptbuch (Copyright (c) 2026
// JuliaKelp, MIT). Neu: Karten- und Kalenderstil, feinere Methoden, Hinweise im Bericht. Die PIN liegt jetzt unter
// „Ich → PIN-Sperre“ (core/lock.js) und gilt wahlweise für die ganze App.
import { h } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { pageHead, toast } from '../../core/ui.js';
import { isoDate } from '../../core/format.js';
import { lockSettings } from '../../core/lock.js';
import { backLink, sec, list, note, switchRow, timeRow, segRow, linkRow, actionRow } from '../../core/setui.js';
import * as M from './model.js';
import { TRACK, cycleSettings, setCycleSettings, cycleAvailable, cycleDays, cycleAnalysis, importBleedDays, deleteCycleDays } from './cycle.js';

const back = (href, label) => h('a', { class: 'back', href }, icon('chevron', { size: 16, cls: 'flip' }), label);
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

  // Erinnerung: Schalter, darunter (wenn an) die Uhrzeit
  const rem = (k, title, sub, timeKey) => [
    switchRow({ title, sub, on: c.rem[k], set: (v) => set({ rem: { ...c.rem, [k]: v } }) }),
    timeKey && c.rem[k] ? timeRow({ title: 'Uhrzeit', value: c.rem[timeKey], set: (v) => { if (/^d{2}:d{2}$/.test(v)) setCycleSettings({ rem: { ...c.rem, [timeKey]: v } }); } }) : null];
  const chips = (items, isOn, onTap) => h('div', { class: 'cfg-pad' }, h('div', { class: 'chips' }, ...items.map(([k, l]) =>
    h('button', { class: `chip${isOn(k) ? ' on' : ''}`, type: 'button', 'aria-pressed': isOn(k) ? 'true' : 'false', onclick: () => onTap(k) }, l))));

  return h('div', { class: 'cy' },
    backLink(),
    pageHead('Zyklus', 'Karte auf „Heute“, Kalender, Erinnerungen und Bericht. Alles bleibt auf diesem Handy.'),
    cycleAvailable() ? null : h('p', { class: 'hint small' }, 'Der Zyklus erscheint, wenn du unter „Schlaf & Körper“ bei „Hast du deine Regel?“ Ja wählst. ', h('a', { class: 'link', href: '#/ich/koerper' }, 'Öffnen')),
    sec('Allgemein'),
    list(switchRow({ title: 'Zyklus-Karte auf „Heute“', on: c.on, set: (v) => set({ on: v }) }),
      switchRow({ title: 'Fruchtbare Tage zeigen', sub: 'Breite Schätzung aus deinen Zykluslängen. Keine Verhütung.', on: c.fert, set: (v) => set({ fert: v }) }),
      segRow({ title: 'Karte auf „Heute“', options: [['strip', 'Streifen'], ['ring', 'Ring']], value: c.card, aria: 'Kartenstil', set: (k) => set({ card: k }) }),
      segRow({ title: 'Kalender', options: [['circles', 'Kreise'], ['band', 'Band']], value: c.cal, aria: 'Kalenderstil', set: (k) => set({ cal: k }) })),
    sec('Verhütung'),
    list(chips(M.METHODS, (k) => c.method === k, (k) => set({ method: k }))),
    note('Mit hormoneller Verhütung zeigt die App keine fruchtbaren Tage und keine Phasen. Bei Pille und Minipille fragt „Eintragen“ nach der Pille.'),
    sec('Lebensphase'),
    list(chips(M.PHASES, (k) => c.phase === k, (k) => set({ phase: k }))),
    note('Schwangerschaft, Stillzeit und Wechseljahre pausieren die Vorhersagen. Eintragen geht weiter.'),
    sec('Erinnerungen'),
    list(...rem('period', 'Periode bald', 'ab 2 Tage vor dem frühesten Termin'),
      ...(M.dailyPill(c.method) ? rem('pill', 'Pille', 'täglich ab dieser Uhrzeit, bis sie eingetragen ist', 'pillTime') : []),
      ...(c.track.temp ? rem('temp', 'Temperatur messen', 'morgens ab dieser Uhrzeit', 'tempTime') : []),
      actionRow({ title: 'In den Kalender übernehmen (.ics)', onClick: () => {
        const text = M.icsFile(cycleAnalysis(today), today, { rem: c.rem, method: c.method, phase: c.phase, track: c.track });
        if (!text) { toast('Schalte erst eine Erinnerung ein, die in den Kalender passt.', { error: true }); return; }
        shareFile(text, 'the-tracker-erinnerungen.ics', 'text/calendar');
      } })),
    note('Ohne Server kann die App dich nicht von selbst anstupsen. Die Erinnerung steht auf „Heute“, sobald du die App öffnest. Für einen echten Wecker übernimmst du die Termine in den Kalender deines Handys; die Titel heißen nur „The Tracker“.'),
    sec('Was ich tracke'),
    list(chips(TRACK, (k) => !!c.track[k], (k) => set({ track: { ...c.track, [k]: !c.track[k] } }))),
    note('Ausgeschaltetes erscheint beim Eintragen nicht. Die Blutung ist immer da.'),
    sec('Daten übernehmen'),
    list(h('div', { class: 'cfg-pad' },
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
        h('label', { class: 'btn' }, 'Datei wählen', file)))),
    note('Kalenderdatei (.ics) oder Tabelle (.csv, .txt) mit einem Datum pro Zeile. Ganztägige Termine über mehrere Tage zählen als Blutungstage. Übernommene Tage tragen die Stärke „Mittel“. ',
      n ? `${n} Tage mit Einträgen gespeichert.` : 'Noch keine Einträge.'),
    sec('Mehr'),
    list(linkRow({ title: 'Bericht für die Ärztin', sub: 'Zykluslängen, Blutung, Beschwerden', badge: ['cyc', 'list'], href: '#/zyklus/bericht' }),
      linkRow({ title: 'PIN-Sperre', badge: ['app', 'lock'], value: L.on ? 'an' : 'aus', href: '#/ich/sperre' }),
      linkRow({ title: 'Wissen und Quellen', badge: ['app', 'info'], href: '#/zyklus/wissen' })),
    n ? [sec('Daten'), list(confirmDel
      ? [h('div', { class: 'cfg-pad' }, h('p', { class: 'small', style: 'margin:0' }, 'Wirklich alle Zyklusdaten löschen? Das geht nur mit einem Backup rückgängig.')),
        actionRow({ title: 'Ja, löschen', danger: true, onClick: () => { confirmDel = false; deleteCycleDays(); toast('Zyklusdaten gelöscht'); rerender(); } }),
        actionRow({ title: 'Abbrechen', onClick: () => { confirmDel = false; rerender(); } })]
      : actionRow({ title: 'Zyklusdaten löschen …', danger: true, onClick: () => { confirmDel = true; rerender(); } }))] : null);
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
