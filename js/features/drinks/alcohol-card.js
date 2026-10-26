// Alkohol unter „Heute“: Karte nur mit Eintrag, Kurve, Eingabe-Sheet mit Vorschau, Details, Hinweise.
// Nach alcChartSvg, alcCardHtml, openAlcohol und INFO.alc / INFO.alcWarn im Calorie-Tracker 2.3.1 (ST0PTV, MIT).
// Alle Werte sind grobe Schätzungen – nicht geeignet, um die Fahrtüchtigkeit zu beurteilen.
import { h } from '../../core/util.js';
import { openSheet } from '../../core/sheet.js';
import { toast } from '../../core/ui.js';
import { openInfo, infoBtn } from '../../core/info.js';
import { trackerCard, openTrackerDetails } from '../../core/tracker-card.js';
import { num, r1, isoDate } from '../../core/format.js';
import { getProfile } from '../../core/profile.js';
import { absHours, bedWake, fmtHours, hmToMin, minToHm } from './caffeine-model.js';
import { caffSettings } from './caffeine.js';
import { alcGrams, alcSeries, alcLevelAt, alcSober, alcPeak, alcFmt, bmiOf } from './alcohol-model.js';
import { alcSettings, alcEntries, alcDoses, alcParams, alcGramsOf, alcFedAuto, saveAlcohol, removeAlcohol, isFirstOfDay,
  ALC_CATS, ALC_DRINKS, alcMl, ALC_REFS } from './alcohol.js';

const r0 = (n) => Math.round(n || 0);
const svgBox = (markup) => { const d = h('div', { class: 'chart-box' }); d.innerHTML = markup; return d; };

export function alcWarnInfo() {
  openInfo({
    title: 'Hinweis',
    note: 'Grobe Schätzung, keine Messung.',
    body: ['Der angezeigte Promillewert ist eine Hochrechnung nach der Widmark-Formel aus Getränk, Uhrzeit, Gewicht und Geschlecht. Der tatsächliche Wert kann deutlich höher oder niedriger liegen.',
      'Die Anzeige ist nicht geeignet, um die Fahrtüchtigkeit zu beurteilen. Wer getrunken hat, sollte nicht fahren.']
  });
}

export function alcInfo(iso = isoDate()) {
  const p = getProfile(), q = alcParams(iso), bmi = bmiOf(q.kg, p.heightCm);
  const sx = p.sex;
  openInfo({
    title: 'Alkohol – so rechnet die App',
    note: 'Grobe Schätzung, keine Messung – nicht geeignet, um die Fahrtüchtigkeit zu beurteilen.',
    body: ['Widmark-Formel: Alkohol im Getränk geteilt durch Körpergewicht × Verteilungsfaktor r, minus Abbau. Nüchtern geht Alkohol schneller ins Blut, mit oder nach Essen langsamer und mit niedrigerem Gipfel (Annahme der App).',
      'Abbau: im Mittel etwa 0,15 ‰ pro Stunde, Spanne etwa 0,10–0,20 (nüchtern eher niedriger, nach Essen höher). Einstellbar unter „Ich → Alkohol“.',
      'Die kcal kommen ins Journal (Snacks); Alkohol zählt nicht zum Wasser. Die DGE empfiehlt (2024), auf Alkohol zu verzichten; keine Menge ist risikofrei.'],
    points: [['Verteilungsfaktor r', `${(Math.round(q.r * 100) / 100).toLocaleString('de-DE')} (${sx === 'm' ? 'Mann' : sx === 'f' ? 'Frau' : 'ohne Geschlecht'}${bmi ? `, aus BMI ${r1(bmi)}` : ', fester Wert – mit Körpergröße unter „Schlaf & Körper“ genauer'})`],
      ['Körpergewicht', q.kg ? `${r1(q.kg)} kg` : 'fehlt'], ['Aufnahme', 'nüchtern ka 4/h, mit Essen 1,5/h; 10 bzw. 20 % gelangen nicht ins Blut (Annahme)']],
    src: ALC_REFS
  });
}

