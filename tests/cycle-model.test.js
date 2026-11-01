// Zyklus-Modell (0.2.6): Periodenbeginne, Längen, Fenster, Kalenderstatus, Hinweise, Erinnerungen, ICS, Bericht, Import.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../js/features/cycle/model.js';

// Perioden mit Beginn, Dauer (Tage „Mittel“)
function make(starts, len = 5, extra = {}) {
  let days = {};
  for (const s of starts) for (let i = 0; i < len; i++) days[M.addDays(s, i)] = { bleed: 3 };
  for (const [k, v] of Object.entries(extra)) days[k] = { ...(days[k] || {}), ...v };
  return days;
}

test('Datum: addDays über Monats- und Zeitumstellung, diff', () => {
  assert.equal(M.addDays('2026-10-24', 2), '2026-10-26');
  assert.equal(M.addDays('2026-03-28', 2), '2026-03-30');
  assert.equal(M.diff('2026-01-01', '2026-03-01'), 59);
});

test('Ohne eigene Zyklen: 29 Tage, Fenster breit, keine Längen', () => {
  const days = make(['2026-10-18']);
  const a = M.analyze(days, '2026-10-29');
  assert.equal(a.own, false);
  assert.equal(a.avg, 29); assert.equal(a.min, 29); assert.equal(a.max, 29);
  assert.equal(a.last, '2026-10-18'); assert.equal(a.dayNo, 12);
  assert.deepEqual(a.ovu, { lo: 15, hi: 18, sure: false });
  assert.deepEqual(a.fert, { lo: 10, hi: 18 });
});

test('Eigene Zyklen: Median, Spanne, Ausreißer > 60 Tage und Lücken zählen nicht, nur die letzten 6', () => {
  const starts = ['2025-11-01', '2026-03-15', '2026-04-12', '2026-05-10', '2026-06-08', '2026-07-05', '2026-08-02', '2026-08-31', '2026-09-28'];
  const a = M.analyze(make(starts), '2026-10-10');
  assert.ok(!a.usable.includes(134));
  assert.equal(a.usable.length, 6);
  assert.equal(a.min, 27); assert.equal(a.max, 29);
  assert.equal(a.median, 28);
  assert.equal(a.spread, 2);
  // Fenster: Eisprung 27−14 = 13 bis 29−11 = 18 → fruchtbar Tag 8 bis 18
  assert.deepEqual(a.fert, { lo: 8, hi: 18 });
  assert.equal(a.bleedAvg, 5);
});

test('Schmierblutung ist kein Beginn; Blutung nach 1 Tag Pause gehört zur selben Periode', () => {
  const days = make(['2026-09-01', '2026-09-29'], 4, { '2026-09-27': { bleed: 1 }, '2026-10-04': { bleed: 2 } });
  days['2026-10-03'] = { bleed: 3 }; // Lücke 1 Tag nach Ende (02.10.) → kein neuer Beginn am 03.10.
  const a = M.analyze(days, '2026-10-10');
  assert.deepEqual(a.starts, ['2026-09-01', '2026-09-29']);
});

test('Positiver LH-Test: Eisprung am Tag danach, Fenster 5 Tage davor bis 1 Tag danach', () => {
  const days = make(['2026-09-01', '2026-09-29'], 5, { '2026-10-12': { lh: 'Positiv' } });
  const a = M.analyze(days, '2026-10-14');
  assert.equal(a.ovu.sure, true);
  assert.equal(a.ovu.lo, 15); // 12.10. = Tag 14 → Eisprung Tag 15
  assert.deepEqual(a.fert, { lo: 10, hi: 16 });
});

test('Nächste Periode und Text: Spanne, heute, überfällig, pausiert', () => {
  const days = make(['2026-08-04', '2026-09-01', '2026-09-30']); // 28, 29
  const a = M.analyze(days, '2026-10-20');
  const n = M.nextPeriod(a, '2026-10-20');
  assert.equal(n.lo, '2026-10-28'); assert.equal(n.hi, '2026-10-29');
  assert.equal(M.nextText(a, '2026-10-20'), 'Periode in 8 bis 9 Tagen');
  assert.equal(M.nextText(a, '2026-10-29'), 'Periode ab heute bis in 0 Tagen'.replace('ab heute bis in 0 Tagen', 'heute erwartet'));
  assert.equal(M.nextText(a, '2026-11-02'), 'Periode wäre seit 4 Tagen fällig');
  assert.equal(M.nextText(a, '2026-10-20', { phase: 'schwanger' }), 'Vorhersagen pausiert');
  assert.equal(M.nextText(M.analyze({}, '2026-10-20'), '2026-10-20'), '');
});

test('Kommende Perioden werden breiter', () => {
  const a = M.analyze(make(['2026-08-04', '2026-09-01', '2026-09-30']), '2026-10-20');
  const up = M.upcoming(a, '2026-10-20', 3);
  assert.equal(up.length, 3);
  assert.ok(M.diff(up[2].lo, up[2].hi) > M.diff(up[0].lo, up[0].hi));
});

