// „Zyklus → Wissen“: Hormone, Schleim, Muttermund (Schema und Texte nach viewWissen/schemaChart in zyklus.js im
// Rezeptbuch, Copyright (c) 2026 JuliaKelp, MIT), dazu „Training“ und „Wann abklären“ aus „Research – Cycle-Aware
// Training“ (Drive, 2026-10-22). Alle Quellen am 2026-10-29 per PubMed bzw. auf der Originalseite geprüft; die Art der
// Prüfung steht in jeder Quelle. Texte wurden nach dem Abstract umformuliert, wo das Original anders lautet als die
// Vorlage (Drive → Sources 0.2.6, Unverified 0.2.6).
import { h } from '../../core/util.js';
import { isoDate } from '../../core/format.js';
import { cycleHead } from './cycle-views.js';
import { cycleActive, cycleAnalysis } from './cycle.js';
import { icon } from '../../core/icons.js';

// [Text, Link, Prüfung]
export const CYCLE_REFS = [
  ['Mihm M, Gangooly S, Muttukrishna S. The normal menstrual cycle in women. Anim Reprod Sci 124 (2011) 229–236.', 'https://pubmed.ncbi.nlm.nih.gov/20869180/', 'PubMed-Abstract'],
  ['Stricker R et al. Establishment of detailed reference values for LH, FSH, estradiol, and progesterone during different phases of the menstrual cycle. Clin Chem Lab Med 44 (2006) 883–887.', 'https://pubmed.ncbi.nlm.nih.gov/16776638/', 'PubMed-Abstract'],
  ['Anckaert E et al. Extensive monitoring of the natural menstrual cycle using the serum biomarkers estradiol, luteinizing hormone and progesterone. Pract Lab Med 25 (2021) e00211.', 'https://pubmed.ncbi.nlm.nih.gov/33869706/', 'PubMed-Abstract'],
  ['Bull JR et al. Real-world menstrual cycle characteristics of more than 600,000 menstrual cycles. npj Digit Med 2 (2019) 83.', 'https://pubmed.ncbi.nlm.nih.gov/31482137/', 'Volltext'],
  ['Baker FC, Siboza F, Fuller A. Temperature regulation in women: effects of the menstrual cycle. Temperature 7 (2020) 226–262.', 'https://pubmed.ncbi.nlm.nih.gov/33123618/', 'PubMed-Abstract'],
  ['Wilcox AJ, Weinberg CR, Baird DD. Timing of sexual intercourse in relation to ovulation. N Engl J Med 333 (1995) 1517–1521.', 'https://pubmed.ncbi.nlm.nih.gov/7477165/', 'PubMed-Abstract'],
  ['Najmabadi S et al. Cervical mucus patterns and the fertile window in women without known subfertility. Hum Reprod 36 (2021) 1784–1795.', 'https://pubmed.ncbi.nlm.nih.gov/33990841/', 'PubMed-Abstract'],
  ['Ecochard R et al. Self-identification of the clinical fertile window and the ovulation period. Fertil Steril 103 (2015) 1319–1325.', 'https://pubmed.ncbi.nlm.nih.gov/25724738/', 'PubMed-Abstract'],
  ['Fehring RJ. Methods used to self-predict ovulation. A comparative study. JOGNN 19 (1990) 233–237.', 'https://pubmed.ncbi.nlm.nih.gov/2358920/', 'PubMed-Abstract'],
  ['Bigelow JL et al. Mucus observations in the fertile window: a better predictor of conception than timing of intercourse. Hum Reprod 19 (2004) 889–892.', 'https://pubmed.ncbi.nlm.nih.gov/14990542/', 'PubMed-Abstract'],
  ['Parenteau-Carreau S, Infante-Rivard C. Self-palpation to assess cervical changes in relation to mucus and temperature. Int J Fertil 33 Suppl (1988) 10–16.', 'https://pubmed.ncbi.nlm.nih.gov/2902020/', 'PubMed-Abstract'],
  ['Munro MG, Critchley HOD, Fraser IS; FIGO. The two FIGO systems for normal and abnormal uterine bleeding symptoms … 2018 revisions. Int J Gynaecol Obstet 143 (2018) 393–408.', 'https://pubmed.ncbi.nlm.nih.gov/30198563/', 'Grenzwerte nur über Sekundärquelle (MSD Manual)'],
  ['McNulty KL et al. The effects of menstrual cycle phase on exercise performance in eumenorrheic women: a systematic review and meta-analysis. Sports Med 50 (2020) 1813–1827.', 'https://pubmed.ncbi.nlm.nih.gov/32661839/', 'PubMed-Abstract'],
  ['Colenso-Semple LM et al. Current evidence shows no influence of women’s menstrual cycle phase on acute strength performance or adaptations to resistance exercise training. Front Sports Act Living 5 (2023) 1054542.', 'https://pubmed.ncbi.nlm.nih.gov/37033884/', 'PubMed-Abstract'],
  ['D’Souza AC et al. Menstrual cycle phase-based resistance training. Med Sci Sports Exerc 58 (2026) 2255–2273.', 'https://pubmed.ncbi.nlm.nih.gov/42160459/', 'PubMed-Abstract'],
  ['Elliott-Sale KJ et al. The effects of oral contraceptives on exercise performance in women: a systematic review and meta-analysis. Sports Med 50 (2020) 1785–1812.', 'https://pubmed.ncbi.nlm.nih.gov/32666247/', 'PubMed-Abstract'],
  ['Armour M et al. Exercise for dysmenorrhoea. Cochrane Database Syst Rev 2019;9:CD004142.', 'https://pubmed.ncbi.nlm.nih.gov/31538328/', 'PubMed-Abstract'],
  ['Klein DA, Poth MA. Amenorrhea: an approach to diagnosis and management. Am Fam Physician 87 (2013) 781–788.', 'https://pubmed.ncbi.nlm.nih.gov/23939500/', 'PubMed-Abstract'],
  ['NICE NG88. Heavy menstrual bleeding: assessment and management.', 'https://www.nice.org.uk/guidance/ng88', 'Originalseite'],
  ['NHS. Vaginal bleeding between periods or after sex.', 'https://www.nhs.uk/symptoms/vaginal-bleeding-between-periods-or-after-sex/', 'Originalseite']
];

