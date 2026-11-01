// Übernommen aus dem Workout-Tracker 3.14.0 (js/cycle-view.js, MIT, ST0PTV), angepasst für The Tracker.
// Zyklus (v2.24.0, Variante C, Nutzerwahl): eine kleine Zeile auf dem Trainings-Start, Details im Sheet.
// The Tracker 0.3.2: Daten, Vorhersage und Hinweise kommen nur aus dem Zyklus-Bereich (features/cycle, Nutzerwahl 2026-10-31:
// Sheet bleibt im Aussehen, schreibt aber dorthin). Kein eigener Speicher mehr (wt_cycle wird nie gelesen), keine eigenen
// Zyklus-Einstellungen (die stehen unter „Ich → Zyklus“). Schein-PIN: cycle.js liefert dann den leeren Datenbestand.
// Beschwerden statt Phasen: keine Trainingsempfehlung nach Zyklusphase, kein Eisprung-Datum, keine Diagnosen,
// keine Verletzungs- oder Kalorienaussagen. Der „leichte Tag“ ist jederzeit frei wählbar und kommt nie automatisch.
import { infoBody } from './info.js';
import { h } from './util.js';
import { openSheet } from './sheet.js';
import { icon } from './icons.js';
import { toast } from './ui.js';
import { cycleActive, cycleSettings, cycleAnalysis, cycleDays, dayEntry, setDayField } from '../cycle/cycle.js';
import * as M from '../cycle/model.js';
import { isoDate } from '../../core/format.js';
import { TEMPLATES } from './routine-data.js';
import { startRun } from './routine-view.js';

const LIGHT_ROUTINE = 'tpl:cd-relax-10'; // Gehen und Dehnen, 10 min
const fmt = (k) => new Date(`${k}T12:00:00`).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });

// Beschwerden des Workout-Trackers → Felder im Tageseintrag von The Tracker (cycle-views.js: BODY, MOOD, pain, bleed).
export const SYMPTOMS = {
  cramps: { label: 'Krämpfe', f: 'body', v: 'Unterleibskrämpfe' },
  tired: { label: 'Müde', f: 'mood', v: 'Müde' },
  headache: { label: 'Kopfschmerzen', f: 'body', v: 'Kopfweh' },
  mood: { label: 'Stimmung', f: 'mood', v: 'Stimmungsschwankungen' },
  sleep: { label: 'Schlecht geschlafen', f: 'body', v: 'Schlecht geschlafen' },
  bloating: { label: 'Blähbauch', f: 'body', v: 'Blähbauch' },
  heavy: { label: 'Sehr starke Blutung', f: 'bleed', v: 4 },
  pain: { label: 'Starke Schmerzen', f: 'pain', v: 'Stark' }
};
const PERIOD_BLEED = 3; // „Periode hat begonnen“ = Blutung „Mittel“ (wie der Import in features/cycle)

/** Ist die Beschwerde im Eintrag gesetzt? */
export function symptomOn(entry, key) {
  const s = SYMPTOMS[key];
  if (s.f === 'body' || s.f === 'mood') return (entry[s.f] || []).includes(s.v);
  return entry[s.f] === s.v;
}

/** Neuer Feldwert, wenn die Beschwerde umgeschaltet wird: [Feld, Wert]. Blutung „Stark“ aus → zurück auf „Mittel“. */
export function toggledField(entry, key) {
  const s = SYMPTOMS[key];
  const on = symptomOn(entry, key);
  if (s.f === 'body' || s.f === 'mood') {
    const list = entry[s.f] || [];
    return [s.f, on ? list.filter((x) => x !== s.v) : [...list, s.v]];
  }
  if (s.f === 'bleed') return ['bleed', on ? PERIOD_BLEED : s.v];
  return [s.f, on ? null : s.v];
}

/** Zustand für Zeile und Sheet, nur aus dem Zyklus-Bereich. */
export function cycleState(today = isoDate()) {
  if (!cycleActive()) return { mode: 'off' };
  const c = cycleSettings();
  const days = cycleDays();
  const a = cycleAnalysis(today);
  const e = days[today] || {};
  const inPeriod = M.isBleed(e) || (M.isBleed(days[M.addDays(today, -1)]) && !!a.last && a.dayNo <= M.NORMAL_BLEED);
  const flags = M.flags(a, days, today, { method: c.method, phase: c.phase }).map((f) => f.text);
  return { mode: a.last ? 'on' : 'nodata', a, c, e, today, inPeriod, bleedToday: M.isBleed(e), flags,
    next: a.last ? M.nextText(a, today, { phase: c.phase }) : '', hormonal: M.hormonal(c.method) };
}

const write = (iso, f, v) => { try { return setDayField(iso, f, v); } catch (err) { toast(err.message, { error: true }); return false; } };

