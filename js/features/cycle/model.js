// Zyklus: reine Rechnung ohne Speicher und DOM (testbar mit node --test).
// Herkunft: Rechenteil von zyklus.js im Rezeptbuch (Copyright (c) 2026 JuliaKelp, MIT), zerlegt und angepasst an
// „Research – Cycle-Aware Training“ (Drive, 2026-10-22): nur die Periode gilt als bekannt; Eisprung und fruchtbare Tage
// sind ein breites Fenster aus kürzestem und längstem Zyklus; keine Phasen-Hinweise bei hormoneller Verhütung.
//
// Modell und Schwächen (auch in Drive → Decisions 0.2.6):
// - Periodenbeginn = erster Tag mit Blutung ab „Leicht“, davor 2 Tage ohne. Schmierblutung zählt nicht als Beginn.
// - Zykluslänge = Abstand zweier Periodenbeginne; nur 15–60 Tage, die letzten 6 (Lücken in alten Daten fallen raus).
// - Ohne eigene Zyklen: 29 Tage (Mittel 29,3 in 612.613 Zyklen mit Eisprung, Bull 2019; Volltext geprüft 2026-10-29). Gilt für Erwachsene mit regelmäßigem
//   Zyklus; für Jugendliche, Wechseljahre, PCOS, nach Geburt kaum aussagekräftig.
// - Eisprung = Zykluslänge minus Lutealphase. Lutealphase 12,4 Tage im Mittel, SD 2,0 (Fehring 2006; Bull 2019: 7–17).
//   SD 2,0 aus Fehring 2006 noch ungeprüft (nur Abstract gelesen). Wir nehmen 11–14 Tage (etwa ± 1 SD) und rechnen mit kürzestem und längstem eigenen Zyklus. Ein Zyklus ohne
//   Eisprung (anovulatorisch) ist für die App nicht erkennbar.
// - Fruchtbares Fenster = 5 Tage vor bis zum Eisprungtag (Wilcox 1995, Abstract geprüft), über die ganze Eisprung-Spanne → breit.
// - Positiver LH-Test im laufenden Zyklus: Eisprung etwa am Tag danach (Mihm 2011: ~38 h nach Beginn des Anstiegs),
//   Fenster dann 5 Tage davor bis 1 Tag danach. Die 38 h stehen nicht im Abstract (ungeprüft). Ein Test kann
//   falsch positiv sein.
// - Keine Verhütung: Das Fenster ist eine Schätzung, und Spermien können bis zu 5 Tage überleben.

export const DEFAULT_LEN = 29;
export const DEFAULT_BLEED = 5;
export const LUTEAL_LO = 11;
export const LUTEAL_HI = 14;
export const PRE_OVU = 5;
export const AHEAD = 6;
export const MAX_CYCLES = 6;
// FIGO 2018 (Munro et al.): normal 24–38 Tage, Unterschied bis 7–9 Tage (je nach Alter), Blutung bis 8 Tage.
export const NORMAL_MIN = 24;
export const NORMAL_MAX = 38;
export const NORMAL_SPREAD = 9;
export const NORMAL_BLEED = 8;
// Ausbleiben: 3 Monate bei vorher regelmäßigem, 6 Monate bei unregelmäßigem Zyklus (Klein & Poth 2013, AFP; per
// PubMed geprüft 2026-10-29, Abstract). Grenzen 24/38/9/8 aus FIGO 2018, geprüft nur über eine Sekundärquelle (MSD).
export const ABSENT_DAYS = 90;
export const ABSENT_DAYS_IRREG = 180;

export const METHODS = [
  ['none', 'Keine oder Kondom'],
  ['pille', 'Pille (Kombination)'],
  ['ring', 'Ring oder Pflaster'],
  ['mini', 'Minipille'],
  ['gestagen', 'Spritze, Implantat oder Hormonspirale'],
  ['kupfer', 'Kupferspirale oder -kette']
];
const KIND = { pille: 'kombi', ring: 'kombi', mini: 'gestagen', gestagen: 'gestagen' };
/** Art der Methode: 'kombi' (Östrogen + Gestagen: Blutung ist eine Entzugsblutung, keine Phasen), 'gestagen'
 *  (Eisprung teils erhalten, Blutung oft unregelmäßig: Kalender unzuverlässig) oder null. */
