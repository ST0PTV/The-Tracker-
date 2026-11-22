/* Labor-Wirt für das Level-System „Gemüsemonster“.
   Stellt die wenigen Dinge bereit, die die Level-Module von einer Wirts-App erwarten
   (state, save, render, toast, Sheets, Datums-Helfer, Wasser-Funktionen), und füllt das Labor mit
   erfundenen Testdaten (Szenarien). Nachgebaut nach den gleichnamigen Funktionen aus dem
   Calorie Tracker (ST0PTV/Calorie-Tracker, js/app.js und tools/preview/seed.js, MIT, ST0PTV).
   Wichtig: eigener Speicher-Key „gmlab.v1“. Nie ct.v1, tt_…, wt_… oder rezeptbuch-… anfassen –
   alle ST0PTV-Apps teilen dieselbe Origin. Kein Service Worker. */
'use strict';

const LAB_KEY = 'gmlab.v1', LAB_SKEY = 'gmlab.szenario';

/* ---------- Helfer wie in der Wirts-App ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function isoDate(d) { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); }
function addDays(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return isoDate(d); }
const setOpen = new Set(); // in der Wirts-App: aufgeklappte Einstellungen
var INFO = globalThis.INFO || {}; globalThis.INFO = INFO;

let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}
function sheetHead(id, title, sub, extra = '') {
  return sub
    ? `<div class="sheet-head"><button class="btn ghost" id="${id}">‹ Zurück</button>${extra || '<span></span>'}</div><h1>${title}</h1>`
    : `<div class="sheet-head"><h1 class="sh-t">${title}${extra}</h1><button class="btn ghost" id="${id}">Schließen</button></div>`;
}
function openSheet(html) {
  const s = $('#sheet');
  s.innerHTML = `<div class="sheet-inner">${html}</div>`;
  s.hidden = false; s.scrollTop = 0;
  document.body.style.overflow = 'hidden';
}
function closeSheet() {
  $('#sheet').hidden = true; $('#sheet').innerHTML = '';
  document.body.style.overflow = '';
  render();
}
// Info-Knopf und Info-Fenster wie in der Wirts-App
const infoBtn = (key) => `<button type="button" class="ibtn" data-info="${key}" aria-label="Info">i</button>`;
function openInfo(key) {
  const raw = INFO[key]; if (!raw) return;
  const i = typeof raw === 'function' ? raw() : raw;
  closeInfo();
  const el = document.createElement('div');
  el.id = 'infoSheet';
  el.innerHTML = `<div class="info-back"></div><div class="info-panel" role="dialog" aria-modal="true" aria-label="${i.title || 'Info'}"><div class="info-grip"></div>
    <div class="info-h"><span class="info-i ${i.warn ? 'warn' : ''}">${i.warn ? '!' : 'i'}</span><h1>${i.title || 'Info'}</h1></div>
    <div class="info-body">${i.body}</div>
    <button class="btn block" id="infoOk">Verstanden</button></div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('open'));
  el.querySelector('.info-back').onclick = closeInfo;
  el.querySelector('#infoOk').onclick = closeInfo;
}
function closeInfo() { const el = document.getElementById('infoSheet'); if (el) el.remove(); }
document.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('[data-info]');
  if (!b) return;
  e.preventDefault(); e.stopPropagation(); openInfo(b.dataset.info);
}, true);
// Wasser: im Labor aus state.water.log (ml je Tag), Ziel fest
const waterOf = (iso) => ((state.water && state.water.log && state.water.log[iso]) || []).reduce((a, e) => a + (e.ml || 0), 0);
const waterGoalFor = () => (state.water && state.water.goal) || 1500;

/* ---------- Testdaten (nur erfunden) ---------- */
let ra = 20260714;
const rnd = () => { ra = (ra + 0x6D2B79F5) | 0; let t = Math.imul(ra ^ (ra >>> 15), 1 | ra); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const LAB_TODAY = isoDate(new Date());
const LAB_START = addDays(LAB_TODAY, -130); // gut vier Monate Verlauf
// Werte je 100 g (BLS 4.0, gerundet): id, Name, kcal, Eiweiß, KH, Fett, Ballaststoffe, Zucker
const LAB_F = {
  hafer: ['C133000', 'Hafer Flocken', 348, 13.2, 53.3, 6.7, 11, 0.7], banane: ['F503100', 'Banane roh', 79, 1.3, 15.9, 0.4, 2, 13.9],
  apfel: ['F110100', 'Apfel roh', 58, 0.4, 11.7, 0.5, 2.3, 10.5], reis: ['C352000', 'Reis poliert, roh', 351, 7.9, 77.1, 0.6, 2.5, 0.3],
  tofu: ['H861000', 'Tofu', 115, 15.5, 0, 5.6, 1.3, 0], moehre: ['G620100', 'Karotte/Möhre, roh', 40, 0.8, 6.5, 0.4, 2.9, 6.4],
  tomate: ['G561100', 'Tomate roh', 22, 1, 3.3, 0.1, 1.3, 3.3], spinat: ['G211100', 'Spinat roh', 18, 2.1, 0.9, 0.3, 1.8, 0.8],
  champ: ['K701100', 'Champignon roh', 28, 3.7, 2.9, 0.3, 1.9, 0.2], zwiebel: ['G480100', 'Speisezwiebel roh', 34, 1.2, 6, 0.2, 1.4, 6],
  brokkoli: ['G312100', 'Broccoli roh', 35, 3.6, 2.3, 0.6, 3, 1.4], mais: ['G570100', 'Zuckermais roh', 67, 3.3, 9.4, 1.2, 2.8, 3.4],
  brot: ['B271000', 'Roggenmischbrot', 218, 7.4, 42, 1, 6.1, 1.3], kartoffel: ['K110100', 'Kartoffel geschält, roh', 83, 1.9, 17.9, 0.1, 1.4, 0.9],
  paprika: ['G543100', 'Gemüsepaprika rot, roh', 36, 1, 6.2, 0.2, 2.2, 6.2],
};
const labEnt = (meal, k, g) => { const f = LAB_F[k]; return { id: Math.random().toString(36).slice(2, 10), meal, grams: g, ref: 'bls:' + f[0], src: 'bls', n: f[1], k: f[2], p: f[3], c: f[4], f: f[5], fi: f[6], su: f[7] }; };
const LAB_LUNCH = [['reis', 'tofu', 'brokkoli'], ['kartoffel', 'spinat', 'zwiebel'], ['reis', 'champ', 'paprika'], ['kartoffel', 'tofu', 'moehre'], ['reis', 'mais', 'tomate']];
const labDay = (i) => { const l = LAB_LUNCH[i % LAB_LUNCH.length]; return [labEnt('breakfast', i % 3 ? 'hafer' : 'brot', 70), labEnt('breakfast', i % 2 ? 'apfel' : 'banane', 130), labEnt('lunch', l[0], 90), labEnt('lunch', l[1], 150), labEnt('lunch', l[2], 120), labEnt('dinner', 'tomate', 150), labEnt('dinner', 'zwiebel', 40)]; };
const labSrc = (s) => ({ days: s.days, weightLog: {}, ev: s.level.ev || {}, waterOn: false, waterOf: () => 0, waterGoalFor: () => Infinity });

function labBase(from, to, skip) {
  const s = { days: {}, weightLog: {}, water: { enabled: false, goal: 1500, log: {} }, slices: {}, level: { ev: {}, fx: {} } };
  let i = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) { if (!skip(d)) s.days[d] = labDay(i); i++; if (i % 3 === 0) s.level.ev[d] = { scan: 1 + (i % 2) }; }
  return s;
}
// Garten-Verlauf nachspielen: Besucher einladen, Freunde begrüßen, Mitbringsel abholen, ab und zu säen und Deko kaufen
function labPlay(s, until, keep) {
  s.level.garden = { acts: [], gifts: {} };
  const S = labSrc(s), r = levelCompute(S, s.level, until);
  const g = levelGarden(S, s.level, addDays(until, -1), r, (d, x) => {
    const out = [];
    if (x.gift) out.push({ a: 'gift' });
    if (x.visitor && x.visitor.kind === 'new' && x.visitor.id !== keep && x.samen >= 40 && x.plots.length < x.maxPlots) out.push({ a: 'invite', m: x.visitor.id });
    else if (x.visitor && x.visitor.kind === 'friend') out.push({ a: 'friend', m: x.visitor.id });
    else if (!keep && x.samen >= 160 && x.plots.length < 2) out.push({ a: 'sow' });
    const dk = LV_DEKO.find((k) => !k.gift && !x.deko.includes(k.id) && x.samen >= k.cost + 60);
    if (dk && d.slice(8) === '15') out.push({ a: 'deko', m: dk.id });
    return out;
  });
  s.level.garden = { acts: g.acts, gifts: g.gifts };
}
function labGarden(want, keep) {
  for (let seed = 1; seed < 400; seed++) {
    ra = 20260714;
    const s = labBase(LAB_START, LAB_TODAY, (d) => d !== LAB_TODAY && rnd() < 0.1);
    s.level = Object.assign(s.level, { enabled: true, starter: 'erbsi', startDate: LAB_START, seed });
    s.days[LAB_TODAY] = labDay(4); // heute mit Mais (Spross)
    labPlay(s, LAB_TODAY, keep);
    const g = levelGarden(labSrc(s), s.level, LAB_TODAY, levelCompute(labSrc(s), s.level, LAB_TODAY));
    if (want(g)) { s.level.costume = 'kuerbis'; s.level.gseen = g.log.filter((x) => x.kind === 'hatch' || x.kind === 'grow').length; return s; }
  }
  return labBase(LAB_START, LAB_TODAY, () => false);
}
const LAB_SC = {
  visit: { t: 'Garten mit Besuch', d: 'Läuft seit gut vier Monaten mit Garten, Beet und Deko; heute schaut ein neues Bonus-Monster vorbei.',
    make: () => labGarden((g) => g.visitor && g.visitor.kind === 'new' && !g.gift && g.samen >= 40 && g.plots.length, 'maisi') },
  gift: { t: 'Mitbringsel heute', d: 'Wie oben, aber ein Monster hat heute etwas mitgebracht (erscheint beim Öffnen).',
    make: () => labGarden((g) => g.gift && !g.gift.claimed && g.plots.length, null) },
  evolve: { t: 'Kurz vor Entwicklung', d: 'Im aktuellen Monat fehlt 1 Tag bis zur Normalform → unten „Heute eintragen“ tippen.',
    make: () => {
      const mStart = LAB_TODAY.slice(0, 8) + '01';
      const s = labBase(LAB_START, addDays(mStart, -1), () => rnd() < 0.12);
      Object.assign(s.level, { enabled: true, starter: 'moehri', startDate: LAB_START, seed: 4242 });
      const yest = addDays(LAB_TODAY, -1), src = labSrc(s);
      for (let n = 1; n <= 31; n++) {
        for (let d = mStart; d <= yest; d = addDays(d, 1)) delete s.days[d];
        for (let k = 0; k < n && addDays(yest, -k) >= mStart; k++) s.days[addDays(yest, -k)] = labDay(k);
        if ([...lvCountedDays(src, s.level.startDate, yest).counted].filter((x) => x >= mStart).length >= 9) break;
      }
      return s;
    } },
  hatch: { t: 'Neuer Monat, Ei', d: 'Im aktuellen Monat noch nichts eingetragen → „Heute eintragen“ lässt das Monatsei schlüpfen.',
    make: () => { const s = labBase(LAB_START, addDays(LAB_TODAY.slice(0, 8) + '01', -1), () => rnd() < 0.12); Object.assign(s.level, { enabled: true, starter: 'tomi', startDate: LAB_START, seed: 777 }); return s; } },
  retro: { t: 'Rückwirkend starten', d: 'Daten seit gut vier Monaten, Level-System an, noch kein Starter → Starter wählen.',
    make: () => { const s = labBase(LAB_START, addDays(LAB_TODAY, -1), () => rnd() < 0.12); s.level.enabled = true; return s; } },
  intro: { t: 'Spiel noch aus', d: 'Daten vorhanden, Level-System ausgeschaltet → Hinweiskarte mit Einführung.', make: () => labBase(LAB_START, addDays(LAB_TODAY, -1), () => rnd() < 0.12) },
  fresh: { t: 'Neu ohne Daten', d: 'Leer, Level-System an → Ei wählen und ausbrüten.', make: () => ({ days: {}, level: { enabled: true } }) },
};