export const CYCLE_INFO = {
  checkedAt: '2026-10-22',
  short: [
    'Freiwillig, nur auf diesem Gerät. Kein Verhütungs- oder Fruchtbarkeitsmittel.',
    'Keine Trainingsregeln je Phase – Studien zeigen dafür keinen Vorteil.',
    'Die nächste Periode ist nur ein grobes Zeitfenster; Arzt-Hinweise sind keine Diagnose.'
  ],
  points: [
    'Die Funktion ist freiwillig und speichert alles nur auf diesem Gerät (auch im Backup). Sie ersetzt keine ärztliche Beratung und ist kein Verhütungs- oder Fruchtbarkeitsmittel.',
    'Warum keine Trainingstipps je Phase: In einer randomisierten Studie mit hormonell bestätigten Phasen (24 Frauen, 3 Zyklen) brachte Training mit Schwerpunkt in der ersten oder zweiten Zyklushälfte keinen Vorteil für Muskelaufbau oder Kraft gegenüber gleichmäßigem Training; entscheidend war das Trainingsvolumen. Eine Übersicht über mehrere Meta-Analysen kam zum selben Schluss.',
    'Akute Leistung: In einer großen Meta-Analyse (78 Studien) war die Leistung in den ersten Zyklustagen höchstens trivial geringer als in den übrigen Phasen; die meisten Studien hatten niedrige Qualität. Allgemeine Regeln lassen sich daraus nicht ableiten – wie du dich fühlst, ist der bessere Maßstab.',
    'Regelschmerzen: Regelmäßiges Training über den ganzen Monat (Dehnen, Rumpftraining, Yoga oder Ausdauer, meist 45–60 min, 3× pro Woche) ging in Studien mit deutlich weniger Regelschmerzen einher – die Evidenz ist aber von niedriger Qualität, und Krafttraining wurde dort nicht untersucht.',
    'Die nächste Periode ist nur ein grobes Zeitfenster aus deinen Angaben. Zykluslängen schwanken; in über 600.000 Zyklen lag die zweite Zyklushälfte zwischen etwa 7 und 17 Tagen. Nur deine eingetragenen Periodentage sind sicher. Einen Eisprung zeigt die App bewusst nicht an.',
    'Mit Pille, Ring oder Pflaster gibt es keine natürlichen Zyklusphasen; die App zeigt dann keine Schätzung. Die Pille hatte in einer Meta-Analyse keinen Einfluss auf Muskelaufbau und Kraft durch Training. Mit Hormonspirale, Implantat, Minipille oder Spritze sind Blutungen oft unregelmäßig – deshalb auch hier keine Vorhersage.',
    'Hinweise zum Arztbesuch erscheinen nur bei deinen eigenen Angaben, z. B. wenn über 90 Tage keine Periode eingetragen ist, Zyklen mehrfach länger als 35 Tage sind oder du sehr starke Blutung oder starke Schmerzen einträgst. Sie sind keine Diagnose.'
  ],
  sources: [
    { label: "D'Souza et al. 2026, Med Sci Sports Exerc", url: 'https://doi.org/10.1249/MSS.0000000000004031', note: 'RCT, 24 Frauen, hormonell bestätigte Phasen: kein Vorteil durch phasenbasiertes Training (Abstract)' },
    { label: 'Colenso-Semple et al. 2023, Front Sports Act Living', url: 'https://doi.org/10.3389/fspor.2023.1054542', note: 'Umbrella-Review: kein nachweisbarer Einfluss der Phase auf Kraft oder Anpassung (Abstract)' },
    { label: 'McNulty et al. 2020, Sports Medicine', url: 'https://doi.org/10.1007/s40279-020-01319-3', note: 'Meta-Analyse, 78 Studien: höchstens trivial geringere Leistung in der frühen Follikelphase (Abstract)' },
    { label: 'Armour et al. 2019, Cochrane Database Syst Rev', url: 'https://doi.org/10.1002/14651858.CD004142.pub4', note: 'Training gegen Regelschmerzen: großer Effekt, niedrige Evidenzqualität; kein Krafttraining untersucht (Abstract)' },
    { label: 'Bull et al. 2019, npj Digital Medicine', url: 'https://doi.org/10.1038/s41746-019-0152-7', note: '612.613 Zyklen: Lutealphase 7–17 Tage (95 %-Bereich); Autorinnen/Autoren teils von einem App-Anbieter (Abstract)' },
    { label: 'Nolan et al. 2024, Sports Medicine', url: 'https://doi.org/10.1007/s40279-023-01911-3', note: 'Meta-Analyse: Pille ohne Einfluss auf Muskelaufbau und Kraft; andere Methoden nicht untersucht (Abstract)' },
    { label: 'IOC REDs Clinical Assessment Tool 2 (2023)', url: 'https://stillmed.olympics.com/media/Documents/Athletes/Medical-Scientific/Consensus-Statements/REDs/IOC-REDs-CAT-V2.pdf', note: 'Ausbleiben von 3–11 Zyklen, Zyklen > 35 Tage als Warnzeichen; nicht zur alleinigen Diagnose (automatische Seitenzusammenfassung)' }
  ]
};

