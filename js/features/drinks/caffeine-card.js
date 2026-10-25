// Koffein-Karte unter „Heute“, Eingabe-Sheet mit Vorschau und Verlauf (Heatmap, 30 Tage).
// Nach caffCardHtml, openCaffeine und caffHistoryHtml im Kalorien-Tracker (Rezeptbuch/tracker/js/caffeine.js; MIT).
// Alle Pegel sind Modellwerte (Schätzung), keine Messung.
import { h } from '../../core/util.js';
import { openSheet } from '../../core/sheet.js';
import { icon } from '../../core/icons.js';
import { toast } from '../../core/ui.js';
import { openInfo, infoBtn } from '../../core/info.js';
import { num, isoDate, addDays } from '../../core/format.js';
import { getProfile } from '../../core/profile.js';
import { keOf, level, clearTime, bedWake, absHours, fmtHours, hmToMin, minToHm } from './caffeine-model.js';
import { caffSettings, caffEntries, caffRows, caffSum, caffDoses, saveCaffeine, removeCaffeine, CAFF_CATS, CAFF_DRINKS, drinkKcal, CAFF_REFS } from './caffeine.js';
import { chartSvg, heatSvg } from './caffeine-chart.js';

const svgBox = (markup, cls = 'chart-box') => { const d = h('div', { class: cls }); d.innerHTML = markup; return d; };
const r0 = (n) => Math.round(n || 0);

export function caffInfo() {
  const sx = getProfile().sex;
  openInfo({
    title: 'Koffein – so rechnet die App',
    note: 'Alle Pegel sind Schätzungen aus einem Modell, keine Messung.',
    body: [
      'Modell: Aufnahme und Abbau erster Ordnung (ein Kompartiment). Maximum etwa 30–40 Minuten nach dem Trinken; danach halbiert sich die Menge im Körper je Halbwertszeit (Standard 5 h).',
      'Die Halbwertszeit ist individuell sehr verschieden (Studien 2,7–9,9 h), bei Rauchern kürzer. Körpergewicht, Mahlzeiten, Gewöhnung und Medikamente berücksichtigt das Modell nicht.',
      sx === 'f'
        ? 'Für Frauen: Eine östrogenhaltige Pille verlängert die Halbwertszeit deutlich (Studie: 7,9 statt 5,4 h). Wenn das zutrifft, unter „Ich → Getränke“ eher 7–8 h einstellen. In der Schwangerschaft gilt laut EFSA ein Richtwert von 200 mg pro Tag.'
        : 'Das Geschlecht allein ändert den Abbau kaum; eine östrogenhaltige Pille und eine Schwangerschaft verlängern ihn deutlich.',
      'Das Ziel zur Bettzeit (Standard 50 mg) ist eine Faustregel, kein belegter Grenzwert. Laut EFSA können schon 100 mg kurz vor dem Schlafen den Schlaf stören; in einer Studie störten 400 mg sogar 6 Stunden vorher noch.',
      'Richtwert pro Tag: bis 400 mg gelten für gesunde Erwachsene als unbedenklich, Einzeldosen bis 200 mg (EFSA 2015).',
      'Koffeingehalte sind Richtwerte und schwanken je Sorte und Zubereitung; mit „ca.“ markierte Werte sind übliche Angaben ohne Beleg. Die Packungsangabe hat Vorrang.'
    ],
    src: CAFF_REFS
  });
}

