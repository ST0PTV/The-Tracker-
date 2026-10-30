// Zyklus-Seiten: Kalender, Eintragen (Tag), Verlauf. Aufbau nach viewKalender, viewTag und viewVerlauf in zyklus.js im
// Rezeptbuch (Copyright (c) 2026 JuliaKelp, MIT), umgebaut auf h() und den Stil „Apple nativ“.
// Kalender in zwei Stilen (Nutzerwunsch 2026-10-29): 'circles' (K1, Standard) und 'band' (K2).
import { h } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { pageHead, toast } from '../../core/ui.js';
import { isoDate, num } from '../../core/format.js';
import { qp } from '../recipes/parts.js';
import * as M from './model.js';
import { cycleSettings, cycleAnalysis, cycleDays, dayEntry, setDayField, addMed, removeMed, showFertile } from './cycle.js';

export const BLEED = [[1, 'Schmier'], [2, 'Leicht'], [3, 'Mittel'], [4, 'Stark']];
const BODY = ['Brustspannen', 'Unterleibskrämpfe', 'Rückenschmerzen', 'Kopfweh', 'Migräne', 'Ziehen beim Eisprung', 'Blähbauch', 'Übelkeit', 'Durchfall', 'Verstopfung', 'Wassereinlagerungen', 'Unreine Haut', 'Heißhunger', 'Schlecht geschlafen', 'Schwindel', 'Hitzewallungen'];
const MOOD = ['Gut drauf', 'Ruhig', 'Gereizt', 'Traurig', 'Ängstlich', 'Stimmungsschwankungen', 'Müde', 'Viel Energie', 'Wenig Lust', 'Viel Lust'];
// Auswahlfelder: [Feld, Überschrift, Optionen]
const PICKS = {
  pain: [['pain', '', ['Keine', 'Leicht', 'Mittel', 'Stark']]],
  cm: [['cm', '', ['Trocken', 'Nichts', 'Feucht', 'Cremig', 'Glasig, spinnbar']]],
  cervix: [['cxPos', 'Lage', ['Tief', 'Mittel', 'Hoch']], ['cxFirm', 'Festigkeit', ['Fest', 'Weich']], ['cxOpen', 'Öffnung', ['Geschlossen', 'Etwas offen', 'Offen']]],
  sex: [['sex', '', ['Solo', 'Mit Kondom', 'Ohne Kondom']]],
  pill: [['pill', 'Pille heute', ['Genommen', 'Vergessen', 'Pause']]],
  tests: [['lh', 'Eisprungtest (LH)', ['Negativ', 'Positiv']], ['preg', 'Schwangerschaftstest', ['Negativ', 'Positiv']]]
};
const TITLE = { pain: 'Schmerzstärke', cm: 'Zervixschleim', cervix: 'Muttermund', sex: 'Sex', pill: 'Pille', tests: 'Tests' };
const HINT = { cervix: 'Am besten immer zur gleichen Tageszeit tasten.', tests: 'Nur antippen, wenn du einen Test gemacht hast.' };

const back = (href, label) => h('a', { class: 'back', href }, icon('chevron', { size: 16, cls: 'flip' }), label);
const deDate = (iso, o = { day: 'numeric', month: 'long' }) => M.dateOf(iso).toLocaleDateString('de-DE', o);

const SUB = [['/zyklus', 'Kalender'], ['/zyklus/verlauf', 'Verlauf'], ['/zyklus/wissen', 'Wissen']];
export function cycleHead(active) {
  return [
    h('div', { class: 'cy-top' }, back('#/', 'Heute'), h('a', { class: 'link', href: '#/ich/zyklus' }, 'Einstellungen')),
    pageHead('Zyklus'),
    h('nav', { class: 'seg rz-sub', 'aria-label': 'Zyklus-Bereiche' }, ...SUB.map(([p, l]) => h('a', { href: `#${p}`, 'aria-current': p === active ? 'page' : false }, l)))
  ];
}

// ---------- Kalender ----------
let month = null; // 'JJJJ-MM' (nur für diese Sitzung)