const TEXTS = {
  hormone: ['Was in den Phasen passiert', [
    ['Periode und frühe Follikelphase', 'Am Übergang vom alten zum neuen Zyklus steigt FSH an. FSH weckt eine Gruppe von Eibläschen (Follikeln) im Eierstock [1].'],
    ['Ein Follikel setzt sich durch', 'Etwa eine Woche vor dem Eisprung bildet ein führender Follikel immer mehr Östradiol [1].'],
    ['LH-Gipfel und Eisprung', 'Der steile Östradiol-Anstieg löst den LH-Anstieg aus, kurz darauf folgt der Eisprung [1]. Ein Eisprungtest misst dieses LH im Urin.'],
    ['Lutealphase', 'Aus dem Follikel wird der Gelbkörper. Er bildet Progesteron, am meisten etwa 6 bis 7 Tage nach dem Eisprung [1]. Ohne Schwangerschaft bildet er sich zurück, die Hormone fallen, und die nächste Periode beginnt.'],
    ['Wie lang die Phasen sind', 'In 612.613 Zyklen mit Eisprung (Daten einer Zyklus-App) dauerte die Follikelphase im Mittel 16,9 Tage, meist zwischen 10 und 30. Die Lutealphase war mit 12,4 Tagen (meist 7 bis 17) beständiger [4].'],
    ['Körpertemperatur', 'Nach dem Eisprung liegt die Körpertemperatur im Mittel 0,3 bis 0,7 °C höher, am deutlichsten im Schlaf oder direkt nach dem Aufwachen [5]. So lässt sich ein Eisprung im Nachhinein erkennen, nicht vorhersagen.']]],
  mucus: ['So verändert sich der Zervixschleim', [
    ['Vor dem Eisprung: mehr und flüssiger', 'Mit steigendem Östrogen wird der Schleim mehr und besser: von trocken über feucht und cremig bis glasig und dehnbar [7].'],
    ['Höhepunkt', 'Der letzte Tag mit bester Qualität heißt Höhepunkt (Peak-Tag). In einer kleinen Studie mit 20 Frauen lag der LH-Anstieg immer am Höhepunkt-Tag oder bis zu 3 Tage davor [9].'],
    ['Wie lange und wie verlässlich', 'In 2.488 Zyklen gab es im Mittel 6,4 Tage mit Schleim bester Qualität (Median 6). Bei 72 % der Frauen schwankte diese Zahl zwischen ihren Zyklen um mehr als 3 Tage [7]. Die Tage mit bestem Schleim trafen in 96 % der Fälle mindestens einen der fruchtbaren Tage [8].'],
    ['Schleim und Empfängnis', 'Je besser die Schleimqualität an einem Tag, desto höher war die Chance auf eine Schwangerschaft an diesem Tag [10].']]],
  cervix: ['So verändert sich der Muttermund', [
    ['Rund um den Eisprung', 'Um den Eisprung wird der Muttermund höher, weicher und offener, danach wieder tiefer, fester und geschlossen [11].'],
    ['Zeitlicher Ablauf', 'In 215 Zyklusblättern lag der fruchtbarste Muttermund im Mittel weniger als einen Tag neben dem Schleim-Höhepunkt (Spanne etwa 3 Tage davor bis 6 Tage danach). Der Wechsel zurück dauerte 1 bis 7 Tage, im Mittel 2,65 [11].'],
    ['Wie gut belegt', 'Zum Muttermund gibt es viel weniger Forschung als zu Schleim und Temperatur. Die Studie ist von 1988, und die Autorinnen nennen unerfahrene Anwenderinnen als Fehlerquelle [11].']]],
  training: ['Zyklus und Training', [
    ['Plane nicht nach Phasen', 'Kraft und Leistung schwanken über den Zyklus allenfalls trivial, am ehesten in der frühen Follikelphase [13]. Ob Hormonschwankungen Kraft oder Muskelaufbau beeinflussen, ist nicht belegt [14]. In einer Studie mit 24 Frauen brachte Training nach Zyklusphasen keinen Vorteil; entscheidend war die Trainingsmenge [15].'],
    ['Während der Periode', 'Trainiere normal, wenn es dir gut geht. Wenn Krämpfe, Müdigkeit oder starke Blutung stören, ist ein leichterer Tag eine gute Wahl. Das entscheidest du, nicht der Kalender.'],
    ['Regelschmerzen', 'Regelmäßige Bewegung über Wochen (etwa 45 bis 60 Minuten, mindestens dreimal pro Woche) war in Studien mit weniger Regelschmerzen verbunden; die Belege sind von niedriger Qualität [17]. Das heißt nicht, dass du an einem schmerzhaften Tag trainieren musst.'],
    ['Mit Pille', 'Mit der Pille war die Leistung in Studien allenfalls minimal geringer [16]. Phasen-Hinweise passen dann nicht, weil die Hormone gleichmäßig zugeführt werden.'],
    ['Was die App bewusst nicht tut', 'Keine Trainingspläne nach Phase, keine Warnung vor schwerem Training an bestimmten Tagen, keine Aussagen zum Verletzungsrisiko. Dafür ist die Datenlage zu schwach.']]],
  doctor: ['Wann abklären lassen', [
    ['Periode bleibt aus', 'Keine Periode seit 3 Monaten bei vorher regelmäßigem Zyklus oder seit 6 Monaten bei unregelmäßigem (ohne Schwangerschaft, Stillzeit oder Hormone) [18].'],
    ['Länge und Schwankung', 'Zyklen regelmäßig kürzer als 24 oder länger als 38 Tage, oder sie schwanken um mehr als 7 bis 9 Tage; eine Blutung länger als 8 Tage [12].'],
    ['Starke Blutung', 'Eine Blutung, die deinen Alltag stark einschränkt. Die Ärztin prüft dann meist auch das Blutbild auf Eisenmangel [19].'],
    ['Zwischenblutung', 'Blutung zwischen den Perioden oder nach dem Sex [20].'],
    ['Schmerzen', 'Regelschmerzen, die trotz üblicher Behandlung nicht besser werden, oder Schmerzen außerhalb der Periode oder beim Sex.'],
    ['Rasch', 'Periode ausgeblieben und dazu eine ungewöhnliche Blutung mit Bauchschmerzen: noch am selben Tag ärztlich abklären, weil es eine Schwangerschaft außerhalb der Gebärmutter sein kann [20].']]]
};
const NOTES = {
  hormone: 'Schema für einen 28-Tage-Zyklus. Jede Kurve ist auf ihren eigenen Höchstwert skaliert, die Höhen sind nicht vergleichbar. Form nach [1], [2] und [3].',
  mucus: 'Schema für einen 28-Tage-Zyklus nach [7] bis [9]. Bei dir können Länge und Reihenfolge abweichen.',
  cervix: 'Schema für einen 28-Tage-Zyklus nach [11]. Lage, Festigkeit und Öffnung sind zu einer Kurve zusammengefasst.'
};
const HORMONES = [
  { key: 'fsh', short: 'FSH', pts: [[-14, .62], [-11, .55], [-7, .42], [-3, .3], [-1, .45], [0, .7], [1, .45], [3, .28], [8, .22], [12, .32], [14, .6]] },
  { key: 'lh', short: 'LH', pts: [[-14, .26], [-8, .28], [-3, .32], [-1, .5], [0, 1], [1, .45], [3, .32], [8, .24], [14, .22]] },
  { key: 'e2', short: 'Östradiol', pts: [[-14, .14], [-9, .17], [-5, .35], [-2, .75], [-1, 1], [0, .8], [2, .4], [6, .58], [9, .62], [12, .45], [14, .18]] },
  { key: 'p4', short: 'Progesteron', pts: [[-14, .02], [-3, .02], [0, .06], [2, .3], [4, .68], [7, 1], [10, .72], [12, .45], [14, .08]] }
];