/** Karte für einen Tag (null, wenn der Koffein-Tracker aus ist). */
export function caffCard(iso, today) {
  const c = caffSettings();
  if (!c.enabled) return null;
  const ke = keOf(c.halfLife), thr = c.threshold;
  const isToday = iso === today;
  const doses = caffDoses(iso);
  const nowH = isToday ? Date.now() / 36e5 : null;
  const { bed, wake } = bedWake(iso, c.bed, c.wake);
  const rows = caffRows(iso);
  const total = caffSum(iso);
  const over = total > c.limit;
  const big = isToday ? r0(level(doses, nowH, ke)) : r0(total);
  let pill = null;
  if (isToday) {
    const clr = clearTime(doses, nowH, thr, ke);
    pill = clr <= nowH + 1 / 12
      ? h('span', { class: 'pill ok' }, `unter ${r0(thr)} mg`)
      : h('span', { class: `pill ${clr <= bed ? 'ok' : 'late'}` }, `unter ${r0(thr)} mg ab `, h('b', {}, fmtHours(clr, iso)));
  }
  const add = h('button', { class: 'add-btn', type: 'button', 'aria-label': 'Koffein-Getränk hinzufügen', onclick: () => openCaffeine(iso) }, icon('plus', { size: 22 }));
  const head = h('div', { class: 'tk-head' },
    h('div', {}, h('span', { class: 'tk-label' }, 'Koffein', infoBtn('Koffein', caffInfo)),
      h('div', { class: 'tk-big' }, String(big), h('small', {}, ' mg')),
      h('div', { class: 'tk-sub' }, isToday ? 'jetzt im Körper' : 'aufgenommen')),
    pill, add);
  if (!rows.length && big < 1) {
    return h('section', { class: 'card tk caf is-empty' }, head, h('p', { class: 'small muted' }, `Noch nichts. Richtwert ${r0(c.limit)} mg pro Tag.`));
  }
  const bedLvl = level(doses, bed, ke);
  const list = h('div', { class: 'tk-rows' }, ...rows.map((e) => {
    const left = isToday ? level([{ t: absHours(iso, e.min), mg: e.mg, dur: (e.dur || 0) / 60 }], nowH, ke) : null;
    const future = isToday && absHours(iso, e.min) > nowH;
    return h('button', {
      class: 'tk-row', type: 'button',
      onclick: () => (e.fromJournal ? toast('Kommt aus dem Journal – dort ändern.') : openCaffeine(iso, caffEntries(iso).find((x) => x.id === e.id)))
    },
    h('span', { class: 'tk-time' }, minToHm(e.min)),
    h('span', { class: 't' }, h('b', {}, e.n), e.fromJournal ? h('small', {}, 'aus dem Journal') : null),
    h('span', { class: 'tk-v' }, h('b', {}, `${r0(e.mg)} mg`), h('small', {}, future ? 'geplant' : left != null ? `noch ${r0(left)}` : '')));
  }));
  return h('section', { class: 'card tk caf' }, head,
    svgBox(chartSvg({ iso, doses, nowH, ke, thr, bed, wake })),
    h('div', { class: 'tk-stats' },
      h('div', {}, h('span', {}, isToday ? 'Heute aufgenommen' : 'Aufgenommen'), h('b', { class: over ? 'warn' : '' }, `${r0(total)} / ${r0(c.limit)} mg`)),
      h('div', {}, h('span', {}, `Zur Bettzeit (${c.bed})`), h('b', { class: bedLvl >= thr ? 'warn' : '' }, `${r0(bedLvl)} mg`))),
    over ? h('p', { class: 'small warn' }, `${r0(total - c.limit)} mg über deinem Richtwert.`) : null,
    list,
    h('button', { class: 'link', type: 'button', onclick: () => openCaffHistory(today) }, 'Verlauf (30 Tage)'));
}

