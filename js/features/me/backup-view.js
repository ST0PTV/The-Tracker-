// „Ich → Daten & Backup“ (0.5.0): Sicherung erstellen und wiederherstellen, „Deine Daten“, alle Daten löschen.
// Ablauf (Teilen-Menü auf dem iPhone, sonst Download; „zuletzt gesichert“ ohne Erinnerungsdruck; Bestätigung mit Übersicht)
// nach Workout-Tracker/js/views.js + privacy-info.js 3.14 und Calorie-Tracker/js/app.js (MIT, ST0PTV); Logik in core/backup.js.
import { h } from '../../core/util.js';
import { toast, pageHead } from '../../core/ui.js';
import * as store from '../../core/store.js';
import { backLink, sec, list, note, row, actionRow } from '../../core/setui.js';
import { shareOrDownload } from '../../core/file-share.js';
import { buildBackup, parseBackup, applyBackup, fileName, MAX_BYTES } from '../../core/backup.js';

store.define('backupmeta', { last: null });

let pending = null;      // geprüfte Sicherung, wartet auf „Ersetzen“
let confirmWipe = false;

const dateDe = (iso) => { const d = new Date(iso); return Number.isNaN(+d) ? '–' : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }); };
const daysAgo = (iso) => Math.floor((Date.now() - new Date(iso)) / 864e5);

/** Untertitel für „Ich“: wann zuletzt gesichert. */
export function backupSummary() {
  const last = store.get('backupmeta').last;
  if (!last) return 'noch nie gesichert';
  const n = daysAgo(last);
  return `zuletzt ${n <= 0 ? 'heute' : n === 1 ? 'gestern' : `vor ${n} Tagen`}`;
}