test('Kalenderstatus: Blutung, erwartet (nur Zukunft), fruchtbar (laufend und künftig, nie rückwirkend)', () => {
  const days = make(['2026-08-04', '2026-09-01', '2026-09-30']);
  const a = M.analyze(days, '2026-10-05');
  const st = (iso, o) => M.dayStatus(a, days, iso, '2026-10-05', o);
  assert.equal(st('2026-10-01').bleed, true);
  assert.equal(st('2026-09-12').fert, false, 'voriger Zyklus: keine nachträgliche Schätzung');
  assert.equal(st('2026-10-10').fert, true);
  assert.equal(st('2026-10-10', { showFert: false }).fert, false);
  assert.equal(st('2026-10-29').pred, true);
  assert.equal(st('2026-10-29').fert, false);
  assert.equal(st('2026-10-29', { phase: 'stillen' }).pred, false);
});

test('Methoden: Kombi und Gestagen sind hormonell, tägliche Pille nur bei Pille und Minipille', () => {
  assert.equal(M.hormonal('pille'), true); assert.equal(M.hormonal('ring'), true); assert.equal(M.hormonal('gestagen'), true);
  assert.equal(M.hormonal('kupfer'), false); assert.equal(M.hormonal('none'), false);
  assert.equal(M.methodKind('mini'), 'gestagen');
  assert.equal(M.dailyPill('mini'), true); assert.equal(M.dailyPill('ring'), false);
});

test('Hinweise: ausgeblieben, lang, Schwankung, lange Blutung, Zwischenblutung, starke Schmerzen; aus mit Hormonen', () => {
  const ids = (days, today, o = {}) => M.flags(M.analyze(days, today), days, today, o).map((f) => f.id);
  assert.deepEqual(ids(make(['2026-06-01']), '2026-09-15'), ['absent']);
  assert.deepEqual(ids(make(['2026-06-01']), '2026-09-15', { method: 'pille' }), []);
  assert.ok(ids(make(['2026-01-01', '2026-02-12', '2026-03-26', '2026-05-08']), '2026-05-10').includes('long'));
  assert.ok(ids(make(['2026-01-01', '2026-01-23', '2026-02-28', '2026-03-23']), '2026-03-25').includes('spread'));
  assert.ok(ids(make(['2026-09-01', '2026-09-29'], 10), '2026-10-12').includes('bleed'));
  const between = make(['2026-09-01', '2026-09-29'], 5, { '2026-10-12': { bleed: 1 }, '2026-10-13': { bleed: 1 } });
  assert.ok(ids(between, '2026-10-15').includes('between'));
  const pain = make(['2026-09-01', '2026-09-29'], 5, { '2026-09-02': { pain: 'Stark' }, '2026-09-30': { pain: 'Stark' } });
  assert.ok(ids(pain, '2026-10-05').includes('pain'));
  assert.deepEqual(ids(make(['2026-08-04', '2026-09-01', '2026-09-30']), '2026-10-05'), []);
});

test('Erinnerungen: Periode bald, Pille ab Uhrzeit, Temperatur nur morgens', () => {
  const days = make(['2026-08-04', '2026-09-01', '2026-09-30']);
  const a = M.analyze(days, '2026-10-26');
  const rem = { period: true, pill: true, pillTime: '21:00', temp: true, tempTime: '06:30' };
  assert.deepEqual(M.reminders(a, {}, '2026-10-26', 600, { rem, method: 'none', track: {} }), ['Deine Periode kann in 2 Tagen kommen.']);
  assert.ok(M.reminders(a, {}, '2026-10-20', 21 * 60 + 5, { rem, method: 'pille', track: { pill: true } }).includes('Pille heute schon genommen?'));
  assert.equal(M.reminders(a, { pill: 'Genommen' }, '2026-10-20', 21 * 60 + 5, { rem, method: 'pille', track: { pill: true } }).length, 0);
  assert.ok(M.reminders(a, {}, '2026-10-20', 7 * 60, { rem, method: 'none', track: { temp: true } }).includes('Temperatur heute noch nicht eingetragen.'));
  assert.equal(M.reminders(a, {}, '2026-10-20', 13 * 60, { rem, method: 'none', track: { temp: true } }).length, 0);
});

test('ICS: neutrale Titel, tägliche Pille, Periode mit Wecker 2 Tage vorher; ohne Erinnerung null', () => {
  const a = M.analyze(make(['2026-08-04', '2026-09-01', '2026-09-30']), '2026-10-20');
  const rem = { period: true, pill: true, pillTime: '21:00', temp: false, tempTime: '06:30' };
  const ics = M.icsFile(a, '2026-10-20', { rem, method: 'pille', track: {} }, new Date('2026-10-20T10:00:00Z'));
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /DTSTART:20261020T210000/);
  assert.match(ics, /RRULE:FREQ=DAILY/);
  assert.ok(!/Periode|Pille|Zyklus/i.test(ics.split('\r\n').filter((l) => l.startsWith('SUMMARY') || l.startsWith('DESCRIPTION')).join()));
  const p = M.icsFile(a, '2026-10-20', { rem, method: 'none', track: {} });
  assert.match(p, /DTSTART;VALUE=DATE:20261028/);
  assert.match(p, /TRIGGER:-P2D/);
  assert.equal(M.icsFile(a, '2026-10-20', { rem: {}, method: 'none' }), null);
});