export const methodKind = (method) => KIND[method] || null;
/** Tägliche Pille? Dann fragt „Eintragen“ nach der Pille. */
export const dailyPill = (method) => method === 'pille' || method === 'mini';
export const PHASES = [['normal', 'Normaler Zyklus'], ['schwanger', 'Schwanger'], ['stillen', 'Stillzeit'], ['wechsel', 'Wechseljahre']];

// ---------- Datum (lokal, JJJJ-MM-TT, Mittag als Anker gegen die Zeitumstellung) ----------
const p2 = (n) => String(n).padStart(2, '0');
export const keyOf = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const dateOf = (iso) => new Date(iso + 'T12:00:00');
export function addDays(iso, n) { const d = dateOf(iso); d.setDate(d.getDate() + n); return keyOf(d); }
export const diff = (a, b) => Math.round((dateOf(b) - dateOf(a)) / 86400000);
export const isIso = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');

// ---------- Einträge ----------
export const isBleed = (e) => !!e && e.bleed >= 2;
export const isSpot = (e) => !!e && e.bleed === 1;
export const hasEntry = (e) => !!e && Object.keys(e).some((k) => k !== 'imp');

/** Hormonelle Methode? Dann keine fruchtbaren Tage. */
export const hormonal = (method) => !!methodKind(method);
/** Vorhersagen pausiert (Schwangerschaft, Stillzeit, Wechseljahre). */
export const paused = (phase) => !!phase && phase !== 'normal';

/** Setzt ein Feld eines Tages und gibt einen neuen days-Plan zurück (leerer Wert löscht, leerer Tag verschwindet). */
export function withField(days, iso, f, v) {
  const out = { ...days };
  const e = { ...(out[iso] || {}) };
  if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) delete e[f]; else e[f] = v;
  delete e.imp;
  if (Object.keys(e).length) out[iso] = e; else delete out[iso];
  return out;
}

const median = (ls) => {
  const s = [...ls].sort((x, y) => x - y);
  if (!s.length) return null;
  return s.length % 2 ? s[(s.length - 1) / 2] : Math.round((s[s.length / 2 - 1] + s[s.length / 2]) / 2);
};

/** Periodenbeginne bis heute (aufsteigend). */
export function periodStarts(days, today) {
  return Object.keys(days).filter((k) => k <= today).sort()
    .filter((k) => isBleed(days[k]) && !isBleed(days[addDays(k, -1)]) && !isBleed(days[addDays(k, -2)]));
}

/** Blutungstage ab einem Beginn (ab „Leicht“, ohne Lücke). */
export function bleedRun(days, start) {
  let n = 0;
  while (isBleed(days[addDays(start, n)]) && n < 40) n++;
  return n;
}

/** Eisprung-Spanne (Zyklustage) aus kürzestem und längstem Zyklus ohne LH-Test. */
export const estOvu = ({ min, max }) => ({ lo: Math.max(PRE_OVU + 1, min - LUTEAL_HI), hi: Math.max(PRE_OVU + 1, max - LUTEAL_LO) });
/** Geschätztes fruchtbares Fenster (Zyklustage): 5 Tage vor der frühesten bis zur spätesten Eisprung-Spanne. */
export function estWindow(a) { const o = estOvu(a); return { lo: Math.max(1, o.lo - PRE_OVU), hi: o.hi }; }

/**
 * Auswertung bis heute.
 * { starts, lengths, usable, own, avg, median, min, max, spread, bleedAvg, bleedLens, last, dayNo,
 *   ovu: { lo, hi, sure }, fert: { lo, hi } | null }  (ovu/fert als Zyklustage des laufenden Zyklus)
 */