function openCycleInfo() {
  openSheet(infoBody({
    short: CYCLE_INFO.short, details: [h('ul', {}, CYCLE_INFO.points.map((t) => h('li', {}, t))),
      h('p', { class: 'muted small' }, 'Einträge aus dem Training landen im Zyklus von The Tracker (Kalender unter „Heute“ bzw. „Ich → Zyklus“). Dort stellst du den Zyklus auch ein oder aus und löschst Einträge.')],
    sources: CYCLE_INFO.sources, checked: CYCLE_INFO.checkedAt
  }), { title: 'Zyklus: so funktioniert es' });
}

function statusText(st) {
  if (st.mode === 'nodata') return 'Ersten Periodentag eintragen';
  return `Tag ${st.a.dayNo}${st.inPeriod ? ' · Periode' : ''}`;
}

// Kleine Zeile auf dem Trainings-Start (nur wenn der Zyklus an ist); Hinweis-Karte nur bei Auslöser.
export function cycleStartCards(rerender) {
  const st = cycleState();
  if (st.mode === 'off') return [];
  return [
    h('button', { type: 'button', class: 'card cyc-line', onclick: () => openCycleSheet(rerender) },
      h('span', {}, h('i', { class: `cyc-dot${st.inPeriod ? ' on' : ''}` }), `Zyklus: ${statusText(st)}`),
      h('span', { class: 'cyc-right' }, icon('chevron', { size: 18 }))),
    st.flags.length ? h('div', { class: 'card cyc-flag', role: 'note' }, h('b', {}, 'Hinweis'), st.flags.map((f) => h('p', { class: 'small' }, f))) : null
  ].filter(Boolean);
}

export function openCycleSheet(rerender) {
  let sheet = null;
  const body = h('div', { class: 'cyc-sheet' });
  const update = (iso, f, v) => { if (write(iso, f, v)) { draw(); rerender(); } };
  const draw = () => {
    const st = cycleState();
    if (st.mode === 'off') { sheet?.close(); return; }
    const { today, e } = st;
    const nextLine = st.next ? `${st.next} (Schätzung aus deinen Einträgen)` : null;
    const recent = st.mode === 'nodata' ? [] : [...st.a.starts].reverse().slice(0, 4);
    body.replaceChildren(
      h('div', { class: 'cyc-big' }, statusText(st)),
      nextLine ? h('p', { class: 'muted small' }, nextLine) : null,
      h('h3', {}, 'Wie fühlst du dich heute?'),
      h('div', { class: 'chips wrap' }, Object.entries(SYMPTOMS).map(([k, s]) => {
        const on = symptomOn(e, k);
        return h('button', { type: 'button', class: `chip${on ? ' on' : ''}`, 'aria-pressed': String(on), onclick: () => update(today, ...toggledField(dayEntry(today), k)) }, s.label);
      })),
      h('p', { class: 'muted small' }, 'Trainiere so, wie du dich fühlst – die Phase allein ändert nichts am Aufbau.'),
      st.flags.length ? h('div', { class: 'card cyc-flag', role: 'note' }, h('b', {}, 'Hinweis'), st.flags.map((f) => h('p', { class: 'small' }, f))) : null,
      h('button', { class: 'btn block', type: 'button', onclick: () => {
        const r = TEMPLATES.find((t) => t.id === LIGHT_ROUTINE);
        if (!r) return;
        sheet?.close(); startRun(r, { returnTo: '#/training' });
      } }, 'Leichter Tag: Entspannen 10 min'),
      st.bleedToday
        ? h('button', { class: 'btn block', type: 'button', onclick: () => update(today, 'bleed', null) }, 'Heute doch keine Blutung')
        : h('button', { class: 'btn primary block', type: 'button', onclick: () => update(today, 'bleed', PERIOD_BLEED) }, st.inPeriod ? 'Blutung heute eintragen' : st.hormonal ? 'Blutung hat begonnen (heute)' : 'Periode hat begonnen (heute)'),
      h('label', { class: 'field cyc-date' }, h('span', {}, 'Anderer Tag:'),
        h('input', { class: 'input', type: 'date', max: today, onchange: (ev) => { if (ev.target.value) update(ev.target.value, 'bleed', PERIOD_BLEED); } })),
      recent.length ? h('div', {}, h('h3', {}, 'Eingetragen'),
        h('div', { class: 'card list' }, recent.map((d) => h('div', { class: 'row' }, h('span', { class: 't' }, `Beginn ${fmt(d)}`))))) : null,
      h('a', { class: 'btn block', href: `#/zyklus/tag?d=${today}`, onclick: () => sheet?.close() }, 'Alle Angaben für heute'),
      h('button', { class: 'link small center-btn', type: 'button', onclick: openCycleInfo }, 'So funktioniert es · Quellen'));
  };
  draw();
  sheet = openSheet(body, { title: 'Zyklus' });
}