let tab = 'hormone';
const hidden = new Set();
const NS = 'http://www.w3.org/2000/svg';
const el = (t, at = {}, txt) => { const x = document.createElementNS(NS, t); for (const [k, v] of Object.entries(at)) x.setAttribute(k, String(v)); if (txt != null) x.textContent = txt; return x; };

function schemaChart(which, pos) {
  // x: LH-Gipfel = Tag 0; Periodenbeginn = −14, nächste Periode = +14
  const X = (d) => 8 + (d + 14) / 28 * 302;
  const Y = (v) => 186 - v * 156;
  const curve = (pts) => {
    const p = pts.map((q) => [X(q[0]), Y(q[1])]);
    let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, Math.min(186, p1[1] + (p2[1] - p0[1]) / 6)];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, Math.min(186, p2[1] - (p3[1] - p1[1]) / 6)];
      d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  };
  const s = el('svg', { viewBox: '0 0 318 250', width: '100%', class: 'cy-chart cy-schema', role: 'img', 'aria-label': `Schematischer Verlauf im Zyklus${pos === null ? '' : ', Linie bei heute'}` });
  s.append(el('rect', { x: X(-14).toFixed(1), y: 22, width: (X(-9) - X(-14)).toFixed(1), height: 170, class: 'zone-b' }));
  s.append(el('rect', { x: X(-5).toFixed(1), y: 22, width: (X(1) - X(-5)).toFixed(1), height: 170, class: 'zone-f' }));
  s.append(el('line', { x1: X(1).toFixed(1), y1: 22, x2: X(1).toFixed(1), y2: 192, class: 'ovu' }));
  s.append(el('text', { x: ((X(-14) + X(-9)) / 2).toFixed(1), y: 16, 'text-anchor': 'middle', class: 'lb b' }, 'Periode'));
  s.append(el('text', { x: X(1).toFixed(1), y: 16, 'text-anchor': 'middle', class: 'lb' }, 'Eisprung'));
  if (which === 'hormone') {
    HORMONES.filter((x) => !hidden.has(x.key)).forEach((x) => s.append(el('path', { d: curve(x.pts), class: `hc ${x.key}` })));
  } else if (which === 'mucus') {
    const lv = { '-9': 0, '-8': 0, '-7': 0, '-6': 0, '-5': 1, '-4': 1, '-3': 2, '-2': 2, '-1': 3, 0: 3, 1: 3 };
    const yl = [178, 147, 104, 61];
    let d = '';
    for (let i = -9; i <= 14; i++) { const y0 = yl[lv[i] ?? 0], x0 = X(i - 0.5) + 1, x1 = X(i + 0.5) - 1; d += `M${x0.toFixed(1)},186 L${x0.toFixed(1)},${y0} L${x1.toFixed(1)},${y0} L${x1.toFixed(1)},186 Z `; }
    [61, 104, 147].forEach((y) => s.append(el('line', { x1: 8, y1: y, x2: 310, y2: y, class: 'grid' })));
    s.append(el('path', { d, class: 'mbar' }));
    [['glasig, spinnbar', 56], ['cremig', 99], ['feucht', 142], ['trocken, nichts', 186]].forEach(([t, y]) => s.append(el('text', { x: 10, y, class: 'lb' }, t)));
  } else {
    const d = curve([[-14, .05], [-6, .05], [-4, .22], [-2, .58], [0, .88], [1.5, 1], [3, .45], [4.5, .08], [8, .05], [14, .05]]);
    s.append(el('path', { d: `${d} L${X(14).toFixed(1)},186 L${X(-14).toFixed(1)},186 Z`, class: 'carea' }), el('path', { d, class: 'cline' }));
    s.append(el('text', { x: 10, y: 38, class: 'lb' }, 'hoch, weich, offen'), el('text', { x: 10, y: 186, class: 'lb' }, 'tief, fest, geschlossen'));
  }
  if (pos !== null) s.append(el('line', { x1: X(pos).toFixed(1), y1: 22, x2: X(pos).toFixed(1), y2: 198, class: 'today' }), el('text', { x: X(pos).toFixed(1), y: 212, 'text-anchor': 'middle', class: 'lb b' }, 'heute'));
  s.append(el('line', { x1: 8, y1: 192, x2: 310, y2: 192, class: 'base' }));
  s.append(el('text', { x: 8, y: 208, class: 'ax' }, 'Tag 1'), el('text', { x: 310, y: 208, 'text-anchor': 'end', class: 'ax' }, 'nächste Periode'));
  s.append(el('text', { x: ((X(-14) + X(0.5)) / 2).toFixed(1), y: 236, 'text-anchor': 'middle', class: 'ph' }, 'Follikelphase'), el('text', { x: ((X(1) + X(14)) / 2).toFixed(1), y: 236, 'text-anchor': 'middle', class: 'ph' }, 'Lutealphase'));
  return s;
}