/** Eingabe: Getränk wählen oder eigene Werte, Uhrzeit, Trinkdauer; Vorschau mit Bettzeit-Pegel. */
export function openCaffeine(iso, entry = null) {
  const c = caffSettings(), ke = keOf(c.halfLife), thr = c.threshold;
  const isToday = iso === isoDate();
  let cat = 'coffee';
  let dur = entry ? (entry.dur || 0) : 15;
  const nowHm = () => { const d = new Date(Math.round(Date.now() / 300000) * 300000); return minToHm(d.getHours() * 60 + d.getMinutes()); };
  const name = h('input', { class: 'input', type: 'text', placeholder: 'z. B. Mate', value: entry ? entry.n : '', 'aria-label': 'Bezeichnung' });
  const mg = h('input', { class: 'input', type: 'text', inputmode: 'decimal', value: entry ? String(entry.mg).replace('.', ',') : '', 'aria-label': 'Koffein in mg' });
  const ml = h('input', { class: 'input', type: 'text', inputmode: 'decimal', value: entry && entry.ml ? entry.ml : '', 'aria-label': 'Menge in ml' });
  const kc = h('input', { class: 'input', type: 'text', inputmode: 'decimal', value: entry && entry.kcal != null ? entry.kcal : '', 'aria-label': 'Energie in kcal' });
  const time = h('input', { class: 'input', type: 'time', value: entry ? minToHm(entry.min) : isToday ? nowHm() : '08:00', 'aria-label': 'Uhrzeit' });
  const tr = h('input', { type: 'checkbox', 'aria-label': 'kcal ins Journal, ml zum Wasser' });
  tr.checked = entry ? !!entry.tr : true;
  const cats = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Getränkeart' });
  const listBox = h('div', { class: 'card list caf-pick' });
  const durSeg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Getrunken über' });
  const prev = h('div', { class: 'caf-prev' });
  const saveBtn = h('button', { class: 'btn primary block', type: 'button' }, entry ? 'Speichern' : 'Eintragen');

  const base = caffDoses(iso).filter((d) => !entry || d.id !== entry.id);
  const read = () => ({ mg: num(mg.value), min: time.value ? hmToMin(time.value) : null });
  const preview = () => {
    const v = read();
    if (!(v.mg > 0) || v.min == null) {
      prev.replaceChildren(h('p', { class: 'small muted' }, 'Getränk wählen oder mg eintragen – dann erscheint die Vorschau.'));
      saveBtn.textContent = entry ? 'Speichern' : 'Eintragen';
      return;
    }
    saveBtn.textContent = `${entry ? 'Speichern' : 'Eintragen'} · ${r0(v.mg)} mg`;
    const tNew = absHours(iso, v.min);
    const plan = base.concat([{ t: tNew, mg: v.mg, dur: dur / 60 }]);
    const { bed, wake } = bedWake(iso, c.bed, c.wake);
    const b0 = level(base, bed, ke), b1 = level(plan, bed, ke);
    const clr = clearTime(plan, tNew, thr, ke);
    const day = caffSum(iso) - (entry ? entry.mg : 0) + v.mg;
    const warns = [];
    if (v.mg > 200) warns.push('Einzeldosis über 200 mg (EFSA-Richtwert für Einzeldosen).');
    if (day > c.limit) warns.push(`Damit liegt der Tag bei ${r0(day)} mg – über deinem Richtwert von ${r0(c.limit)} mg.`);
    prev.replaceChildren(
      svgBox(chartSvg({ iso, doses: base, plan, nowH: isToday ? Date.now() / 36e5 : null, ke, thr, bed, wake, h: 112, label: 'Vorschau des Koffeinverlaufs mit dem neuen Getränk' })),
      h('p', { class: 'small' }, 'Zur Bettzeit ', h('b', { class: b1 >= thr ? 'warn' : '' }, `${r0(b1)} mg`), ` statt ${r0(b0)} mg · unter ${r0(thr)} mg ab `, h('b', {}, fmtHours(clr, iso))),
      ...warns.map((w) => h('p', { class: 'small warn' }, w)));
  };
  const drawCats = () => cats.replaceChildren(...CAFF_CATS.map(([k, l]) => h('button', {
    type: 'button', role: 'radio', 'aria-checked': k === cat ? 'true' : 'false', onclick: () => { cat = k; drawCats(); drawList(); }
  }, l)));
  const drawList = () => {
    const items = CAFF_DRINKS.filter((d) => d.c === cat);
    listBox.hidden = cat === 'custom';
    listBox.replaceChildren(...items.map((d) => h('button', {
      class: 'row', type: 'button',
      onclick: () => { name.value = `${d.n} ${d.size}`; mg.value = d.mg; ml.value = d.ml; kc.value = drinkKcal(d); preview(); }
    }, h('span', { class: 't' }, h('b', {}, d.n), h('small', {}, d.size)), h('span', { class: 'tk-v' }, h('b', {}, `${d.s === 'typ' ? 'ca. ' : ''}${d.mg} mg`)))));
  };
  const drawDur = () => durSeg.replaceChildren(...[['Sofort', 0], ['15 min', 15], ['30 min', 30], ['1 h', 60]].map(([l, m]) => h('button', {
    type: 'button', role: 'radio', 'aria-checked': m === dur ? 'true' : 'false', onclick: () => { dur = m; drawDur(); preview(); }
  }, l)));
  for (const el of [mg, time, name]) { el.addEventListener('input', preview); el.addEventListener('change', preview); }

  let sheet = null;
  saveBtn.addEventListener('click', () => {
    const v = read();
    try {
      saveCaffeine(iso, { id: entry ? entry.id : null, min: v.min, mg: v.mg, n: name.value, dur, ml: num(ml.value) || 0, kcal: num(kc.value) || 0, tr: tr.checked });
    } catch (e) { toast(e.message, { error: true }); return; }
    toast(entry ? 'Gespeichert' : 'Eingetragen');
    sheet.close();
  });
  const del = () => {
    const gone = removeCaffeine(iso, entry.id);
    sheet.close();
    toast('Gelöscht', { action: { label: 'Rückgängig', onClick: () => saveCaffeine(iso, gone) } });
  };

  const when = isToday ? h('div', { class: 'chips' }, ...[['Jetzt', 0], ['+30 min', 30], ['+1 h', 60], ['+2 h', 120]].map(([l, m]) => h('button', {
    class: 'chip', type: 'button', onclick: () => { const d = new Date(Date.now() + m * 60000); time.value = minToHm(d.getHours() * 60 + d.getMinutes()); preview(); }
  }, l))) : null;

  sheet = openSheet(h('div', { class: 'caf-sheet' },
    cats, listBox,
    h('div', { class: 'two' }, h('label', { class: 'form-label' }, h('span', {}, 'Bezeichnung'), name), h('label', { class: 'form-label' }, h('span', {}, 'Koffein (mg)'), mg)),
    h('div', { class: 'two' }, h('label', { class: 'form-label' }, h('span', {}, 'Menge (ml)'), ml), h('label', { class: 'form-label' }, h('span', {}, 'Energie (kcal)'), kc)),
    h('label', { class: 'form-label' }, h('span', {}, 'Uhrzeit (später = Vorschau/Planung)'), time), when,
    h('span', { class: 'label' }, 'Getrunken über'), durSeg,
    h('label', { class: 'check-row' }, tr, h('span', {}, 'kcal ins Journal, ml zum Wasser')),
    prev, saveBtn,
    entry ? h('button', { class: 'btn block danger-text', type: 'button', onclick: del }, 'Eintrag löschen') : null),
  { title: entry ? 'Getränk bearbeiten' : 'Koffein-Getränk', full: true });
  drawCats(); drawList(); drawDur(); preview();
  return sheet;
}

