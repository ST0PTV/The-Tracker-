// „Ich → Gewichtsziel“: Bedarf, Zielgewicht, Tempo, Übernehmen als Kalorienziel.
// Nach wgSettingsHtml/wgSettingsBind und den INFO-Texten im Calorie-Tracker 2.3.1 (ST0PTV, MIT).
// Änderungen sind ein Entwurf, gespeichert wird erst mit „Als Kalorienziel übernehmen“ (wie im Calorie-Tracker).
import { h } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { toast, pageHead } from '../../core/ui.js';
import { openInfo, infoBtn } from '../../core/info.js';
import { num, r1, fmt, isoDate, addDays } from '../../core/format.js';
import { getProfile, setProfile, getGoals, currentWeight, getWeightGoal, setWeightGoal, logWeight, weightLog, kcalFloor } from '../../core/profile.js';
import { WG_TEMPO, WG_PAL, WG_SRC, WG_KCAL_PER_KG, WG_REFS, wgOptions, wgPlan, wgMaint, wgBmrEst, wgPalTotal, wgDateFor, wgDateFmt, pct2, r10 } from './weightgoal.js';
import { wgCtx, applyCalorieGoal } from './weight.js';
import { openWeight } from './weight-card.js';

const signedK = (v) => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${fmt(Math.abs(v))}`;

export const wgInfo = () => openInfo({
  title: 'Gewichtsziel',
  body: ['Kalorienziel = Erhaltungsbedarf ± Energie für die gewünschte Gewichtsänderung. Gerechnet wird mit der Faustregel 7.700 kcal pro kg.',
    'Die Faustregel überschätzt die Änderung über längere Zeit, weil sich der Verbrauch mitverändert. Deshalb rechnet die App mit jedem neuen Gewicht neu, wenn „automatisch anpassen“ an ist. Datum und kcal sind Schätzungen; am verlässlichsten ist der Abgleich mit dem echten Verlauf über einige Wochen.'],
  points: [['Abnehmen', 'höchstens 1 % des Gewichts pro Woche (NHS: 0,5–1 kg); „Empfohlen“ = 0,75 %'], ['Zunehmen', 'höchstens 0,5 % pro Woche; „Empfohlen“ = 0,35 %'], ['Untergrenze', 'Frauen 1.200, Männer 1.500 kcal pro Tag – darunter nur mit fachlicher Begleitung']],
  src: WG_REFS.slice(0, 5)
});
const srcInfo = () => openInfo({
  title: 'Tagesbedarf',
  body: ['Der Erhaltungsbedarf ist, was du an einem Tag verbrauchst. Drei Wege:'],
  points: [['Von der Uhr', 'Ø „Kalorien gesamt“ (Ruhe + aktiv) über einige Wochen, von Hand eingetragen. Uhren schätzen den Verbrauch oft zu hoch.'], ['Grundumsatz', 'Ruhekalorien der Uhr mal Aktivitätsfaktor (PAL).'], ['Schätzen', 'Grundumsatz aus Gewicht, Alter und Geschlecht (DGE-Formel) mal PAL. Ein Mittelwert für viele Menschen – im Einzelfall oft 10 % und mehr daneben.']],
  src: WG_REFS.slice(5)
});
const palInfo = () => openInfo({
  title: 'Aktivität (PAL)',
  body: ['Der PAL-Wert (physical activity level) beschreibt die Alltagsaktivität: Gesamtbedarf = Grundumsatz × PAL.'],
  points: [['1,4', 'überwiegend sitzend, z. B. Büro'], ['1,6', 'sitzend, zeitweise gehend oder stehend'], ['1,8', 'überwiegend gehend oder stehend'], ['2,0+', 'körperlich anstrengende Arbeit'], ['+0,3', 'Sport 4–5× pro Woche je 30–60 min']],
  src: [['DGE', null]]
});

function check(label, on, set) {
  const inp = h('input', { type: 'checkbox', 'aria-label': label });
  inp.checked = !!on;
  inp.addEventListener('change', () => set(inp.checked));
  return h('label', { class: 'check-row' }, inp, h('span', {}, label));
}
const field = (label, input, extra = null) => h('label', { class: 'form-label' }, h('span', {}, label, extra), input);

export function wgoalView(rerender) {
  const o = getWeightGoal();
  const today = isoDate();
  // Entwurf (wie im Calorie-Tracker): Bedarf vorbelegt mit dem aktuellen Kalorienziel
  const d = { src: o.src || 'watch', maint: o.maint ?? getGoals()?.goal ?? null, bmr: o.bmr, pal: o.pal || 1.4, sport: !!o.sport,
    tempo: o.tempo || 'rec', date: o.date, target: o.target, auto: o.auto };
  let birth = getProfile().birthYear;
  const ctx = () => ({ ...wgCtx(today), age: birth ? new Date().getFullYear() - birth : null });
  const w = currentWeight(today);

  const srcSeg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Tagesbedarf' });
  const srcBox = h('div', {});
  const maintOut = h('div', {});
  const planBox = h('div', { class: 'wg-plan' });
  const targetIn = h('input', { class: 'input', type: 'text', inputmode: 'decimal', value: d.target != null ? r1(d.target) : '', placeholder: 'z. B. 72', 'aria-label': 'Zielgewicht' });
  targetIn.addEventListener('input', () => { d.target = num(targetIn.value); draw(); });

  // Slider 1,2–2,2 in 0,05-Schritten; Beschriftungen darunter springen auf den Wert. Beim Ziehen nur die Anzeige
  // und die Rechnung neu zeichnen (nicht die ganze Quelle), damit der Griff nicht abreißt.
  const PAL_MIN = 1.2, PAL_MAX = 2.2;
  const palFmt = (v) => v.toFixed(2).replace(/0$/, '').replace('.', ',');
  const palLabel = (v) => (v < 1.5 ? 'sitzend' : v < 1.7 ? 'gemischt' : v < 1.9 ? 'viel auf den Beinen' : 'körperlich schwer');
  function palSlider() {
    const val = h('b', { class: 'pal-val' });
    const txt = h('span', { class: 'pal-txt' });
    const rng = h('input', { class: 'range', type: 'range', min: PAL_MIN, max: PAL_MAX, step: 0.05, value: d.pal, 'aria-label': 'Aktivität im Alltag (PAL)' });
    const paint = () => {
      val.textContent = palFmt(d.pal); txt.textContent = palLabel(d.pal);
      rng.style.setProperty('--fill-pct', `${((d.pal - PAL_MIN) / (PAL_MAX - PAL_MIN)) * 100}%`);
      rng.setAttribute('aria-valuetext', `${palFmt(d.pal)}, ${palLabel(d.pal)}`);
    };
    rng.addEventListener('input', () => { d.pal = Math.round(Number(rng.value) * 100) / 100; paint(); draw(); });
    const marks = h('div', { class: 'pal-marks' }, ...WG_PAL.map(([v, l]) => h('button', { type: 'button', class: 'pal-mark', onclick: () => { d.pal = v; rng.value = v; paint(); draw(); } },
      h('b', {}, `${palFmt(v)}${v === 2 ? '+' : ''}`), h('span', {}, l))));
    paint();
    return h('div', { class: 'pal' }, h('div', { class: 'pal-head' }, val, txt), rng, marks);
  }

  const drawSrc = () => {
    srcSeg.replaceChildren(...WG_SRC.map(([k, l]) => h('button', { type: 'button', role: 'radio', 'aria-checked': d.src === k ? 'true' : 'false', onclick: () => { d.src = k; drawSrc(); draw(); } }, l)));
    const pal = [
      h('span', { class: 'label' }, 'Aktivität im Alltag', infoBtn('Aktivität', palInfo)),
      palSlider(),
      check('Sport 4–5× pro Woche (+0,3)', d.sport, (v) => { d.sport = v; draw(); })];
    const numIn = (key, label, ph) => { const i = h('input', { class: 'input', type: 'text', inputmode: 'numeric', value: d[key] ?? '', placeholder: ph, 'aria-label': label }); i.addEventListener('input', () => { d[key] = num(i.value); draw(); }); return field(label, i); };
    if (d.src === 'watch') {
      srcBox.replaceChildren(numIn('maint', 'Ø Gesamtverbrauch der letzten Wochen (kcal/Tag)', 'z. B. 2500'),
        h('p', { class: 'small muted' }, 'Bei Garmin: „Kalorien gesamt“ (Ruhe + aktiv), nicht nur „Ruhekalorien“.'));
    } else if (d.src === 'bmr') {
      srcBox.replaceChildren(numIn('bmr', 'Grundumsatz laut Uhr (kcal/Tag)', 'z. B. 1650'), ...pal);
    } else {
      const p = getProfile();
      const by = h('input', { class: 'input', type: 'text', inputmode: 'numeric', value: birth ?? '', placeholder: 'z. B. 1995', 'aria-label': 'Geburtsjahr' });
      by.addEventListener('input', () => { const v = num(by.value); birth = v >= 1900 && v <= new Date().getFullYear() - 14 ? v : null; draw(); });
      srcBox.replaceChildren(field('Geburtsjahr', by),
        h('p', { class: 'small muted' }, `${w ? `${r1(w)} kg` : 'Gewicht fehlt'} · ${p.sex === 'm' ? 'Mann' : p.sex === 'f' ? 'Frau' : 'ohne Geschlecht (Mittelwert beider Formeln)'} · `,
          h('a', { class: 'link', href: '#/ich/koerper' }, 'unter „Schlaf & Körper“ ändern')), ...pal);
    }
  };

  const draw = () => {
    const c = ctx();
    const maint = wgMaint(d, w, c);
    const out = [];
    const base = d.src === 'bmr' ? d.bmr : wgBmrEst(w, c.sex, c.age);
    maintOut.replaceChildren(...(d.src !== 'watch' && maint ? [h('p', { class: 'small' }, 'Erhaltungsbedarf ≈ ', h('b', {}, `${fmt(maint)} kcal`), h('span', { class: 'muted' }, ` (${fmt(base)} × ${String(wgPalTotal(d)).replace('.', ',')})`))] : []));
    if (!w) out.push(h('p', { class: 'small muted' }, 'Aktuelles Körpergewicht fehlt. ', h('button', { class: 'link', type: 'button', onclick: () => openWeight(today) }, 'Gewicht eintragen')));
    else if (!maint) out.push(h('p', { class: 'small muted' }, d.src === 'est' && c.age == null ? 'Für die Schätzung bitte das Geburtsjahr eintragen.' : 'Bitte deinen Bedarf eintragen.'));
    else if (!d.target) out.push(h('p', { class: 'small muted' }, 'Zielgewicht eintragen.'));
    else {
      const opts = wgOptions(w, d, c);
      if (opts.keep) out.push(h('div', { class: 'kv' }, h('span', {}, 'Kalorienziel (Gewicht halten)'), h('b', {}, `${fmt(r10(maint))} kcal`)));
      else {
        const tempo = d.tempo === 'custom' || WG_TEMPO.some(([k]) => k === d.tempo) ? d.tempo : 'rec';
        out.push(h('p', { class: 'small muted' }, `Tempo (${r1(Math.abs(opts.dkg))} kg ${opts.dir === 'lose' ? 'abnehmen' : 'zunehmen'})`),
          h('div', { class: 'card list wg-opts', role: 'radiogroup', 'aria-label': 'Tempo' },
            ...opts.list.map((x) => h('button', { type: 'button', class: 'row wg-opt', role: 'radio', 'aria-checked': tempo === x.k ? 'true' : 'false', onclick: () => { d.tempo = x.k; draw(); } },
              h('span', { class: 'wg-rad', 'aria-hidden': 'true' }),
              h('span', { class: 't' }, h('b', {}, x.l), h('small', {}, `${pct2(x.pct)} %/Woche${x.k === 'fast' ? ' · Obergrenze' : ''} · bis ${wgDateFmt(x.date)} · ${Math.round(x.days / 7)} Wochen`)),
              h('span', { class: `tk-v${x.low ? ' warn' : ''}` }, h('b', {}, `${signedK(r10(x.perDay))} kcal`)))),
            h('button', { type: 'button', class: 'row wg-opt', role: 'radio', 'aria-checked': tempo === 'custom' ? 'true' : 'false', onclick: () => { d.tempo = 'custom'; draw(); } },
              h('span', { class: 'wg-rad', 'aria-hidden': 'true' }), h('span', { class: 't' }, h('b', {}, 'Eigenes Datum')))));
        if (tempo === 'custom') {
          const di = h('input', { class: 'input', type: 'date', value: d.date || '', min: addDays(today, 7), 'aria-label': 'Zieldatum' });
          di.addEventListener('change', () => { d.date = di.value || null; draw(); });
          out.push(field('Zieldatum', di));
        }
      }
      const date = wgDateFor(w, d, c);
      const p = date ? wgPlan(w, { ...d, date }, c) : null;
      if (p && p.past) out.push(h('p', { class: 'small warn' }, 'Das Zieldatum liegt in der Vergangenheit.'));
      else if (p && !p.keep) {
        const g = getGoals();
        out.push(h('div', { class: 'kv wg-res' }, h('span', {}, 'Kalorienziel'), h('b', {}, `${fmt(p.goal)} kcal`)),
          h('p', { class: 'small muted' }, `${signedK(r10(p.perDay))} kcal am Tag · Bedarf ≈ ${fmt(p.maint)} kcal · ≈ ${r1(Math.abs(p.perDay) * 7 / WG_KCAL_PER_KG)} kg pro Woche · Zieldatum voraussichtlich ${wgDateFmt(date)}`),
          ...p.warn.map((x) => h('p', { class: 'small warn' }, x)));
        if (p.dkg > 0 && g?.preset !== 'muscle') out.push(h('p', { class: 'small muted' }, 'Tipp: Für Zunahme mit Krafttraining passt die Makro-Verteilung „Muskelaufbau“ (unter „Tagesziel“).'));
        if (p.dkg < 0 && g?.preset !== 'cut') out.push(h('p', { class: 'small muted' }, 'Tipp: Beim Abnehmen passt die Makro-Verteilung „Fettabbau“ (unter „Tagesziel“).'));
      }
    }
    planBox.replaceChildren(...out);
  };

  const apply = () => {
    const c = ctx();
    if (!w) { toast('Bitte zuerst das Körpergewicht eintragen.', { error: true }); return; }
    if (d.target == null || d.target < 30 || d.target > 300) { toast('Bitte ein Zielgewicht zwischen 30 und 300 kg eingeben.', { error: true }); return; }
    if (d.src === 'watch' && (d.maint == null || d.maint < 1000 || d.maint > 6000)) { toast('Bitte den Gesamtverbrauch (1.000–6.000 kcal) eingeben.', { error: true }); return; }
    if (d.src === 'bmr' && (d.bmr == null || d.bmr < 800 || d.bmr > 4000)) { toast('Bitte den Grundumsatz (800–4.000 kcal) eingeben.', { error: true }); return; }
    if (d.src === 'est' && !wgBmrEst(w, c.sex, c.age)) { toast('Für die Schätzung bitte das Geburtsjahr eintragen.', { error: true }); return; }
    const date = wgDateFor(w, d, c);
    if (!date) { toast('Bitte ein Zieldatum wählen.', { error: true }); return; }
    const p = wgPlan(w, { ...d, date }, c);
    if (!p || p.past) { toast('Bitte ein Datum in der Zukunft wählen.', { error: true }); return; }
    if (d.src === 'est' && birth !== getProfile().birthYear) setProfile({ birthYear: birth });
    // Gewicht nur aus dem Profil (noch kein eigener Eintrag): als heutigen Wert in den Verlauf übernehmen
    if (!weightLog().some((e) => !e.demo)) logWeight(today, w);
    setWeightGoal({ ...d, date, on: true });
    applyCalorieGoal(p.goal, today);
    toast(`Kalorienziel ab heute ${fmt(p.goal)} kcal${p.warn.length ? ' – Grenze beachten' : ''}`);
    rerender();
  };

  drawSrc(); draw();
  const floor = kcalFloor(getProfile().sex);
  return h('div', {},
    h('a', { class: 'back', href: '#/ich' }, icon('chevron', { size: 16, cls: 'flip' }), 'Ich'),
    pageHead('Gewichtsziel', 'Rechnet das Kalorienziel aus Zielgewicht und Tempo. Gilt ab heute.'),
    o.on ? h('section', { class: 'card' },
      h('div', { class: 'kv' }, h('span', {}, 'Aktiv'), h('b', {}, `${r1(o.target)} kg · voraussichtlich ${o.date ? wgDateFmt(o.date) : '–'}`)),
      check('Bei neuem Gewicht automatisch anpassen', o.auto, (v) => setWeightGoal({ auto: v })),
      h('button', { class: 'btn block', type: 'button', onclick: () => { setWeightGoal({ on: false }); toast('Gewichtsziel aus. Das Kalorienziel bleibt, bis du es änderst.'); rerender(); } }, 'Gewichtsziel ausschalten')) : null,
    h('section', { class: 'card' },
      h('div', { class: 'card-head' }, h('h2', {}, '1 · Dein Tagesbedarf'), infoBtn('Tagesbedarf', srcInfo)),
      srcSeg, srcBox, maintOut),
    h('section', { class: 'card' },
      h('div', { class: 'card-head' }, h('h2', {}, '2 · Zielgewicht'), infoBtn('Gewichtsziel', wgInfo)),
      h('p', { class: 'small muted' }, w ? `Aktuell ${r1(w)} kg · ` : '', h('button', { class: 'link', type: 'button', onclick: () => openWeight(today) }, 'Gewicht eintragen')),
      field('Zielgewicht (kg)', targetIn), planBox),
    h('button', { class: 'btn primary block', type: 'button', onclick: apply }, o.on ? 'Neu berechnen und übernehmen' : 'Als Kalorienziel übernehmen'),
    h('section', { class: 'card' },
      check('Gewichtskarte unter „Heute“ anzeigen', o.card, (v) => setWeightGoal({ card: v })),
      h('p', { class: 'small muted' }, `Untergrenze ohne fachliche Begleitung: ${fmt(floor)} kcal pro Tag. Die App rechnet nie darunter.`)));
}