const TABS = [['hormone', 'Hormone'], ['mucus', 'Schleim'], ['cervix', 'Muttermund'], ['training', 'Training'], ['doctor', 'Abklären']];

export function knowledgeView(rerender) {
  const active = cycleActive();
  let pos = null;
  if (active) {
    const a = cycleAnalysis(isoDate());
    // Heute aufs 28-Tage-Schema legen: mit positivem LH-Test daran ausgerichtet, sonst nach Anteil am eigenen Zyklus
    if (a.last) pos = Math.max(-14, Math.min(14, a.ovu.sure ? a.dayNo - a.ovu.lo + 1 : -14 + (a.dayNo - 1) / Math.max(a.median, a.dayNo) * 28));
  }
  const [title, texts] = TEXTS[tab];
  const chart = ['hormone', 'mucus', 'cervix'].includes(tab);
  return h('div', { class: 'cy' },
    ...(active ? cycleHead('/zyklus/wissen') : [h('a', { class: 'back', href: '#/ich/zyklus' }, icon('chevron', { size: 16, cls: 'flip' }), 'Zyklus'), h('h1', {}, 'Wissen')]),
    h('div', { class: 'chips cy-tabs', role: 'tablist', 'aria-label': 'Thema' }, ...TABS.map(([k, l]) => h('button', {
      class: `chip${tab === k ? ' on' : ''}`, type: 'button', role: 'tab', 'aria-selected': tab === k ? 'true' : 'false', onclick: () => { tab = k; rerender(); } }, l))),
    chart ? h('section', { class: 'card cy-schema-card' },
      tab === 'hormone' ? h('div', { class: 'chips', role: 'group', 'aria-label': 'Kurven ein- und ausblenden' }, ...HORMONES.map((x) => h('button', {
        class: `chip cy-hchip ${x.key}${hidden.has(x.key) ? '' : ' on'}`, type: 'button', 'aria-pressed': hidden.has(x.key) ? 'false' : 'true',
        onclick: () => { if (hidden.has(x.key)) hidden.delete(x.key); else hidden.add(x.key); rerender(); } }, h('i', {}), x.short))) : null,
      schemaChart(tab, pos),
      h('div', { class: 'cy-leg' }, h('span', {}, h('i', { class: 'f' }), 'fruchtbare Tage [6]'), pos === null ? null : h('span', {}, h('i', { class: 'line' }), 'heute (grob eingeordnet)')),
      h('p', { class: 'small muted' }, NOTES[tab])) : null,
    h('section', { class: 'card cy-texts' }, h('h2', {}, title), ...texts.map(([t, p]) => h('div', {}, h('h3', {}, t), h('p', {}, p)))),
    h('p', { class: 'hint small' }, 'Das ist Wissen, keine Diagnose und keine Verhütung. Die Linie „heute“ legt deinen Tag nur grob auf das Lehrbuch-Schema; mit einem positiven Eisprungtest richtet die App sie danach aus.'),
    h('h3', { class: 'sec' }, 'Quellen'),
    h('section', { class: 'card' }, h('ol', { class: 'cy-refs small' }, ...CYCLE_REFS.map(([t, u, how]) => h('li', {}, `${t} `,
      h('a', { class: 'link', href: u, target: '_blank', rel: 'noopener' }, 'Quelle'), h('span', { class: 'muted' }, ` · geprüft: ${how}`))))));
}