const standalone = () => (typeof window !== 'undefined') && ((window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true);

async function exportNow(rerender) {
  if (store.inSandbox()) { toast('Während des Probetrainings geht das nicht.', { error: true }); return; }
  const text = JSON.stringify(buildBackup());
  const name = fileName();
  if (await shareOrDownload(text, name, 'The Tracker – Backup') === 'aborted') return; // abgebrochen: nichts vermerken
  store.update('backupmeta', (m) => { m.last = new Date().toISOString(); });
  toast('Backup erstellt');
  rerender();
}

async function pick(input, rerender) {
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  if (store.inSandbox()) { toast('Während des Probetrainings geht das nicht.', { error: true }); return; }
  if (file.size > MAX_BYTES) { toast('Die Datei ist größer als 20 MB.', { error: true }); return; }
  const r = parseBackup(await file.text());
  if (!r.ok) { toast(r.error, { error: true }); pending = null; rerender(); return; }
  pending = r;
  rerender();
}

function confirmBlock(rerender) {
  const s = pending.summary;
  const parts = [[s.days, 'Tage im Tagebuch'], [s.weights, 'Gewichtseinträge'], [s.trainings, 'Trainings'], [s.plans, 'Trainingspläne'],
    [s.cycleDays, 'Zyklustage'], [s.ownRecipes, 'eigene Rezepte'], [s.ownFoods, 'eigene Lebensmittel']].filter(([n]) => n > 0);
  return [sec('Wiederherstellen?'),
    list(h('div', { class: 'cfg-pad backup-confirm' },
      h('p', { class: 'small', style: 'margin:0 0 6px' }, h('b', {}, `Sicherung vom ${s.exportedAt ? dateDe(s.exportedAt) : '–'}`), s.version ? ` · The Tracker ${s.version}` : ''),
      h('p', { class: 'small muted', style: 'margin:0' }, parts.length ? parts.map(([n, t]) => `${n} ${t}`).join(' · ') : 'Nur Einstellungen, keine Einträge.')),
      actionRow({ title: 'Alle Daten ersetzen', danger: true, onClick: () => {
        const ok = applyBackup(pending.backup);
        pending = null;
        if (!ok) { toast('Wiederherstellen fehlgeschlagen – die bisherigen Daten bleiben erhalten.', { error: true }); rerender(); return; }
        toast('Backup wiederhergestellt');
        setTimeout(() => { location.hash = '#/'; location.reload(); }, 600);
      } }),
      actionRow({ title: 'Abbrechen', onClick: () => { pending = null; rerender(); } })),
    note('Alle Daten auf diesem Gerät werden durch die Sicherung ersetzt. Die PIN-Sperre bleibt, wie sie ist.')];
}

export function backupView(rerender) {
  const last = store.get('backupmeta').last;
  const input = h('input', { type: 'file', accept: 'application/json,.json', class: 'visually-hidden', 'aria-label': 'Backup-Datei wählen', onchange: (e) => pick(e.currentTarget, rerender) });
  return h('div', {},
    backLink(),
    pageHead('Daten & Backup', 'Alles liegt nur auf diesem Gerät. Eine Sicherung holt es zurück.'),
    sec('Sichern'),
    list(row({ title: 'Letzte Sicherung', right: h('span', { class: 'cfg-val' }, last ? dateDe(last) : 'noch nie') }),
      actionRow({ title: 'Backup erstellen', onClick: () => exportNow(rerender) })),
    note('Eine Datei mit allen Daten der App: Tagebuch, Ziele, Körperdaten, Getränke, Rezepte, Vorrat, Zyklus und Training. Ohne PIN. ',
      'Die Datei ist nicht verschlüsselt – in „Dateien“ oder an einem sicheren Ort ablegen.'),
    pending ? confirmBlock(rerender) : [sec('Wiederherstellen'),
      list(h('label', { class: 'cfg-row cfg-action', role: 'button', tabindex: '0', onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } } },
        h('span', { class: 't' }, h('b', {}, 'Backup-Datei wählen …')), input)),
      note('Nur Sicherungen von The Tracker. Vor dem Ersetzen zeigt die App, was in der Datei steht.')],
    sec('Deine Daten'),
    list(h('div', { class: 'cfg-pad privacy' },
      h('p', {}, h('b', {}, 'Nur auf diesem Gerät. '), 'Einträge, Ziele, Zyklus und Training liegen im Speicher des Browsers. Es gibt kein Konto und keinen Server.'),
      h('p', {}, h('b', {}, 'Die App sendet keine Daten. '), 'Ausnahme: Beim Barcode-Scan geht nur die Nummer an Open Food Facts. Beim Laden der App sieht GitHub Pages wie jede Website die IP-Adresse.'),
      h('p', {}, h('b', {}, 'Selbst sichern. '), 'Werden die Website-Daten in Safari oder die App auf dem Home-Bildschirm gelöscht, ist alles weg. Nur ein Backup holt es zurück.'),
      standalone() ? null : h('p', {}, h('b', {}, 'Tipp: '), 'Über „Teilen → Zum Home-Bildschirm“ als App speichern. Im Browser kann Safari die Daten einer Website löschen, wenn sie länger nicht geöffnet wurde.'))),
    sec('Löschen'),
    list(confirmWipe
      ? [h('div', { class: 'cfg-pad' }, h('p', { class: 'small', style: 'margin:0' }, 'Wirklich alle Daten von The Tracker auf diesem Gerät löschen, auch die PIN? Das geht nur mit einem Backup rückgängig.')),
        actionRow({ title: 'Ja, alles löschen', danger: true, onClick: () => { confirmWipe = false; store.wipeAll(); toast('Alle Daten gelöscht'); setTimeout(() => { location.hash = '#/'; location.reload(); }, 600); } }),
        actionRow({ title: 'Abbrechen', onClick: () => { confirmWipe = false; rerender(); } })]
      : actionRow({ title: 'Alle Daten löschen …', danger: true, onClick: () => { confirmWipe = true; rerender(); } })),
    note('Andere Apps auf dieser Website (Calorie- und Workout-Tracker) bleiben unberührt.'));
}

if (typeof window !== 'undefined') window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/ich/daten')) { pending = null; confirmWipe = false; } });