export function analyze(days, today) {
  const starts = periodStarts(days, today);
  const lengths = [];
  for (let i = 1; i < starts.length; i++) lengths.push(diff(starts[i - 1], starts[i]));
  const usable = lengths.filter((n) => n >= 15 && n <= 60).slice(-MAX_CYCLES);
  const own = usable.length > 0;
  const avg = own ? Math.round(usable.reduce((s, n) => s + n, 0) / usable.length) : DEFAULT_LEN;
  const med = own ? median(usable) : DEFAULT_LEN;
  const min = own ? Math.min(...usable) : DEFAULT_LEN;
  const max = own ? Math.max(...usable) : DEFAULT_LEN;
  // Importierte Einzeltage (nur Beginn bekannt) zählen nicht für die Blutungsdauer
  const bleedLens = starts.filter((s) => !(days[s].imp && bleedRun(days, s) === 1)).map((s) => bleedRun(days, s));
  const lastLens = bleedLens.slice(-MAX_CYCLES);
  const bleedAvg = lastLens.length ? Math.round(lastLens.reduce((s, n) => s + n, 0) / lastLens.length) : DEFAULT_BLEED;
  const last = starts[starts.length - 1] || null;
  const dayNo = last ? diff(last, today) + 1 : null;
  let ovu = null;
  if (last) {
    const lh = Object.keys(days).filter((k) => k >= last && k <= today && days[k].lh === 'Positiv').sort()[0];
    if (lh) { const d = diff(last, lh) + 2; ovu = { lo: d, hi: d, sure: true }; }
    else ovu = { ...estOvu({ min, max }), sure: false };
  }
  const fert = ovu ? (ovu.sure ? { lo: Math.max(1, ovu.lo - PRE_OVU), hi: ovu.hi + 1 } : estWindow({ min, max })) : null;
  return { starts, lengths, usable, own, avg, median: med, min, max, spread: max - min, bleedAvg, bleedLens, last, dayNo, ovu, fert };
}

/** Nächste Periode: Spanne aus kürzestem/längstem Zyklus, Mitte aus dem Median. Tage relativ zu heute. */
export function nextPeriod(a, today) {
  if (!a.last) return null;
  const lo = addDays(a.last, a.min), hi = addDays(a.last, a.max), mid = addDays(a.last, a.median);
  return { lo, hi, mid, inLo: diff(today, lo), inHi: diff(today, hi), late: diff(today, hi) < 0 ? -diff(today, hi) : 0 };
}

const tage = (n) => `${n} ${n === 1 ? 'Tag' : 'Tagen'}`;
/** Kurztext für Karte und Kalender. */
export function nextText(a, today, { phase } = {}) {
  if (paused(phase)) return 'Vorhersagen pausiert';
  const n = nextPeriod(a, today);
  if (!n) return '';
  if (n.late) return `Periode wäre seit ${tage(n.late)} fällig`;
  if (n.inLo <= 0) return n.inHi === 0 ? 'Periode heute erwartet' : `Periode ab heute bis in ${tage(n.inHi)}`;
  if (n.inLo === n.inHi) return `Periode in ${tage(n.inLo)}`;
  return `Periode in ${n.inLo} bis ${n.inHi} Tagen`;
}

/** Die nächsten Perioden (Mitte und Spanne, die mit jedem Monat breiter wird). */
export function upcoming(a, today, count = AHEAD) {
  if (!a.last) return [];
  const rows = [];
  for (let k = 1; rows.length < count && k <= count + 3; k++) {
    const hi = addDays(a.last, k * a.max);
    if (hi < today) continue;
    rows.push({ k, mid: addDays(a.last, k * a.median), lo: addDays(a.last, k * a.min), hi });
  }
  return rows;
}

/**
 * Status eines Kalendertags: { bleed, spot, entry, pred, fert, today }.
 * pred: Periode erwartet (Zukunft, nach Median und mittlerer Blutungsdauer); fert: Fenster im laufenden und den
 * nächsten Zyklen (nur Zukunft und laufender Zyklus, nie rückwirkend).
 */
export function dayStatus(a, days, iso, today, { showFert = true, phase } = {}) {
  const e = days[iso];
  const past = iso <= today;
  const out = { bleed: past && isBleed(e), spot: past && isSpot(e), entry: past && hasEntry(e), pred: false, fert: false, today: iso === today };
  if (!a.last || paused(phase) || iso < a.last) return out;
  const n0 = diff(a.last, iso) + 1;
  for (let k = 0; k <= AHEAD; k++) {
    const n = n0 - k * a.median;
    if (n < 1) break;
    if (k > 0 && !past && n <= a.bleedAvg) out.pred = true;
    if (showFert && a.fert) {
      const w = k === 0 ? a.fert : estWindow(a);
      if (n >= w.lo && n <= w.hi) out.fert = true;
    }
  }
  if (out.bleed || out.pred) out.fert = false;
  return out;
}