/** Verlauf: Heatmap der letzten 30 Tage, gewählter Tag, Durchschnitte (ohne den laufenden Tag). */
export function openCaffHistory(today = isoDate()) {
  const c = caffSettings(), ke = keOf(c.halfLife), thr = c.threshold;
  const days = []; for (let i = 29; i >= 0; i--) days.push(addDays(today, -i));
  const info = days.map((iso) => {
    const rows = caffRows(iso);
    return { iso, doses: caffDoses(iso), mg: caffSum(iso), n: rows.length, last: rows.length ? Math.max(...rows.map((e) => e.min)) : null,
      bedLvl: level(caffDoses(iso), bedWake(iso, c.bed, c.wake).bed, ke) };
  });
  const done = info.filter((x) => x.iso !== today && x.n > 0);
  const avg = (f) => (done.length ? done.reduce((a, x) => a + f(x), 0) / done.length : null);
  let sel = days.length - 1;
  const box = h('div', {});
  const draw = () => {
    const svg = svgBox(heatSvg({ days: info, ke, thr, limit: c.limit, bed: hmToMin(c.bed), wake: hmToMin(c.wake), sel, nowH: Date.now() / 36e5 }), 'heat-box');
    svg.addEventListener('click', (e) => { const i = e.target.getAttribute && e.target.getAttribute('data-heat'); if (i != null) { sel = +i; draw(); } });
    const s = info[sel];
    const lab = new Date(s.iso + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
    box.replaceChildren(svg,
      h('div', { class: 'heat-legend small muted' }, ...[0, 1, 2, 3, 4, 5].map((k) => h('span', {}, h('i', { class: `h${k}` }),
        ['0', `<${r0(thr / 2)}`, `<${r0(thr)}`, `<${r0(2 * thr)}`, `<${r0(3 * thr)}`, `≥${r0(3 * thr)}`][k])), h('span', {}, 'mg')),
      h('div', { class: 'heat-detail' },
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Vorheriger Tag', onclick: () => { sel = Math.max(0, sel - 1); draw(); } }, icon('chevron', { size: 18, cls: 'flip' })),
        h('div', { class: 'center' }, h('b', {}, `${lab} · ${r0(s.mg)} mg`),
          h('div', { class: 'small muted' }, `${s.last != null ? `letztes Getränk ${minToHm(s.last)} · ` : ''}Pegel zur Bettzeit ${r0(s.bedLvl)} mg`)),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Nächster Tag', onclick: () => { sel = Math.min(days.length - 1, sel + 1); draw(); } }, icon('chevron', { size: 18 }))),
      h('div', { class: 'card list' },
        h('div', { class: 'kv' }, h('span', { class: 'muted' }, 'Ø Koffein an Tagen mit Koffein'), h('b', {}, avg((x) => x.mg) != null ? `${r0(avg((x) => x.mg))} mg` : '–')),
        h('div', { class: 'kv' }, h('span', { class: 'muted' }, 'Ø letztes Getränk'), h('b', {}, avg((x) => x.last) != null ? minToHm(avg((x) => x.last)) : '–')),
        h('div', { class: 'kv' }, h('span', { class: 'muted' }, 'Ø Pegel zur Bettzeit'), h('b', {}, avg((x) => x.bedLvl) != null ? `${r0(avg((x) => x.bedLvl))} mg` : '–'))),
      h('p', { class: 'small muted' }, 'Jede Spalte ein Tag, jede Zeile eine Stunde; je kräftiger, desto mehr Koffein im Körper (Modellwert). Streifen links = Schlafenszeit, Punkt unten = Tagesrichtwert überschritten.'));
  };
  draw();
  return openSheet(box, { title: 'Koffein – Verlauf', full: true });
}