function calendarCard(a, rerender) {
  const today = isoDate();
  const c = cycleSettings();
  const days = cycleDays();
  const m = month || today.slice(0, 7);
  const [y, mo] = m.split('-').map(Number);
  const first = new Date(y, mo - 1, 1, 12);
  const pad = (first.getDay() + 6) % 7;
  const dim = new Date(y, mo, 0).getDate();
  const fertOn = showFertile();
  const band = c.cal === 'band';
  const cells = [];
  for (let i = 0; i < pad; i++) cells.push(h('span', { class: 'cy-d pad' }));
  for (let d = 1; d <= dim; d++) {
    const iso = M.keyOf(new Date(y, mo - 1, d, 12));
    const s = M.dayStatus(a, days, iso, today, { showFert: fertOn, phase: c.phase });
    const col = (pad + d - 1) % 7;
    const prevF = d > 1 && col > 0 && M.dayStatus(a, days, M.addDays(iso, -1), today, { showFert: fertOn, phase: c.phase }).fert;
    const nextF = d < dim && col < 6 && M.dayStatus(a, days, M.addDays(iso, 1), today, { showFert: fertOn, phase: c.phase }).fert;
    const cls = ['cy-d', s.bleed && 'b', s.spot && 's', s.pred && 'p', s.fert && 'f', s.fert && !prevF && 'fs', s.fert && !nextF && 'fe', s.today && 'now', s.entry && 'e', iso > today && 'fut'].filter(Boolean).join(' ');
    const label = `${deDate(iso)}${s.bleed ? ', Blutung' : s.spot ? ', Schmierblutung' : ''}${s.pred ? ', Periode erwartet' : ''}${s.fert ? ', fruchtbar (Schätzung)' : ''}${s.entry ? ', Eintrag' : ''}${s.today ? ', heute' : ''}`;
    const inner = h('span', {}, String(d));
    cells.push(iso > today ? h('span', { class: cls, 'aria-label': label }, inner) : h('a', { class: cls, href: `#/zyklus/tag?d=${iso}`, 'aria-label': label }, inner));
  }
  const shift = (n) => { const dt = new Date(y, mo - 1 + n, 1, 12); month = M.keyOf(dt).slice(0, 7); rerender(); };
  return h('section', { class: `card cy-cal ${band ? 'band' : 'circles'}` },
    h('div', { class: 'cy-month' },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Vormonat', onclick: () => shift(-1) }, icon('chevron', { size: 18, cls: 'flip' })),
      h('h2', {}, first.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Nächster Monat', onclick: () => shift(1) }, icon('chevron', { size: 18 }))),
    h('div', { class: 'cy-grid cy-wd' }, ...['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((w) => h('span', {}, w))),
    h('div', { class: 'cy-grid' }, ...cells),
    h('div', { class: 'cy-leg' },
      h('span', {}, h('i', { class: 'b' }), 'Periode'), band ? null : h('span', {}, h('i', { class: 's' }), 'Schmier'),
      h('span', {}, h('i', { class: 'p' }), 'erwartet'),
      fertOn ? h('span', {}, h('i', { class: 'f' }), 'fruchtbar (Schätzung)') : null,
      h('span', {}, h('i', { class: 'e' }), 'Eintrag')));
}

function upcomingCard(a) {
  const c = cycleSettings();
  if (!a.last || M.paused(c.phase) || M.methodKind(c.method) === 'kombi') return null;
  const rows = M.upcoming(a, isoDate());
  if (!rows.length) return null;
  const dm = (k) => deDate(k, { day: 'numeric', month: 'short' });
  return [h('h3', { class: 'sec' }, 'Nächste Perioden (Schätzung)'),
    h('section', { class: 'card list cy-up' }, ...rows.map((r) => h('div', { class: 'cy-up-row' },
      h('b', {}, deDate(r.mid, { weekday: 'short', day: 'numeric', month: 'short' })),
      r.lo !== r.hi ? h('small', {}, `zwischen ${dm(r.lo)} und ${dm(r.hi)}`) : null))),
    h('p', { class: 'small muted page-note' }, a.own
      ? `Mitte aus deinem typischen Zyklus (${a.median} Tage), Spanne aus deinem kürzesten und längsten (${a.min}–${a.max} Tage). Sie wird mit jedem Monat breiter.`
      : 'Noch geschätzt mit 29 Tagen. Ab der zweiten eingetragenen Periode rechnet die App mit deinen eigenen Zyklen.')];
}

/** Hinweise zum Ansprechen bei der Frauenärztin (neutral, keine Diagnose). */
export function flagsCard(a) {
  const c = cycleSettings();
  const list = M.flags(a, cycleDays(), isoDate(), { method: c.method, phase: c.phase });
  if (!list.length) return null;
  return h('section', { class: 'card cy-flags' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Zum Ansprechen'), icon('info', { size: 18 })),
    h('ul', {}, ...list.map((f) => h('li', {}, f.text))),
    h('p', { class: 'small muted' }, 'Das kann viele harmlose Gründe haben (Stress, Reisen, Krankheit, Gewichtsänderung, viel Training). Wenn es öfter vorkommt oder dich beunruhigt, sprich es bei deiner Frauenärztin an. Rasch abklären: Periode ausgeblieben und dazu ungewöhnliche Blutung mit Bauchschmerzen.'),
    h('a', { class: 'link small', href: '#/zyklus/bericht' }, 'Bericht für die Ärztin'));
}

export function calendarView(rerender) {
  const a = cycleAnalysis();
  const c = cycleSettings();
  const today = isoDate();
  const kind = M.methodKind(c.method);
  return h('div', { class: 'cy' },
    ...cycleHead('/zyklus'),
    a.last ? h('p', { class: 'cy-sub' }, h('b', {}, `Zyklustag ${a.dayNo}`), ` · ${M.nextText(a, today, { phase: c.phase })}`) : h('p', { class: 'small muted' }, 'Tipp auf den ersten Tag deiner letzten Periode und trag die Blutung ein.'),
    kind === 'kombi' ? h('p', { class: 'hint small' }, 'Mit Pille, Ring oder Pflaster ist die Blutung eine Entzugsblutung. Fruchtbare Tage und Phasen zeigt die App deshalb nicht.') : null,
    kind === 'gestagen' ? h('p', { class: 'hint small' }, 'Mit Minipille, Spritze, Implantat oder Hormonspirale ist der Zyklus oft unregelmäßig. Vorhersagen sind unzuverlässig, fruchtbare Tage blendet die App aus.') : null,
    calendarCard(a, rerender),
    h('a', { class: 'btn primary block', href: `#/zyklus/tag?d=${today}` }, 'Heute eintragen'),
    flagsCard(a),
    ...(upcomingCard(a) || []),
    showFertile() ? h('p', { class: 'small muted page-note' }, 'Das fruchtbare Fenster ist eine breite Schätzung aus deinen Zykluslängen. Es ist keine Verhütung: Der Eisprung kann sich um mehrere Tage verschieben oder ausbleiben.') : null);
}

// ---------- Eintragen ----------
function chip(on, label, onclick) {
  return h('button', { class: `chip${on ? ' on' : ''}`, type: 'button', 'aria-pressed': on ? 'true' : 'false', onclick }, label);
}

export function dayView(rerender) {
  const today = isoDate();
  let iso = qp('d');
  if (!M.isIso(iso) || iso > today) iso = today;
  const c = cycleSettings();
  const tr = c.track;
  const e = dayEntry(iso);
  const set = (f, v) => { try { setDayField(iso, f, v); } catch (err) { toast(err.message, { error: true }); } rerender(); };
  const toggle = (f, v) => set(f, e[f] === v ? null : v);
  const multi = (f, v) => { const l = [...(e[f] || [])]; const i = l.indexOf(v); if (i >= 0) l.splice(i, 1); else l.push(v); set(f, l); };
  const group = (g) => {
    if (!tr[g]) return null;
    if (g === 'pill' && !M.dailyPill(c.method)) return null;
    return h('section', { class: 'card cy-group' }, h('h3', {}, TITLE[g]), HINT[g] ? h('p', { class: 'small muted' }, HINT[g]) : null,
      ...PICKS[g].flatMap(([f, label, opts]) => [label ? h('span', { class: 'label' }, label) : null,
        h('div', { class: 'chips' }, ...opts.map((o) => chip(e[f] === o, o, () => toggle(f, o))))]));
  };
  const multiCard = (f, title, list) => h('section', { class: 'card cy-group' }, h('h3', {}, title), h('div', { class: 'chips' }, ...list.map((o) => chip((e[f] || []).includes(o), o, () => multi(f, o)))));

  const temp = h('input', { class: 'input', type: 'text', inputmode: 'decimal', placeholder: 'z. B. 36,45', value: e.temp ? e.temp.toFixed(2).replace('.', ',') : '', 'aria-label': 'Temperatur in Grad Celsius' });
  temp.addEventListener('change', () => {
    const v = num(temp.value);
    if (temp.value.trim() && !(v >= 34 && v <= 42)) { toast('Bitte eine Temperatur zwischen 34 und 42 °C eingeben.', { error: true }); return; }
    set('temp', v ? Math.round(v * 100) / 100 : null);
  });
  const off = h('input', { type: 'checkbox', 'aria-label': 'Störung' }); off.checked = !!e.tempOff;
  off.addEventListener('change', () => set('tempOff', off.checked || null));

  const medIn = h('input', { class: 'input', type: 'text', maxlength: 40, placeholder: 'Eigenes Medikament', 'aria-label': 'Eigenes Medikament' });
  const addOwnMed = () => { const v = addMed(medIn.value); if (v && !(e.meds || []).includes(v)) set('meds', [...(e.meds || []), v]); };
  const meds = ['Schmerzmittel', ...c.medList]; (e.meds || []).forEach((m) => { if (!meds.includes(m)) meds.push(m); });

  const note = h('textarea', { class: 'input', rows: 3, maxlength: 1000, 'aria-label': 'Notiz' }); note.value = e.note || '';
  note.addEventListener('change', () => set('note', note.value.trim() ? note.value.slice(0, 1000) : null));

  const prev = M.addDays(iso, -1), next = M.addDays(iso, 1);
  return h('div', { class: 'cy cy-entry' },
    back('#/zyklus', 'Kalender'),
    h('div', { class: 'cy-month' },
      h('a', { class: 'icon-btn', href: `#/zyklus/tag?d=${prev}`, 'aria-label': 'Tag davor' }, icon('chevron', { size: 18, cls: 'flip' })),
      h('h1', {}, iso === today ? 'Heute' : deDate(iso, { weekday: 'short', day: 'numeric', month: 'long' })),
      next <= today ? h('a', { class: 'icon-btn', href: `#/zyklus/tag?d=${next}`, 'aria-label': 'Tag danach' }, icon('chevron', { size: 18 })) : h('span', { class: 'icon-btn ghost', 'aria-hidden': 'true' })),
    h('section', { class: 'card cy-group' }, h('h3', {}, 'Blutung'),
      h('div', { class: 'chips cy-bleed' }, ...BLEED.map(([v, l]) => chip(e.bleed === v, l, () => toggle('bleed', v))))),
    tr.temp ? h('section', { class: 'card cy-group' }, h('h3', {}, 'Basaltemperatur'),
      h('div', { class: 'cy-temp' }, temp, h('span', {}, '°C')),
      h('label', { class: 'check-row' }, off, h('span', { class: 'small' }, 'Störung (schlecht geschlafen, krank, Alkohol, andere Uhrzeit)'))) : null,
    ...['pain', 'cm', 'cervix', 'sex', 'pill'].map(group),
    tr.body ? multiCard('body', 'Körper', BODY) : null,
    tr.meds ? h('section', { class: 'card cy-group' }, h('h3', {}, 'Medikamente genommen'),
      h('div', { class: 'chips' }, ...meds.map((o) => chip((e.meds || []).includes(o), o, () => multi('meds', o)))),
      h('div', { class: 'rz-have' }, medIn, h('button', { class: 'btn', type: 'button', onclick: addOwnMed }, 'Dazu')),
      c.medList.length ? h('details', { class: 'small muted' }, h('summary', {}, 'Eigene Einträge verwalten'),
        h('div', { class: 'chips' }, ...c.medList.map((m) => h('button', { class: 'chip', type: 'button', 'aria-label': `${m} aus der Auswahl nehmen`, onclick: () => { removeMed(m); rerender(); } }, `${m} ✕`))),
        h('p', {}, 'Nimmt den Namen nur aus der Auswahl. Alte Einträge bleiben.')) : null) : null,
    group('tests'),
    tr.mood ? multiCard('mood', 'Stimmung', MOOD) : null,
    tr.note ? h('section', { class: 'card cy-group' }, h('h3', {}, 'Notiz'), note) : null,
    h('a', { class: 'btn primary block', href: '#/zyklus' }, 'Fertig'),
    h('a', { class: 'link small cy-center', href: '#/ich/zyklus' }, 'Was ich tracke ändern'));
}

// ---------- Verlauf ----------
function lengthChart(a) {
  const ls = a.lengths.slice(-6);
  if (!ls.length) return null;
  const W = 320, H = 150, top = 16, base = 118, maxV = Math.max(45, ...ls);
  const Y = (v) => base - (v / maxV) * (base - top);
  const bw = 30, gap = (W - 30 - ls.length * bw) / (ls.length + 1);
  const ns = 'http://www.w3.org/2000/svg';
  const el = (t, at, txt) => { const x = document.createElementNS(ns, t); for (const [k, v] of Object.entries(at)) x.setAttribute(k, String(v)); if (txt != null) x.textContent = txt; return x; };
  const s = el('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', role: 'img', class: 'cy-chart', 'aria-label': `Länge der letzten ${ls.length} Zyklen: ${ls.join(', ')} Tage` });
  s.append(el('rect', { x: 30, y: Y(M.NORMAL_MAX).toFixed(1), width: W - 30, height: (Y(M.NORMAL_MIN) - Y(M.NORMAL_MAX)).toFixed(1), class: 'norm' }));
  s.append(el('text', { x: 26, y: (Y(M.NORMAL_MAX) + 4).toFixed(1), 'text-anchor': 'end', class: 'ax' }, String(M.NORMAL_MAX)));
  s.append(el('text', { x: 26, y: (Y(M.NORMAL_MIN) + 4).toFixed(1), 'text-anchor': 'end', class: 'ax' }, String(M.NORMAL_MIN)));
  s.append(el('line', { x1: 30, y1: base, x2: W, y2: base, class: 'base' }));
  ls.forEach((n, i) => {
    const x = 30 + gap + i * (bw + gap);
    const ok = n >= M.NORMAL_MIN && n <= M.NORMAL_MAX;
    s.append(el('rect', { x: x.toFixed(1), y: Y(n).toFixed(1), width: bw, height: (base - Y(n)).toFixed(1), rx: 6, class: ok ? 'bar' : 'bar out' }));
    s.append(el('text', { x: (x + bw / 2).toFixed(1), y: (Y(n) - 4).toFixed(1), 'text-anchor': 'middle', class: 'val' }, String(n)));
  });
  if (a.own) s.append(el('line', { x1: 30, y1: Y(a.median).toFixed(1), x2: W, y2: Y(a.median).toFixed(1), class: 'med' }));
  s.append(el('text', { x: 30, y: base + 20, class: 'ax' }, `Band: ${M.NORMAL_MIN} bis ${M.NORMAL_MAX} Tage (FIGO)${a.own ? ` · gestrichelt: typisch ${a.median}` : ''}`));
  return s;
}

function tempChart(a) {
  if (!a.last) return null;
  const days = cycleDays();
  const pts = [];
  for (let d = 1; d <= a.dayNo; d++) { const e = days[M.addDays(a.last, d - 1)]; if (e && e.temp) pts.push({ d, t: e.temp, off: !!e.tempOff }); }
  if (!pts.length) return null;
  const len = Math.max(a.median, a.dayNo);
  const ts = pts.map((p) => p.t);
  const lo = Math.floor((Math.min(...ts) - 0.1) * 10) / 10, hi = Math.ceil((Math.max(...ts) + 0.1) * 10) / 10;
  const W = 320, H = 160, L = 36, R = 312, T = 12, B = 134;
  const X = (d) => L + ((d - 1) / Math.max(1, len - 1)) * (R - L);
  const Y = (t) => B - ((t - lo) / (hi - lo)) * (B - T);
  const ns = 'http://www.w3.org/2000/svg';
  const el = (t, at, txt) => { const x = document.createElementNS(ns, t); for (const [k, v] of Object.entries(at)) x.setAttribute(k, String(v)); if (txt != null) x.textContent = txt; return x; };
  const s = el('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', role: 'img', class: 'cy-chart', 'aria-label': `Basaltemperatur in diesem Zyklus, ${pts.length} Messungen` });
  [lo, (lo + hi) / 2, hi].forEach((v) => { s.append(el('line', { x1: L, y1: Y(v).toFixed(1), x2: R, y2: Y(v).toFixed(1), class: 'grid' })); s.append(el('text', { x: L - 4, y: (Y(v) + 4).toFixed(1), 'text-anchor': 'end', class: 'ax' }, v.toFixed(1).replace('.', ','))); });
  const good = pts.filter((p) => !p.off);
  if (good.length > 1) s.append(el('polyline', { points: good.map((p) => `${X(p.d).toFixed(1)},${Y(p.t).toFixed(1)}`).join(' '), class: 'tline' }));
  pts.forEach((p) => s.append(el('circle', { cx: X(p.d).toFixed(1), cy: Y(p.t).toFixed(1), r: p.off ? 4 : 3.5, class: p.off ? 'tdot off' : 'tdot' })));
  s.append(el('line', { x1: X(a.dayNo).toFixed(1), y1: T, x2: X(a.dayNo).toFixed(1), y2: B + 4, class: 'today' }));
  s.append(el('text', { x: L, y: B + 18, class: 'ax' }, 'Tag 1'));
  s.append(el('text', { x: X(a.dayNo).toFixed(1), y: B + 18, 'text-anchor': 'middle', class: 'ax' }, 'heute'));
  return h('section', { class: 'card' }, h('h3', {}, 'Basaltemperatur'), s,
    h('p', { class: 'small muted' }, 'Leere Punkte: Messung mit Störung, nicht verbunden. Nach dem Eisprung liegt die Körpertemperatur im Mittel 0,3 bis 0,7 °C höher, am deutlichsten im Schlaf oder direkt nach dem Aufwachen (Baker 2020). Das zeigt einen Eisprung im Nachhinein, nicht vorher.'));
}

export function historyView() {
  const a = cycleAnalysis();
  const c = cycleSettings();
  const ls = a.lengths.slice(-6);
  const regular = a.spread <= 7 ? 'regelmäßig' : a.spread <= 9 ? 'je nach Alter noch regelmäßig' : 'unregelmäßig';
  const rows = ls.map((n, i) => ({ n, start: a.starts[a.starts.length - ls.length - 1 + i], d: n - a.median })).reverse();
  return h('div', { class: 'cy' },
    ...cycleHead('/zyklus/verlauf'),
    a.own ? [
      h('section', { class: 'card' },
        h('div', { class: 'stats' },
          h('div', { class: 'stat' }, h('b', {}, String(a.median)), h('span', {}, 'Tage typisch')),
          h('div', { class: 'stat' }, h('b', {}, a.spread ? `${a.min}–${a.max}` : '±0'), h('span', {}, a.spread ? 'Tage Spanne' : 'Schwankung')),
          h('div', { class: 'stat' }, h('b', {}, String(a.bleedAvg)), h('span', {}, 'Tage Blutung'))),
        h('p', { class: 'small' }, a.spread === 0 ? `Deine letzten ${a.usable.length} Zyklen waren alle ${a.median} Tage lang.` : `Deine letzten ${a.usable.length} Zyklen waren ${a.min} bis ${a.max} Tage lang. ${a.spread} Tage Unterschied gelten als ${regular} (FIGO: bis 7 bis 9 Tage, je nach Alter).`),
        lengthChart(a),
        h('p', { class: 'small muted' }, 'Typisch = mittlerer Wert (Median) deiner letzten bis zu 6 Zyklen, damit ein Ausreißer nicht alles verschiebt.')),
      h('h3', { class: 'sec' }, 'Zyklus für Zyklus'),
      h('section', { class: 'card list cy-up' }, ...rows.map((r) => h('div', { class: 'cy-up-row' },
        h('b', {}, deDate(r.start, { day: '2-digit', month: '2-digit', year: '2-digit' })),
        h('span', {}, `${r.n} Tage`),
        h('small', {}, r.d === 0 ? 'typisch' : `${r.d > 0 ? '+' : '−'}${Math.abs(r.d)} ${Math.abs(r.d) === 1 ? 'Tag' : 'Tage'}`))))
    ] : h('section', { class: 'card' }, h('p', { class: 'small muted' }, 'Sobald zwei Perioden eingetragen sind, siehst du hier deine typische Zykluslänge und wie stark sie schwankt. Ältere Daten übernimmst du unter „Ich → Zyklus“.')),
    flagsCard(a),
    c.track.temp ? tempChart(a) : null,
    h('section', { class: 'card list me-grp' }, h('a', { class: 'me-row k-cyc', href: '#/zyklus/bericht' },
      h('span', { class: 'qa-badge' }, icon('list', { size: 20 })), h('span', { class: 't' }, h('b', {}, 'Bericht für die Ärztin'), h('small', {}, 'Drucken, als PDF oder als Text teilen')),
      h('span', { class: 'qa-chev' }, icon('chevron', { size: 16 })))));
}