// ---------- Hinweise zum Ansprechen (neutral, keine Diagnose) ----------
// Schwellen aus FIGO 2018 (Länge, Schwankung, Blutungsdauer) und Klein & Poth 2013 (Ausbleiben).
// Nur mit natürlichem Zyklus (ohne hormonelle Methode, Phase „normal“). Schwäche: Daten sind selbst eingetragen.
export function flags(a, days, today, { method, phase } = {}) {
  if (paused(phase) || hormonal(method) || !a.last) return [];
  const out = [];
  const since = diff(a.last, today);
  const limit = a.usable.length >= 3 && a.spread > NORMAL_SPREAD ? ABSENT_DAYS_IRREG : ABSENT_DAYS;
  if (since > limit) out.push({ id: 'absent', text: `Seit ${since} Tagen keine Periode eingetragen.` });
  const recent = a.usable.slice(-3);
  if (recent.length >= 3 && recent.every((n) => n > NORMAL_MAX)) out.push({ id: 'long', text: `Die letzten 3 Zyklen waren länger als ${NORMAL_MAX} Tage.` });
  if (recent.length >= 3 && recent.every((n) => n < NORMAL_MIN)) out.push({ id: 'short', text: `Die letzten 3 Zyklen waren kürzer als ${NORMAL_MIN} Tage.` });
  if (a.usable.length >= 3 && a.spread > NORMAL_SPREAD) out.push({ id: 'spread', text: `Deine Zyklen schwanken um ${a.spread} Tage.` });
  if (a.bleedLens.slice(-2).some((n) => n > NORMAL_BLEED)) out.push({ id: 'bleed', text: `Eine Periode dauerte länger als ${NORMAL_BLEED} Tage.` });
  // Blutung zwischen den Perioden: Tag mit Blutung oder Schmier, der nicht zu einem Periodenlauf (± 2 Tage) gehört
  const runs = a.starts.map((s) => [addDays(s, -2), addDays(s, bleedRun(days, s) + 1)]);
  const from = addDays(today, -60);
  const between = Object.keys(days).filter((k) => k >= from && k <= today && (isBleed(days[k]) || isSpot(days[k])) && !days[k].imp)
    .filter((k) => !runs.some(([lo, hi]) => k >= lo && k <= hi)).length;
  if (between >= 2) out.push({ id: 'between', text: 'Blutung zwischen den Perioden an mehreren Tagen.' });
  // Starke Schmerzen in zwei Zyklen hintereinander (ACOG: Schmerz, der den Alltag einschränkt, abklären)
  const strongIn = (lo, hi) => Object.keys(days).some((k) => k >= lo && k < hi && days[k].pain === 'Stark');
  const s = a.starts;
  if (s.length >= 2 && strongIn(s[s.length - 2], s[s.length - 1]) && strongIn(s[s.length - 1], addDays(today, 1))) {
    out.push({ id: 'pain', text: 'Starke Schmerzen in zwei Zyklen hintereinander.' });
  }
  return out;
}

// ---------- Erinnerungen ----------
const toMin = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
/** Hinweise für die Karte auf „Heute“ (ohne Server gibt es keine echten Mitteilungen). */
export function reminders(a, entry, today, nowMin, { rem = {}, method, phase, track = {} } = {}) {
  const out = [];
  const e = entry || {};
  if (rem.period && a.last && !paused(phase) && methodKind(method) !== 'kombi') {
    const n = nextPeriod(a, today);
    if (n && !n.late && n.inLo >= 0 && n.inLo <= 2) out.push(n.inLo === 0 ? 'Deine Periode kann heute kommen.' : `Deine Periode kann in ${tage(n.inLo)} kommen.`);
  }
  if (rem.pill && dailyPill(method) && track.pill !== false && !e.pill && nowMin >= toMin(rem.pillTime)) out.push('Pille heute schon genommen?');
  if (rem.temp && track.temp && !e.temp && nowMin >= toMin(rem.tempTime) && nowMin < 12 * 60) out.push('Temperatur heute noch nicht eingetragen.');
  return out;
}