/** Kurve von 6 bis 6 Uhr: Schlaf, 0,5-‰-Linie, „jetzt“; plan = Vorschau mit neuem Getränk. */
export function alcChartSvg({ iso, doses, plan = null, nowH = null, p, h: H = 140 }) {
  const W = 326, top = 8, bot = H - 16;
  const t0 = absHours(iso, 360), t1 = t0 + 24;
  const sb = alcSeries(doses, t0, t1, p, 0.1), sp = plan ? alcSeries(plan, t0, t1, p, 0.1) : null;
  const peak = Math.max(0, ...sb.map((x) => x[1]), ...(sp ? sp.map((x) => x[1]) : []));
  const mx = Math.max(0.6, peak * 1.15);
  const x = (t) => ((t - t0) / 24) * W, y = (v) => bot - (Math.min(v, mx) / mx) * (bot - top);
  const path = (s) => s.map(([t, v], i) => `${i ? 'L' : 'M'} ${x(t).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const c = caffSettings();
  const { bed, wake } = bedWake(iso, c.bed, c.wake);
  let s = `<svg class="cchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Geschätzter Blutalkohol von 6 Uhr bis 6 Uhr am Folgetag">`;
  if (bed < t1) { const bx = Math.max(0, x(bed)), wx = x(Math.min(wake, t1)); s += `<rect class="sleep" x="${bx.toFixed(1)}" y="${top - 2}" width="${(wx - bx).toFixed(1)}" height="${bot - top + 2}" rx="8"></rect><text class="lab" x="${(bx + 6).toFixed(1)}" y="${top + 10}">Schlaf</text>`; }
  s += `<line class="thr" x1="0" x2="${W}" y1="${y(0.5).toFixed(1)}" y2="${y(0.5).toFixed(1)}"></line><text class="lab" x="2" y="${(y(0.5) - 4).toFixed(1)}">0,5 ‰</text>`;
  const d = path(sb);
  s += `<path class="area" d="${d} L ${x(t1).toFixed(1)} ${bot} L 0 ${bot} Z"></path><path class="line${plan ? ' base' : ''}" d="${d}"></path>`;
  if (sp) s += `<path class="line plan" d="${path(sp)}"></path>`;
  if (nowH != null && nowH >= t0 && nowH <= t1) {
    const ny = y(alcLevelAt(plan || doses, nowH, p));
    s += `<line class="now" x1="${x(nowH).toFixed(1)}" x2="${x(nowH).toFixed(1)}" y1="${top - 2}" y2="${bot}"></line><circle class="dot" cx="${x(nowH).toFixed(1)}" cy="${ny.toFixed(1)}" r="5"></circle>`;
  }
  [['6', 0, 'start'], ['12', 0.25, 'middle'], ['18', 0.5, 'middle'], ['24', 0.75, 'middle'], ['6', 1, 'end']].forEach(([t, f, a]) => { s += `<text class="lab" x="${(f * W).toFixed(1)}" y="${H - 3}" text-anchor="${a}">${t}</text>`; });
  return s + '</svg>';
}

/** Zustand eines Tages für Karte und Details. */
function dayState(iso, today) {
  const p = alcParams(iso);
  const doses = alcDoses(iso);
  const isToday = iso === today;
  const nowH = isToday ? Date.now() / 36e5 : null;
  const t0 = absHours(iso, 360);
  // Höchstwert ab 0 Uhr (nicht erst ab 6 Uhr wie die Kurve), damit Getränke nach Mitternacht mitzählen
  const pk = alcPeak(doses, absHours(iso, 0), t0 + 24, p);
  const now = isToday && p.kg ? alcLevelAt(doses, nowH, p) : 0;
  return { p, doses, isToday, nowH, pk, now, grams: alcGramsOf(iso), list: alcEntries(iso) };
}

/** Karte: erst sichtbar mit einem Eintrag an diesem Tag (oder Restalkohol von gestern). */
export function alcCard(iso, today) {
  if (!alcSettings().enabled) return null;
  const st = dayState(iso, today);
  if (!st.list.length && st.now < 0.005) return null;
  let pill = null, late = false;
  if (!st.p.kg) pill = 'Gewicht fehlt';
  else if (st.isToday) {
    const sob = alcSober(st.doses, st.nowH, st.p);
    if (sob && sob > st.nowH + 1 / 12) { pill = `0,0 ‰ ab ${fmtHours(sob, iso)}`; late = true; } else pill = '0,0 ‰';
  } else pill = st.pk[1] > 0 ? `max. um ${fmtHours(st.pk[0], iso)}` : null;
  return trackerCard({
    kind: 'alc', cls: 'alc', label: 'Alkohol', value: alcFmt(st.isToday ? st.now : st.pk[1]), unit: '‰', filled: true, pill, pillLate: late,
    body: st.p.kg ? svgBox(alcChartSvg({ iso, doses: st.doses, nowH: st.nowH, p: st.p, h: 84 })) : null,
    addLabel: 'Alkohol eintragen', onAdd: () => openAlcohol(iso), onOpen: () => openAlcDetails(iso, today)
  });
}

/** Details: Wert, Kurve, Getrunken, Höchstwert, Einträge, Hinweis. */
export function openAlcDetails(iso, today = isoDate()) {
  return openTrackerDetails({ kind: 'alc', title: 'Alkohol', render: () => {
    const st = dayState(iso, today);
    const rows = st.list.length ? h('div', { class: 'tk-rows' }, ...st.list.map((e) => h('button', { class: 'tk-row', type: 'button', onclick: () => openAlcohol(iso, e) },
      h('span', { class: 'tk-time' }, minToHm(e.min)),
      h('span', { class: 't' }, h('b', {}, e.n || 'Getränk'), h('small', {}, `${String(e.vol).replace('.', ',')} %${e.fed ? ' · mit Essen' : ''}`)),
      h('span', { class: 'tk-v' }, h('b', {}, `${r1(alcGrams(e.ml, e.vol))} g`), h('small', {}, st.isToday && absHours(iso, e.min) > st.nowH ? 'geplant' : 'Alkohol'))))) : h('p', { class: 'small muted' }, 'Noch nichts eingetragen.');
    return [
      h('div', { class: 'trk-sum' }, h('b', {}, alcFmt(st.isToday ? st.now : st.pk[1])), h('span', {}, st.isToday ? '‰ jetzt (Schätzung)' : '‰ Höchstwert (Schätzung)'), infoBtn('Alkohol', () => alcInfo(iso))),
      st.p.kg ? svgBox(alcChartSvg({ iso, doses: st.doses, nowH: st.nowH, p: st.p })) : h('p', { class: 'small muted' }, 'Für die Promille-Schätzung braucht die App dein Körpergewicht (Gewichtskarte oder „Ich → Schlaf & Körper“).'),
      h('div', { class: 'tk-stats' },
        h('div', {}, h('span', {}, st.isToday ? 'Heute getrunken' : 'Getrunken'), h('b', {}, `${r0(st.grams)} g Alkohol`)),
        h('div', {}, h('span', {}, 'Höchstwert'), h('b', {}, `${alcFmt(st.pk[1])} ‰${st.pk[1] > 0 ? ` · ${fmtHours(st.pk[0], iso)}` : ''}`))),
      h('div', { class: 'trk-acts' }, h('button', { class: 'chip', type: 'button', onclick: () => openAlcohol(iso) }, '+ Getränk')),
      rows,
      h('p', { class: 'small muted' }, 'Grobe Schätzung – nicht geeignet, um die Fahrtüchtigkeit zu beurteilen.')];
  } });
}

/** Eingabe: Vorlage oder eigene Werte, Uhrzeit, nüchtern / mit Essen; Vorschau mit Höchstwert und 0,0 ‰. */
export function openAlcohol(iso, entry = null) {
  const isToday = iso === isoDate();
  let cat = 'beer';
  const nowRounded = () => { const d = new Date(Math.round(Date.now() / 300000) * 300000); return minToHm(d.getHours() * 60 + d.getMinutes()); };
  const startMin = entry ? entry.min : hmToMin(isToday ? nowRounded() : '20:00');
  let fed = entry ? !!entry.fed : alcFedAuto(iso, startMin);
  let fedTouched = !!entry;
  const name = h('input', { class: 'input', type: 'text', placeholder: 'z. B. Helles', value: entry ? entry.n : '', 'aria-label': 'Bezeichnung' });
  const ml = h('input', { class: 'input', type: 'text', inputmode: 'decimal', value: entry ? entry.ml : '', 'aria-label': 'Menge in ml' });
  const vol = h('input', { class: 'input', type: 'text', inputmode: 'decimal', value: entry ? String(entry.vol).replace('.', ',') : '', 'aria-label': 'Alkohol in Vol-%' });
  const kc = h('input', { class: 'input', type: 'text', inputmode: 'decimal', value: entry && entry.kcal != null ? entry.kcal : '', 'aria-label': 'Energie in kcal' });
  const time = h('input', { class: 'input', type: 'time', value: minToHm(startMin), 'aria-label': 'Uhrzeit' });
  const cats = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Getränkeart' });
  const listBox = h('div', { class: 'card list caf-pick' });
  const fedSeg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Magen' });
  const fedHint = h('p', { class: 'small muted' });
  const prev = h('div', { class: 'caf-prev' });
  const saveBtn = h('button', { class: 'btn primary block', type: 'button' }, entry ? 'Speichern' : 'Eintragen');
  const base = alcDoses(iso).filter((d) => !entry || d.id !== entry.id);
  const p = alcParams(iso);
  const read = () => ({ ml: num(ml.value), vol: num(vol.value), kcal: num(kc.value), min: time.value ? hmToMin(time.value) : null, n: name.value.trim() });

  const drawFed = () => {
    fedSeg.replaceChildren(...[['Nüchtern', false], ['Mit / nach Essen', true]].map(([l, v]) => h('button', {
      type: 'button', role: 'radio', 'aria-checked': v === fed ? 'true' : 'false', onclick: () => { fed = v; fedTouched = true; drawFed(); preview(); }
    }, l)));
    fedHint.textContent = fedTouched ? '' : (fed ? 'Automatisch: In den 3 Stunden davor ist eine Mahlzeit im Journal.' : 'Automatisch: Keine Mahlzeit in den 3 Stunden davor im Journal.');
  };
  const preview = () => {
    const v = read();
    if (!fedTouched && v.min != null) { const f = alcFedAuto(iso, v.min); if (f !== fed) { fed = f; drawFed(); } }
    if (!v.ml || v.vol == null || v.min == null) {
      prev.replaceChildren(h('p', { class: 'small muted' }, 'Getränk wählen oder Menge und Vol-% eintragen.'));
      saveBtn.textContent = entry ? 'Speichern' : 'Eintragen';
      return;
    }
    const g = alcGrams(v.ml, v.vol);
    saveBtn.textContent = `${entry ? 'Speichern' : 'Eintragen'} · ${r1(g)} g Alkohol`;
    if (!p.kg) { prev.replaceChildren(h('p', { class: 'small muted' }, 'Ohne Körpergewicht keine Promille-Vorschau.')); return; }
    const tNew = absHours(iso, v.min);
    const plan = base.concat([{ t: tNew, g, fed }]).sort((a, b) => a.t - b.t);
    const pk = alcPeak(plan, tNew, tNew + 24, p);
    const sob = alcSober(plan, tNew, p);
    prev.replaceChildren(svgBox(alcChartSvg({ iso, doses: base, plan, nowH: isToday ? Date.now() / 36e5 : null, p, h: 108 })),
      h('p', { class: 'small' }, 'Höchstwert ca. ', h('b', {}, `${alcFmt(pk[1])} ‰`), ` um ${fmtHours(pk[0], iso)}`, sob ? ' · 0,0 ‰ ab ' : '', sob ? h('b', {}, fmtHours(sob, iso)) : null, ' (Schätzung)'));
  };
  const drawCats = () => cats.replaceChildren(...ALC_CATS.map(([k, l]) => h('button', {
    type: 'button', role: 'radio', 'aria-checked': k === cat ? 'true' : 'false', onclick: () => { cat = k; drawCats(); drawList(); }
  }, l)));
  const drawList = () => {
    const items = ALC_DRINKS.filter((d) => d.c === cat);
    listBox.replaceChildren(...(cat === 'custom'
      ? [h('p', { class: 'small muted', style: 'padding:12px 14px;margin:0' }, 'Eigenes Getränk: Menge, Vol-% (Etikett) und kcal unten eintragen.')]
      : items.map((d) => h('button', { class: 'row', type: 'button',
        onclick: () => { name.value = `${d.n} ${d.ml >= 100 ? `${d.ml} ml` : alcMl(d.ml)}`; // ohne Komma: Mahlzeit-Zusammenfassung kürzt am Komma
           ml.value = d.ml; vol.value = String(d.vol).replace('.', ','); kc.value = Math.round((d.ml * d.k100) / 100); preview(); } },
        h('span', { class: 't' }, h('b', {}, d.n), h('small', {}, alcMl(d.ml))), h('span', { class: 'tk-v' }, h('b', {}, `${String(d.vol).replace('.', ',')} %`))))));
  };
  for (const el of [ml, vol, time]) { el.addEventListener('input', preview); el.addEventListener('change', preview); }
  const when = isToday ? h('div', { class: 'chips' }, ...[['Jetzt', 0], ['vor 30 min', -30], ['vor 1 h', -60], ['+1 h', 60]].map(([l, m]) => h('button', {
    class: 'chip', type: 'button', onclick: () => { const d = new Date(Date.now() + m * 60000); time.value = minToHm(d.getHours() * 60 + d.getMinutes()); preview(); }
  }, l))) : null;

  let sheet = null;
  saveBtn.addEventListener('click', () => {
    const v = read();
    try {
      saveAlcohol(iso, { id: entry ? entry.id : null, min: v.min ?? -1, ml: v.ml, vol: v.vol ?? -1, kcal: v.kcal, n: v.n, fed });
      toast(entry ? 'Gespeichert' : 'Eingetragen');
      sheet.close();
      if (!entry && isFirstOfDay(iso)) setTimeout(alcWarnInfo, 250); // Warnhinweis beim ersten Getränk des Tages
    } catch (e) { toast(e.message, { error: true }); }
  });
  const del = entry ? h('button', { class: 'btn block danger-text', type: 'button', onclick: () => {
    const gone = removeAlcohol(iso, entry.id); sheet.close();
    toast('Gelöscht', { action: { label: 'Rückgängig', onClick: () => saveAlcohol(iso, gone) } });
  } }, 'Eintrag löschen') : null;

  drawCats(); drawList(); drawFed(); preview();
  sheet = openSheet(h('div', { class: 'caf-sheet' },
    cats, listBox,
    h('label', { class: 'form-label' }, h('span', {}, 'Bezeichnung'), name),
    h('div', { class: 'two' }, h('label', { class: 'form-label' }, h('span', {}, 'Menge (ml)'), ml), h('label', { class: 'form-label' }, h('span', {}, 'Alkohol (Vol-%)'), vol)),
    h('div', { class: 'two' }, h('label', { class: 'form-label' }, h('span', {}, 'Energie (kcal)'), kc), h('label', { class: 'form-label' }, h('span', {}, 'Uhrzeit'), time)),
    when,
    h('span', { class: 'label' }, 'Magen'), fedSeg, fedHint,
    prev, saveBtn, del), { title: entry ? 'Getränk bearbeiten' : 'Alkohol eintragen', full: true });
}