test('Bericht: Zeilen je Zyklus, Text ohne Namen, mit Beschwerden und Hinweisen', () => {
  const days = make(['2026-08-04', '2026-09-01', '2026-09-30'], 5, { '2026-09-02': { bleed: 4, pain: 'Mittel', body: ['Kopfweh'], meds: ['Schmerzmittel'] }, '2026-09-20': { bleed: 1 } });
  const a = M.analyze(days, '2026-10-05');
  const rows = M.cycleRows(a, days, '2026-10-05');
  assert.equal(rows.length, 3);
  assert.equal(rows[0].len, null);
  assert.equal(rows[1].len, 29); assert.equal(rows[1].strong, 1); assert.equal(rows[1].spot, 1); assert.equal(rows[1].pain, 1);
  const t = M.reportText(a, days, '2026-10-05', { method: 'kupfer', flagList: [{ text: 'X.' }] });
  assert.match(t, /Zyklusbericht vom 05\.10\.2026/);
  assert.match(t, /Kupferspirale/);
  assert.match(t, /Kopfweh 1/);
  assert.match(t, /Schmerzmittel 1/);
  assert.match(t, /Auffällig in den Einträgen: X\./);
});

test('Import: Text mit Spannen und Formaten, ICS ganztägig, Zukunft und vorhandene Blutung bleiben', () => {
  const keys = M.parseDates('03.09.2026\n2026-10-01 bis 2026-10-03\n5/8/2026\n31.02.2026\nquatsch');
  assert.deepEqual(keys, ['2026-08-05', '2026-09-03', '2026-10-01', '2026-10-02', '2026-10-03']);
  const ics = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20260901\r\nDTEND;VALUE=DATE:20260904\r\nEND:VEVENT\r\nEND:VCALENDAR';
  assert.deepEqual(M.parseDates(ics), ['2026-09-01', '2026-09-02', '2026-09-03']);
  const { days, added } = M.importDays({ '2026-09-02': { bleed: 4 } }, ['2026-09-01', '2026-09-02', '2027-01-01'], '2026-10-29');
  assert.equal(added, 1);
  assert.deepEqual(days['2026-09-01'], { bleed: 3, imp: 1 });
  assert.deepEqual(days['2026-09-02'], { bleed: 4 });
});

test('withField: setzt, löscht leere Werte und leere Tage, entfernt Import-Marke', () => {
  let d = M.withField({ '2026-10-01': { bleed: 3, imp: 1 } }, '2026-10-01', 'pain', 'Leicht');
  assert.deepEqual(d['2026-10-01'], { bleed: 3, pain: 'Leicht' });
  d = M.withField(d, '2026-10-01', 'pain', null);
  d = M.withField(d, '2026-10-01', 'bleed', null);
  assert.equal(d['2026-10-01'], undefined);
});

test('Hinweise ab 0.3.2: „zu lang“ ab drei Zyklen über 35 Tagen, Ausbleiben immer nach 90 Tagen', async () => {
  const M = await import('../js/features/cycle/model.js');
  const mk = (starts) => Object.fromEntries(starts.flatMap((s) => [0, 1, 2].map((i) => [M.addDays(s, i), { bleed: 3 }])));
  const chain = (first, lens) => lens.reduce((acc, n) => [...acc, M.addDays(acc[acc.length - 1], n)], [first]);
  // drei Zyklen à 36 Tage → Hinweis (vorher erst über 38)
  let starts = chain('2026-01-01', [36, 36, 36]);
  let today = M.addDays(starts[starts.length - 1], 5);
  let a = M.analyze(mk(starts), today);
  assert.ok(M.flags(a, mk(starts), today).some((f) => f.id === 'long'));
  starts = chain('2026-01-01', [35, 35, 35]);
  today = M.addDays(starts[starts.length - 1], 5);
  a = M.analyze(mk(starts), today);
  assert.ok(!M.flags(a, mk(starts), today).some((f) => f.id === 'long'), '35 Tage selbst ist noch kein Hinweis');
  // unregelmäßig (Schwankung > 9) und 100 Tage ohne Periode → Hinweis (vorher erst nach 180)
  starts = chain('2025-06-01', [24, 40, 26, 38]);
  today = M.addDays(starts[starts.length - 1], 100);
  a = M.analyze(mk(starts), today);
  assert.ok(a.spread > M.NORMAL_SPREAD);
  assert.ok(M.flags(a, mk(starts), today).some((f) => f.id === 'absent'));
  assert.equal(M.ABSENT_DAYS_IRREG, undefined);
});
