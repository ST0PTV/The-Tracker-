// „Ich → Tagesziel“ (0.5.1): Ziel ab einem Datum, Vorlage oder eigene g/kg, Ballaststoffe und Zucker von Hand,
// Bereichsprüfungen und Liste früherer Ziele mit Löschen. Nach dem Ziel-Editor im Calorie-Tracker (app.js, ST0PTV, MIT).
// Ziele liegen nur in core/profile.js (Historie wie goalHistory im Calorie-Tracker): ein Tag nutzt das letzte Ziel mit
// from ≤ Tag. Formular legt einen Eintrag an, darum mit „Speichern“ (Muster in core/setui.js).
import { h } from '../../core/util.js';
import { pageHead, toast } from '../../core/ui.js';
import { icon } from '../../core/icons.js';
import { getGoals, getProfile, setGoal, macrosFrom, fatCheck, fiberSugarFrom, kcalFloor, PRESETS, getWeightGoal, currentWeight,
  goalHistory, removeGoal, restoreGoal, todayISO } from '../../core/profile.js';
import { backLink, sec, list, note } from '../../core/setui.js';
import { fmt, r1, num, addDays } from '../../core/format.js';

// Bereiche (Plausibilität, keine Empfehlung): kcal wie bisher; g/kg nach den Spannen der Vorlagen mit Puffer
export const GOAL_RANGE = { kcal: [800, 6000], pf: [0.6, 3], ff: [0.5, 2], fiber: [10, 80], sugar: [5, 200] };

/** Prüft ein Ziel-Formular. Gibt eine Fehlermeldung oder null zurück. Rein (Tests). */
export function checkGoalForm({ kcal, preset, pf, ff, weight, fiber, sugar, from, today }) {
  const R = GOAL_RANGE;
  const de = (x) => String(x).replace('.', ',');
  if (!(kcal >= R.kcal[0] && kcal <= R.kcal[1])) return 'Bitte ein Kalorienziel zwischen 800 und 6.000 eintragen.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from || '')) return 'Bitte ein Datum für „Gilt ab“ wählen.';
  if (from > addDays(today, 365)) return '„Gilt ab“ höchstens ein Jahr im Voraus.';
  if (preset === 'custom') {
    if (!(pf >= R.pf[0] && pf <= R.pf[1])) return `Eiweiß bitte zwischen ${de(R.pf[0])} und ${de(R.pf[1])} g pro kg.`;
    if (!(ff >= R.ff[0] && ff <= R.ff[1])) return `Fett bitte zwischen ${de(R.ff[0])} und ${de(R.ff[1])} g pro kg.`;
    if (weight > 0 && !macrosFrom(kcal, weight, pf, ff)) return 'Eiweiß und Fett brauchen mehr kcal als das Ziel hat. Bitte Faktoren senken oder kcal erhöhen.';
  }
  if (fiber != null && !(fiber >= R.fiber[0] && fiber <= R.fiber[1])) return 'Ballaststoffe bitte zwischen 10 und 80 g.';
  if (sugar != null && !(sugar >= R.sugar[0] && sugar <= R.sugar[1])) return 'Zucker bitte zwischen 5 und 200 g.';
  return null;
}

const longDate = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });

export function goalView(rerender) {
  const today = todayISO();
  const g = getGoals() || {};
  const p = getProfile();
  const w = currentWeight(today);
  let preset = g.preset && PRESETS[g.preset] ? g.preset : 'dge';
  const own = g.fiber != null && g.goal && (g.fiber !== fiberSugarFrom(g.goal).fiber || g.sugar !== fiberSugarFrom(g.goal).sugar);
  const floor = kcalFloor(p.sex);
  const floorNote = h('p', { class: 'warn small', hidden: true });
  const input = (label, value, ph, mode = 'numeric') => h('input', { class: 'cfg-in', type: 'text', inputmode: mode, value: value ?? '', placeholder: ph, 'aria-label': label });
  const kcalIn = input('Kalorienziel', g.goal, 'z. B. 2200');
  const fromIn = h('input', { class: 'cfg-in cfg-date', type: 'date', value: today, max: addDays(today, 365), 'aria-label': 'Gilt ab' });
  const pfIn = input('Eiweiß pro kg', r1(g.preset === 'custom' ? g.pf : 1.2), '1,2', 'decimal');
  const ffIn = input('Fett pro kg', r1(g.preset === 'custom' ? g.ff : 1.0), '1,0', 'decimal');
  const fibIn = input('Ballaststoffe', own ? g.fiber : '', '30');
  const sugIn = input('Zucker', own ? g.sugar : '', '');
  const ownBox = h('input', { type: 'checkbox', role: 'switch', class: 'cfg-sw', 'aria-label': 'Ballaststoffe und Zucker selbst festlegen' });
  ownBox.checked = !!own;
  const preview = h('div', { class: 'stats' });
  const macroNote = h('p', { class: 'cfg-note' });
  const fsNote = h('p', { class: 'cfg-note' });
  const fromNote = h('p', { class: 'cfg-note' });
  const seg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Makro-Verteilung' });
  const customRows = h('div', { class: 'gl-custom' },
    h('label', { class: 'cfg-row' }, h('span', { class: 't' }, h('b', {}, 'Eiweiß'), h('small', {}, 'Gramm pro kg Körpergewicht')), h('span', { class: 'cfg-val' }, pfIn, h('span', { class: 'cfg-unit' }, 'g/kg'))),
    h('label', { class: 'cfg-row' }, h('span', { class: 't' }, h('b', {}, 'Fett'), h('small', {}, 'Gramm pro kg Körpergewicht')), h('span', { class: 'cfg-val' }, ffIn, h('span', { class: 'cfg-unit' }, 'g/kg'))));
  const fsRows = h('div', {},
    h('label', { class: 'cfg-row' }, h('span', { class: 't' }, h('b', {}, 'Ballaststoffe'), h('small', {}, 'mindestens')), h('span', { class: 'cfg-val' }, fibIn, h('span', { class: 'cfg-unit' }, 'g'))),
    h('label', { class: 'cfg-row' }, h('span', { class: 't' }, h('b', {}, 'Freier Zucker'), h('small', {}, 'höchstens')), h('span', { class: 'cfg-val' }, sugIn, h('span', { class: 'cfg-unit' }, 'g'))));

  const factors = () => (preset === 'custom' ? { pf: num(pfIn.value), ff: num(ffIn.value) } : { pf: PRESETS[preset].pf, ff: PRESETS[preset].ff });
  const update = () => {
    // Untergrenze: nur Hinweis, kein Sperren (Faustregel; Ziel bleibt die eigene Entscheidung)
    const kc = num(kcalIn.value);
    floorNote.hidden = !(kc > 0 && kc < floor);
    floorNote.textContent = `Unter ${fmt(floor)} kcal pro Tag nur mit ärztlicher oder ernährungstherapeutischer Begleitung${p.sex ? '' : ' (Frauen 1.200, Männer 1.500 kcal; ohne Angabe gilt 1.200)'}.`;
    seg.replaceChildren(...Object.entries(PRESETS).map(([k, P]) =>
      h('button', { type: 'button', role: 'radio', 'aria-checked': k === preset ? 'true' : 'false', onclick: () => { preset = k; update(); } }, P.label)));
    customRows.hidden = preset !== 'custom';
    const f = factors();
    const m = macrosFrom(kc, w, f.pf, f.ff);
    const stat = (label, v) => h('div', { class: 'stat' }, h('b', {}, v == null ? '–' : `${fmt(v)} g`), h('span', {}, label));
    preview.replaceChildren(stat('Eiweiß', m?.protein), stat('Kohlenhydrate', m?.carbs), stat('Fett', m?.fat));
    const fc = m ? fatCheck(preset, m.fatPct) : null;
    macroNote.textContent = !w
      ? 'Für die Makros braucht die App dein Gewicht (unter „Schlaf & Körper“).'
      : !kc ? 'Kalorienziel eintragen, dann rechne ich die Makros.'
        : !m ? 'Eiweiß und Fett brauchen mehr kcal als das Ziel hat.'
          : `Fett ${m.fatPct} % der Energie${fc === 0 ? ' – im empfohlenen Bereich.' : fc === 1 ? ' – über dem empfohlenen Bereich.' : fc === -1 ? ' – unter dem empfohlenen Bereich.' : '.'}`;
    fsRows.hidden = !ownBox.checked;
    const auto = fiberSugarFrom(kc);
    fsNote.textContent = ownBox.checked
      ? 'Eigene Werte gelten nur für dieses Ziel.'
      : `Automatisch: mindestens ${auto.fiber} g Ballaststoffe (DGE)${auto.sugar ? `, höchstens ${auto.sugar} g freier Zucker (10 % der kcal, WHO)` : ''}.`;
    const fr = fromIn.value;
    fromNote.textContent = fr && fr < today ? `Gilt rückwirkend: Tage ab ${longDate(fr)} rechnen mit diesem Ziel.` : fr > today ? `Bis dahin gilt das bisherige Ziel.` : 'Ab heute. Frühere Tage behalten ihr Ziel.';
  };
  [kcalIn, pfIn, ffIn].forEach((el) => el.addEventListener('input', update));
  fromIn.addEventListener('change', update);
  ownBox.addEventListener('change', update);
  update();

  const save = () => {
    const kcal = num(kcalIn.value), f = factors();
    const fiber = ownBox.checked ? num(fibIn.value) : null, sugar = ownBox.checked ? num(sugIn.value) : null;
    const err = checkGoalForm({ kcal, preset, ...f, weight: w, fiber: ownBox.checked ? fiber ?? -1 : null, sugar: ownBox.checked && sugIn.value.trim() ? sugar ?? -1 : null, from: fromIn.value, today });
    if (err) { toast(err, { error: true }); return; }
    setGoal({ from: fromIn.value, goal: kcal, preset, ...(preset === 'custom' ? f : {}), weight: w,
      ...(ownBox.checked ? { fiber, ...(sugIn.value.trim() ? { sugar } : {}) } : {}) });
    toast(fromIn.value === today ? 'Ziel gespeichert' : `Ziel ab ${longDate(fromIn.value)} gespeichert`);
    location.hash = '#/ich';
  };

  // Frühere und geplante Ziele, neueste zuerst; Löschen mit „Rückgängig“
  const hist = goalHistory().slice().reverse();
  const cur = getGoals();
  const histRows = hist.map((x) => h('div', { class: 'cfg-row gl-hist' },
    h('span', { class: 't' }, h('b', {}, `${fmt(x.goal)} kcal · ${PRESETS[x.preset]?.label || 'Eigene'}`),
      h('small', {}, `${x.from > today ? 'geplant ab' : 'ab'} ${longDate(x.from)}${cur && cur.from === x.from ? ' · gilt jetzt' : ''}${x.protein != null ? ` · E ${fmt(x.protein)} · KH ${fmt(x.carbs)} · F ${fmt(x.fat)} g` : ''}`)),
    h('button', { class: 'icon-btn sm gl-del', type: 'button', 'aria-label': `Ziel ab ${longDate(x.from)} löschen`,
      onclick: () => { const gone = removeGoal(x.from); rerender(); toast('Ziel gelöscht', { action: { label: 'Rückgängig', onClick: () => { restoreGoal(gone); rerender(); } } }); } },
    icon('trash', { size: 16 }))));

  return h('div', {},
    backLink(),
    pageHead('Tagesziel', 'Rezepte, Wochenplan und Analyse rechnen mit dem Ziel, das am jeweiligen Tag gilt.'),
    getWeightGoal().on
      ? h('p', { class: 'hint small' }, 'Das Kalorienziel kommt gerade aus dem Gewichtsziel. Ein eigenes Ziel hier gilt, bis du das nächste Gewicht einträgst (bei „automatisch anpassen“). ', h('a', { class: 'link', href: '#/ich/gewichtsziel' }, 'Gewichtsziel öffnen'))
      : null,
    sec('Kalorien'),
    list(h('label', { class: 'cfg-row' }, h('span', { class: 't' }, h('b', {}, 'Kalorien pro Tag')), h('span', { class: 'cfg-val' }, kcalIn, h('span', { class: 'cfg-unit' }, 'kcal'))),
      h('label', { class: 'cfg-row' }, h('span', { class: 't' }, h('b', {}, 'Gilt ab')), h('span', { class: 'cfg-val' }, fromIn))),
    floorNote,
    fromNote,
    sec('Makro-Verteilung'),
    list(h('div', { class: 'cfg-pad' }, seg, preview), customRows),
    macroNote,
    sec('Ballaststoffe und Zucker'),
    list(h('label', { class: 'cfg-row' }, h('span', { class: 't' }, h('b', {}, 'Selbst festlegen')), ownBox), fsRows),
    fsNote,
    note(`Gewicht ${w != null ? `${r1(w)} kg` : 'fehlt'} · ${p.sex === 'm' ? 'Mann' : p.sex === 'f' ? 'Frau' : 'ohne Geschlecht'} – `,
      h('a', { href: '#/ich/koerper' }, 'unter „Schlaf & Körper“ ändern'),
      getWeightGoal().on ? null : ' · Kalorienziel lieber aus Zielgewicht und Tempo rechnen? ', getWeightGoal().on ? null : h('a', { href: '#/ich/gewichtsziel' }, 'Gewichtsziel')),
    h('button', { class: 'btn primary block cfg-save', type: 'button', onclick: save }, 'Speichern'),
    hist.length ? sec('Alle Ziele') : null,
    hist.length ? list(...histRows) : null,
    hist.length ? note('Ein Tag nutzt das letzte Ziel, das an ihm schon galt. Tage vor dem ersten Ziel nutzen das erste.') : null);
}