/* ---------- Zustand laden (wie normalizeState im Calorie Tracker, nur der Level-Teil) ---------- */
function labNormalize(data) {
  const s = Object.assign({ days: {}, weightLog: {}, slices: {}, water: { enabled: false, goal: 1500, log: {} } }, data || {});
  s.level = Object.assign(LEVEL_DEFAULTS(), s.level || {});
  const L = s.level;
  if (!L.ev || typeof L.ev !== 'object') L.ev = {};
  if (!L.arenas || typeof L.arenas !== 'object') L.arenas = {};
  if (!L.fx || typeof L.fx !== 'object') L.fx = {};
  if (!L.garden || typeof L.garden !== 'object') L.garden = {};
  if (!Array.isArray(L.garden.acts)) L.garden.acts = [];
  if (!L.garden.gifts || typeof L.garden.gifts !== 'object') L.garden.gifts = {};
  if (!L.trades || typeof L.trades !== 'object') L.trades = {};
  if (!Array.isArray(L.trades.got)) L.trades.got = [];
  if (!Array.isArray(L.trades.given)) L.trades.given = [];
  if (L.starter && !LV_STARTERS.some((m) => m.id === L.starter)) L.starter = null;
  return s;
}
function labLoad() {
  try { const raw = localStorage.getItem(LAB_KEY); if (raw) return labNormalize(JSON.parse(raw)); } catch (e) { /* neu anlegen */ }
  return null;
}
let labScenario = localStorage.getItem(LAB_SKEY) || 'visit';
if (!LAB_SC[labScenario]) labScenario = 'visit';
let state = labLoad();
if (!state) { state = labNormalize(LAB_SC[labScenario].make()); localStorage.setItem(LAB_KEY, JSON.stringify(state)); localStorage.setItem(LAB_SKEY, labScenario); }