/** Kalenderdatei mit Weckern; Titel neutral („The Tracker“), damit der Sperrbildschirm nichts verrät. */
export function icsFile(a, today, { rem = {}, method, phase, track = {} } = {}, stamp = new Date()) {
  const d8 = (k) => k.replace(/-/g, '');
  const st = stamp.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const ev = [];
  const add = (uid, lines) => ev.push(['BEGIN:VEVENT', `UID:${uid}@the-tracker`, `DTSTAMP:${st}`, ...lines, 'END:VEVENT'].join('\r\n'));
  const alarm = (tr) => ['BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:The Tracker', `TRIGGER:${tr}`, 'END:VALARM'].join('\r\n');
  const t = (hhmm) => hhmm.replace(':', '') + '00';
  if (rem.pill && dailyPill(method)) add('pille', [`DTSTART:${d8(today)}T${t(rem.pillTime)}`, 'DURATION:PT5M', 'RRULE:FREQ=DAILY', 'SUMMARY:The Tracker', alarm('PT0M')]);
  if (rem.temp && track.temp) add('temp', [`DTSTART:${d8(addDays(today, 1))}T${t(rem.tempTime)}`, 'DURATION:PT5M', 'RRULE:FREQ=DAILY', 'SUMMARY:The Tracker', alarm('PT0M')]);
  if (rem.period && a.last && !paused(phase) && methodKind(method) !== 'kombi') {
    const start = addDays(a.last, a.min);
    if (start >= today) add('periode-' + d8(start), [`DTSTART;VALUE=DATE:${d8(start)}`, `DTEND;VALUE=DATE:${d8(addDays(start, 1))}`, 'SUMMARY:The Tracker', alarm('-P2D')]);
  }
  if (!ev.length) return null;
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//The Tracker//Zyklus//DE', 'CALSCALE:GREGORIAN', ...ev, 'END:VCALENDAR', ''].join('\r\n');
}

// ---------- Bericht ----------
/** Zeilen je Zyklus (neueste zuerst, bis 12): Länge, Blutung, stark, Schmier, Schmerztage, Beschwerden, Medikamente. */
export function cycleRows(a, days, today, count = 12) {
  return a.starts.slice(-count).map((start, i, arr) => {
    const next = arr[i + 1] || null;
    const end = next ? addDays(next, -1) : today;
    let bleed = 0, strong = 0, spot = 0, pain = 0;
    const body = {}, meds = {};
    for (let k = start; k <= end; k = addDays(k, 1)) {
      const e = days[k]; if (!e) continue;
      if (e.bleed >= 2) bleed++;
      if (e.bleed === 4) strong++;
      if (e.bleed === 1) spot++;
      if (e.pain && e.pain !== 'Keine') pain++;
      (e.body || []).forEach((b) => { body[b] = (body[b] || 0) + 1; });
      (e.meds || []).forEach((m) => { meds[m] = (meds[m] || 0) + 1; });
    }
    return { start, len: next ? diff(start, next) : null, bleed, strong, spot, pain, body, meds, imp: !!days[start].imp };
  }).reverse();
}