function save() {
  if (typeof lvInvalidate === 'function') lvInvalidate();
  try { localStorage.setItem(LAB_KEY, JSON.stringify(state)); } catch (e) { toast('Speichern fehlgeschlagen.'); }
}
function labSetScenario(k) {
  labScenario = k; ra = 20260714;
  state = labNormalize(LAB_SC[k].make());
  localStorage.setItem(LAB_SKEY, k); save();
  closeSheet();
  toast(`Szenario: ${LAB_SC[k].t}`);
}

/* ---------- Seite: Journal-Kopf, Karten, Einstellungen, Testknöpfe ---------- */
function labDayRow(iso) {
  const e = state.days[iso] || [];
  return `${e.length} Einträge`;
}
function render() {
  const v = $('#view'), today = LAB_TODAY;
  const sub = new Date(today + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  let html = `<div class="topbar v2">
      <div><div class="sub">${esc(sub)}</div><div class="day">Heute</div></div>
      <div class="nav">${state.level.enabled ? lvChipHtml() : ''}</div>
    </div>`;
  html += `<div class="card lab-note"><b>Labor · erfundene Testdaten</b><p class="small muted" style="margin:4px 0 0">Nur in diesem Browser gespeichert (eigener Speicher, getrennt von allen Apps). Szenario: ${esc(LAB_SC[labScenario].t)}. Heute: ${labDayRow(today)}.</p>
    <div class="lab-open" style="margin-top:10px"><button class="btn" id="labAdd">Heute eintragen</button><button class="btn secondary" id="labSc">Szenario wählen</button><button class="btn ghost" id="labScan">Scan zählen</button></div></div>`;
  if (typeof lvVisitorHtml === 'function') html += lvVisitorHtml(today);
  if (typeof lvIntroCardHtml === 'function') html += lvIntroCardHtml(today);
  if (state.level.enabled && state.level.starter) {
    html += `<div class="card"><h2>Direkt öffnen</h2><div class="lab-open">${[
      ['lvOpenProgress', 'Fortschritt'], ['lvOpenGarden', 'Garten'], ['lvOpenCollection', 'Sammlung'], ['lvOpenExplorer', 'Entdecker'],
      ['lvOpenWardrobe', 'Kleiderschrank'], ['lvOpenSeason', 'Saison'], ['lvOpenArenas', 'Arenen'], ['lvOpenIntro', 'Einführung'],
    ].filter(([f]) => typeof globalThis[f] === 'function').map(([f, l]) => `<button class="btn secondary" data-open="${f}">${l}</button>`).join('')}</div></div>`;
  }
  html += lvSettingsCard();
  v.innerHTML = html;
  lvBindChip(); setTimeout(lvAfterRender, 0);
  if (typeof lvBindVisitor === 'function' && v.querySelector('#lvgVisCard')) lvBindVisitor(null, render, v);
  if (typeof lvBindIntroCard === 'function') lvBindIntroCard(render);
  lvBindSettings();
  v.querySelectorAll('[data-open]').forEach((b) => b.onclick = () => globalThis[b.dataset.open]());
  $('#labAdd').onclick = () => {
    const e = state.days[today] || [];
    const meal = ['breakfast', 'lunch', 'dinner', 'snack'][Math.min(e.length, 3)];
    (state.days[today] = e).push(labEnt(meal, ['mais', 'brokkoli', 'tomate', 'apfel'][e.length % 4], 100));
    save(); render(); toast('Erfundener Eintrag für heute');
  };
  $('#labScan').onclick = () => { levelEvent(state, 'scan', today); save(); render(); toast('Scan gezählt'); };
  $('#labSc').onclick = () => {
    openSheet(`${sheetHead('labScX', 'Szenario wählen')}<p class="small muted">Ersetzt die Labor-Daten durch ein neues Szenario. Echte App-Daten sind nie betroffen.</p>
      ${Object.entries(LAB_SC).map(([k, s]) => `<button class="card lab-sc ${k === labScenario ? 'on' : ''}" data-sc="${k}"><b>${esc(s.t)}</b><small>${esc(s.d)}</small></button>`).join('')}`);
    $('#labScX').onclick = closeSheet;
    document.querySelectorAll('[data-sc]').forEach((b) => b.onclick = () => labSetScenario(b.dataset.sc));
  };
}
window.addEventListener('DOMContentLoaded', render);