const de = (k) => dateOf(k).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
/** Bericht als Text (ohne Namen), zum Teilen mit der Frauenärztin. */
export function reportText(a, days, today, { method, flagList = [] } = {}) {
  const lines = [`Zyklusbericht vom ${de(today)} (eigene Einträge, The Tracker)`];
  if (a.own) lines.push(`Zykluslänge: Median ${a.median} Tage, ${a.min} bis ${a.max} Tage (${a.usable.length} Zyklen). Blutung im Mittel ${a.bleedAvg} Tage.`);
  const m = METHODS.find(([k]) => k === method);
  if (m) lines.push(`Verhütung: ${m[1]}`);
  if (a.last) lines.push(`Letzte Periode ab ${de(a.last)}, heute Zyklustag ${a.dayNo}.`);
  const rows = cycleRows(a, days, today);
  if (rows.length) {
    lines.push('', 'Beginn | Länge | Blutung | davon stark | Schmier | Schmerztage');
    rows.forEach((r) => lines.push(`${de(r.start)} | ${r.len ? r.len + ' Tage' : 'läuft'} | ${r.imp ? '–' : r.bleed} | ${r.strong} | ${r.spot} | ${r.pain}`));
  }
  const sum = (key) => { const s = {}; rows.forEach((r) => Object.entries(r[key]).forEach(([b, n]) => { s[b] = (s[b] || 0) + n; })); return Object.entries(s).sort((x, y) => y[1] - x[1]); };
  const body = sum('body').slice(0, 10), meds = sum('meds');
  if (body.length) lines.push('', 'Beschwerden (Tage): ' + body.map(([b, n]) => `${b} ${n}`).join(', '));
  if (meds.length) lines.push('Medikamente (Tage): ' + meds.map(([b, n]) => `${b} ${n}`).join(', '));
  if (flagList.length) lines.push('', 'Auffällig in den Einträgen: ' + flagList.map((f) => f.text).join(' '));
  return lines.join('\n');
}

// ---------- Import ----------
/** Daten aus Kalenderdatei (.ics) oder Text (eine Zeile pro Periode; „03.09.2026“, „2026-09-03“, „3/9/2026“, Spannen). */
export function parseDates(text) {
  const out = new Set();
  const ymd = (y, m, d) => { const dt = new Date(+y, +m - 1, +d, 12); return dt.getFullYear() === +y && dt.getMonth() === +m - 1 && dt.getDate() === +d ? keyOf(dt) : null; };
  const src = String(text || '');
  if (/BEGIN:VEVENT/.test(src)) {
    const unfolded = src.replace(/\r?\n[ \t]/g, '');
    for (const ev of unfolded.split('BEGIN:VEVENT').slice(1)) {
      const s = /DTSTART[^:\n]*:(\d{4})(\d{2})(\d{2})/.exec(ev);
      if (!s) continue;
      const start = ymd(s[1], s[2], s[3]);
      if (!start) continue;
      const e = /DTEND[^:\n]*:(\d{4})(\d{2})(\d{2})/.exec(ev);
      const dateOnly = /DTSTART;VALUE=DATE:/.test(ev) || /DTSTART[^:\n]*:\d{8}\s*$/m.test(ev);
      let end = e ? ymd(e[1], e[2], e[3]) : start;
      if (end && dateOnly && end > start) end = addDays(end, -1); // Ganztägig: Ende ist der Tag danach
      let n = 0;
      for (let k = start; k <= (end || start) && n < 14; k = addDays(k, 1), n++) out.add(k);
    }
    return [...out].sort();
  }
  for (const line of src.split(/\r?\n/)) {
    const found = [];
    line.replace(/(\d{4})-(\d{1,2})-(\d{1,2})|(\d{1,2})\.(\d{1,2})\.(\d{2,4})|(\d{1,2})\/(\d{1,2})\/(\d{4})/g, (m0, y1, m1, d1, d2, m2, y2, d3, m3, y3) => {
      const k = y1 ? ymd(y1, m1, d1) : d2 ? ymd(y2.length === 2 ? '20' + y2 : y2, m2, d2) : ymd(y3, m3, d3);
      if (k) found.push(k);
      return m0;
    });
    if (found.length >= 2 && found[1] > found[0] && diff(found[0], found[1]) < 14) { for (let k = found[0]; k <= found[1]; k = addDays(k, 1)) out.add(k); }
    else if (found.length) out.add(found[0]);
  }
  return [...out].sort();
}

/** Übernimmt Blutungstage (Stärke „Mittel“, markiert als importiert); Zukunft und vorhandene Blutung bleiben. */
export function importDays(days, keys, today) {
  const out = { ...days };
  let n = 0;
  for (const k of keys) {
    if (!isIso(k) || k > today || isBleed(out[k])) continue;
    out[k] = { ...(out[k] || {}), bleed: 3, imp: 1 };
    n++;
  }
  return { days: out, added: n };
}
