// Reiter „Ich“: gruppierte Liste mit Icon-Plaketten nach der Einstellungsseite des Calorie-Trackers (ST0PTV, MIT):
// Ziele · Über mich · Tracker · App. Unterseiten: Tagesziel, Gewichtsziel, Schlaf & Körper, Wasser, Supplements,
// Koffein, Alkohol, Quellen & Lizenzen.
import { h } from '../core/util.js';
import { pageHead, toast } from '../core/ui.js';
import { icon } from '../core/icons.js';
import * as store from '../core/store.js';
import { getGoals, getProfile, setGoal, macrosFrom, fatCheck, kcalFloor, PRESETS, getWeightGoal, loadDemoWeights, removeDemoWeights, getSleep, currentWeight } from '../core/profile.js';
import { getSettings, setSettings } from '../core/settings.js';
import { applyTheme, APPEARANCES } from '../core/theme.js';
import { VERSION } from '../core/version.js';
import { isoDate, addDays, r1 } from '../core/format.js';
import { loadFoods, foodsState } from './food/foods.js';
import { demoCount, loadDemo, removeDemo } from './journal/journal.js';
import { generateDemo, generateDemoDrinks, generateDemoWeights, generateDemoAlcohol, DEMO_GOAL } from './dev/demo.js';
import { loadDemoAlcohol, removeDemoAlcohol, ALC_REFS, alcSettings } from './drinks/alcohol.js';
import { wgoalView } from './goal/wgoal-view.js';
import { WG_REFS, wgDateFmt } from './goal/weightgoal.js';
import { bodyView } from './me/body-view.js';
import { prefsView } from './recipes/start-view.js';
import { dietForm, allergenCodes, rs as recipeSettings } from './recipes/recipes.js';
import { loadDemoWater, removeDemoWater, waterSettings } from './drinks/water.js';
import { loadDemoCaffeine, removeDemoCaffeine, CAFF_REFS, caffSettings } from './drinks/caffeine.js';
import { waterSettingsView, caffSettingsView, alcSettingsView } from './drinks/drinks-settings.js';
import { suppSettingsView } from './supp/supp-card.js';
import { suppSettings } from './supp/supplements.js';
import { cycleAvailable, cycleSettings, TRACK } from './cycle/cycle.js';
import { lockSettings } from '../core/lock.js';

const fmt = (n) => Math.round(n).toLocaleString('de-DE');

const litres = (ml) => (ml / 1000).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Zeile mit farbiger Icon-Plakette, Titel, Untertitel und Pfeil (Link) oder eigenem Inhalt rechts. */
const meRow = ({ kind, ico, title, sub, href, right = null }) => h(href ? 'a' : 'div', { class: `me-row k-${kind}`, ...(href ? { href } : {}) },
  h('span', { class: 'qa-badge' }, icon(ico, { size: 20 })),
  h('span', { class: 't' }, h('b', {}, title), sub ? h('small', {}, sub) : null),
  right || (href ? h('span', { class: 'qa-chev' }, icon('chevron', { size: 16 })) : null));
const group = (title, ...rows) => [h('h3', { class: 'sec' }, title), h('section', { class: 'card list me-grp' }, ...rows.filter(Boolean))];

function ichView(rerender) {
  const g = getGoals();
  const s = getSettings();
  const o = getWeightGoal();
  const sl = getSleep();
  const w = currentWeight(isoDate());
  const W = waterSettings(), C = caffSettings(), A = alcSettings(), S = suppSettings();
  const active = S.items.filter((x) => x.on).length;
  const fmtKg = (v) => r1(v);
  const cy = cycleSettings(), L = lockSettings();
  const p = getProfile();
  const appSeg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Darstellung' },
    ...APPEARANCES.map(([key, label]) => h('button', {
      type: 'button', role: 'radio', 'aria-checked': s.appearance === key ? 'true' : 'false',
      onclick: () => { setSettings({ appearance: key }); applyTheme(key); rerender(); }
    }, label)));
  return h('div', { class: 'me' },
    pageHead('Ich', 'Ziele, Tracker & Daten'),
    ...group('Ziele',
      meRow({ kind: 'goal', ico: 'target', title: 'Tagesziel', href: '#/ich/ziel', sub: g?.goal ? `${fmt(g.goal)} kcal · ${PRESETS[g.preset]?.label || ''}` : 'noch nicht festgelegt' }),
      meRow({ kind: 'wt', ico: 'trend', title: 'Gewichtsziel', href: '#/ich/gewichtsziel',
        sub: o.on && o.target ? `${w != null ? `${fmtKg(w)} → ` : ''}${fmtKg(o.target)} kg${o.date ? ` bis ${wgDateFmt(o.date)}` : ''}` : 'aus' })),
    ...group('Über mich',
      meRow({ kind: 'body', ico: 'moon', title: 'Schlaf & Körper', href: '#/ich/koerper', sub: `${sl.bed}–${sl.wake}${w != null ? ` · ${fmtKg(w)} kg` : ''}` }),
      meRow({ kind: 'food', ico: 'book', title: 'Ernährung & Rezepte', href: '#/ich/ernaehrung',
        sub: `${({ all: 'Alles', vegetarian: 'Vegetarisch', vegan: 'Vegan' })[dietForm()]}${allergenCodes().length ? ` · ${allergenCodes().length} ${allergenCodes().length === 1 ? 'Allergen' : 'Allergene'}` : ''} · ${recipeSettings().mealCount} Mahlzeiten` }),
      p.sex !== 'm' ? meRow({ kind: 'cyc', ico: 'drop', title: 'Zyklus', href: '#/ich/zyklus',
        sub: !cycleAvailable() ? 'aus · unter „Schlaf & Körper“ einschalten' : cy.on ? `Karte auf Heute · ${TRACK.filter(([k]) => cy.track[k]).length} von ${TRACK.length} getrackt` : 'Karte aus' }) : null),
    ...group('Tracker',
      meRow({ kind: 'water', ico: 'drop', title: 'Wasser', href: '#/ich/wasser', sub: W.enabled ? `${litres(W.goal || 1500)} l · Plus ${fmt(W.step || 250)} ml` : 'aus' }),
      meRow({ kind: 'supp', ico: 'pill', title: 'Supplements', href: '#/ich/supplements', sub: S.enabled ? (S.items.length ? `${active} aktiv` : 'noch keine angelegt') : 'aus' }),
      meRow({ kind: 'caf', ico: 'cup', title: 'Koffein', href: '#/ich/koffein', sub: C.enabled ? `an · Richtwert ${fmt(C.limit)} mg` : 'aus' }),
      meRow({ kind: 'alc', ico: 'glass', title: 'Alkohol', href: '#/ich/alkohol', sub: A.enabled ? `an · Abbau ${String(A.beta).replace('.', ',')} ‰/h` : 'aus' })),
    ...group('App',
      meRow({ kind: 'app', ico: 'palette', title: 'Darstellung', right: appSeg }),
      meRow({ kind: 'app', ico: 'lock', title: 'PIN-Sperre', href: '#/ich/sperre', sub: L.on ? (L.scope === 'app' ? 'an · ganze App' : 'an · nur Zyklus') : 'aus' }),
      meRow({ kind: 'app', ico: 'info', title: 'Quellen & Lizenzen', href: '#/ich/quellen', sub: 'Daten, Studien, übernommener Code' })),
    devCard(rerender),
    h('p', { class: 'me-foot' }, `The Tracker ${VERSION} · ${store.usageKB()} KB lokal gespeichert`));
}

// Entwicklung: Beispieldaten für einen Monat (erfunden, auf dem Gerät erzeugt, als demo markiert)
function devCard(rerender) {
  const n = demoCount();
  const load = async (btn) => {
    btn.disabled = true; btn.textContent = 'Lade Lebensmitteldaten …';
    const foods = await loadFoods();
    if (foodsState() !== 'ready' || !foods.length) { toast('Lebensmitteldaten nicht geladen. Bitte online öffnen.', { error: true }); rerender(); return; }
    const today = isoDate();
    const count = loadDemo(generateDemo({ today, days: 30, foods }));
    const drinks = generateDemoDrinks({ today, days: 30 });
    loadDemoWater(drinks.water);
    loadDemoCaffeine(drinks.caff);
    loadDemoWeights(generateDemoWeights({ today, days: 30 }));
    loadDemoAlcohol(generateDemoAlcohol({ today, days: 30 }));
    // Ohne eigenes Ziel ein Beispielziel ab dem ersten Beispieltag (Gewicht nur im Ziel, nicht im Profil)
    if (!getGoals()) setGoal({ from: addDays(today, -29), goal: DEMO_GOAL, preset: 'dge', weight: 75 });
    toast(`${count} Beispiel-Einträge für 30 Tage geladen`);
    rerender();
  };
  return h('section', { class: 'card dev-card' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Beispieldaten'), h('span', { class: 'qa-badge k-app' }, icon('flask', { size: 18 }))),
    h('p', { class: 'muted small' }, n
      ? `${fmt(n)} Beispiel-Einträge vorhanden. Echte Einträge bleiben beim Entfernen erhalten.`
      : 'Füllt die letzten 30 Tage mit erfundenen Mahlzeiten aus dem Bundeslebensmittelschlüssel, Wasser, Kaffee, Gewicht und ein paar Abenden mit Alkohol. Ohne eigenes Tagesziel wird ein Beispielziel (2.150 kcal) gesetzt.'),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn', type: 'button', onclick: (e) => load(e.currentTarget) }, n ? 'Neu erzeugen' : 'Beispieldaten laden'),
      n ? h('button', { class: 'btn', type: 'button', onclick: () => { removeDemoWater(); removeDemoCaffeine(); removeDemoWeights(); removeDemoAlcohol(); const k = removeDemo(); toast(`${fmt(k)} Beispiel-Einträge entfernt`); rerender(); } }, 'Entfernen') : null));
}

function zielView() {
  const g = getGoals() || {};
  const p = getProfile();
  const w = currentWeight(isoDate());
  let preset = g.preset && PRESETS[g.preset] ? g.preset : 'dge';
  const floor = kcalFloor(p.sex);
  const floorNote = h('p', { class: 'warn small', hidden: true });
  const kcalIn = h('input', { class: 'input', type: 'text', inputmode: 'numeric', value: g.goal ?? '', placeholder: 'z. B. 2200', 'aria-label': 'Kalorienziel' });
  const preview = h('div', { class: 'stats' });
  const note = h('p', { class: 'muted small' });
  const seg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Makro-Verteilung' });

  const num = (el) => { const v = parseFloat(String(el.value).replace(',', '.')); return Number.isFinite(v) ? v : null; };
  const update = () => {
    // Untergrenze: nur Hinweis, kein Sperren (Faustregel; Ziel bleibt die eigene Entscheidung)
    const kc = num(kcalIn);
    floorNote.hidden = !(kc > 0 && kc < floor);
    floorNote.textContent = `Unter ${fmt(floor)} kcal pro Tag nur mit ärztlicher oder ernährungstherapeutischer Begleitung${p.sex ? '' : ' (Frauen 1.200, Männer 1.500 kcal; ohne Angabe gilt 1.200)'}.`;
    seg.replaceChildren(...Object.entries(PRESETS).filter(([k]) => k !== 'custom').map(([k, P]) =>
      h('button', { type: 'button', role: 'radio', 'aria-checked': k === preset ? 'true' : 'false', onclick: () => { preset = k; update(); } }, P.label)));
    const P = PRESETS[preset];
    const m = macrosFrom(num(kcalIn), w, P.pf, P.ff);
    const stat = (label, v) => h('div', { class: 'stat' }, h('b', {}, v == null ? '–' : `${fmt(v)} g`), h('span', {}, label));
    preview.replaceChildren(stat('Eiweiß', m?.protein), stat('Kohlenhydrate', m?.carbs), stat('Fett', m?.fat));
    const fc = m ? fatCheck(preset, m.fatPct) : null;
    note.textContent = !w
      ? 'Für die Makros braucht die App dein Gewicht (unter „Schlaf & Körper“).'
      : !m ? 'Kalorienziel eintragen, dann rechne ich die Makros.'
        : `Fett ${m.fatPct} % der Energie${fc === 0 ? ' – im empfohlenen Bereich.' : fc === 1 ? ' – über dem empfohlenen Bereich.' : fc === -1 ? ' – unter dem empfohlenen Bereich.' : '.'}`;
  };
  kcalIn.addEventListener('input', update);
  update();

  const save = () => {
    const kcal = num(kcalIn);
    if (!(kcal >= 800 && kcal <= 6000)) { toast('Bitte ein Kalorienziel zwischen 800 und 6.000 eintragen.', { error: true }); return; }
    setGoal({ goal: kcal, preset, weight: w });
    toast('Ziel gespeichert');
    location.hash = '#/ich';
  };

  return h('div', {},
    h('a', { class: 'back', href: '#/ich' }, icon('chevron', { size: 16, cls: 'flip' }), 'Ich'),
    pageHead('Tagesziel', 'Gilt ab heute. Rezepte und Wochenplan rechnen mit diesem Ziel.'),
    getWeightGoal().on
      ? h('section', { class: 'card' }, h('p', { class: 'small' }, 'Das Kalorienziel kommt gerade aus dem Gewichtsziel. Ein eigenes Ziel hier gilt, bis du das nächste Gewicht einträgst (bei „automatisch anpassen“). ', h('a', { class: 'link', href: '#/ich/gewichtsziel' }, 'Gewichtsziel öffnen')))
      : null,
    h('section', { class: 'card' },
      h('label', { class: 'form-label' }, h('span', {}, 'Kalorien pro Tag'), kcalIn),
      floorNote,
      h('span', { class: 'label' }, 'Makro-Verteilung'), seg, preview, note),
    h('p', { class: 'small muted page-note' }, `Gewicht ${w != null ? `${r1(w)} kg` : 'fehlt'} · ${p.sex === 'm' ? 'Mann' : p.sex === 'f' ? 'Frau' : 'ohne Geschlecht'} – `,
      h('a', { class: 'link', href: '#/ich/koerper' }, 'unter „Schlaf & Körper“ ändern'),
      getWeightGoal().on ? null : h('span', {}, ' · Kalorienziel lieber aus Zielgewicht und Tempo rechnen? '), getWeightGoal().on ? null : h('a', { class: 'link', href: '#/ich/gewichtsziel' }, 'Gewichtsziel')),
    h('button', { class: 'btn primary block', type: 'button', onclick: save }, 'Speichern'));
}

// Quellen und Lizenzen aller übernommenen Teile. Wird mit jeder Phase ergänzt.
const CREDITS = [
  ['Workout-Tracker', 'Speicherschicht, Router, Bottom Sheets, Icons, das Design „Apple nativ“, die Tab-Leiste mit erhöhtem Mittelknopf und die Streifen-Behandlung im iOS-Home-Bildschirm übernommen.', 'ST0PTV · MIT-Lizenz', 'https://github.com/ST0PTV/Workout-Tracker'],
  ['Calorie-Tracker', 'Makro-Presets und Datenform der Ziel-Historie übernommen (Herleitung und Studien dort in der README); Aufbau der Ich-Seite und „Schlaf & Körper“ als Vorbild.', 'ST0PTV · MIT-Lizenz', 'https://github.com/ST0PTV/Calorie-Tracker'],
  ['Rezeptbuch', 'Aufbau der Navigation (Heute · Rezepte · Ich). Journal, Lebensmittelsuche, Mengen-Dialog, Portionen, Scanner, Foto-Erkennung der Nährwerttabelle und eigene Lebensmittel stammen aus der Tracker-Kopie im Rezeptbuch (Kalorien-Tracker von ST0PTV, von JuliaKelp angepasst). 96 Rezepte mit Zutaten-Nährwerten, Auswahl, Rezeptseite, eigene Rezepte, Wochenplan mit Mengenfaktoren, Einkaufsliste, Vorratskammer (vorrat.js), die Ginger-Zeichnung als Platzhalterbild und der Zyklus (zyklus.js: Rechnung, Kalender, Eintragen, Wissen, Erinnerungen, Bericht, Import, PIN mit Schein-PIN; zerlegt und an die Studienlage angepasst).', 'Copyright (c) 2026 JuliaKelp · MIT-Lizenz', 'https://github.com/juliakelp/Rezeptbuch'],
  ['Eigene Rezepte (ab 0.2.4)', '104 eigene Fassungen klassischer Gerichte (Fleisch, Frühstück, vegetarisch/vegan, Snacks) im Format des Rezeptbuchs, ohne Fisch und Meeresfrüchte. Keine Vorlage aus einer bestimmten Sammlung, keine Bilder. Nährwerte aus den Zutaten geschätzt (BLS 4.0).', 'The Tracker · MIT-Lizenz', 'https://github.com/ST0PTV/The-Tracker-'],
  ['Bundeslebensmittelschlüssel (BLS) 4.0', 'Nährwerte je 100 g für die Lebensmittelsuche (data/bls.json). Verändert: Auszug; freier Zucker, Ernährungsform und Allergene abgeleitet, nicht vom Max Rubner-Institut.', 'Max Rubner-Institut (2025), Karlsruhe · CC BY 4.0 · DOI 10.25826/Data20251217-134202-0', 'https://doi.org/10.25826/Data20251217-134202-0'],
  ['Open Food Facts', 'Produktdaten zum Barcode. Nur die Barcode-Nummer wird gesendet; gefundene Produkte werden auf dem Gerät gespeichert.', 'Open Database License (ODbL) 1.0, Inhalte Database Contents License (DbCL) 1.0', 'https://world.openfoodfacts.org'],
  ['ZXing für JavaScript', 'Erkennt Barcodes im Kamerabild (vendor/zxing.min.js).', 'ZXing-Autoren · Apache License 2.0 (vendor/ZXING-LICENSE)', 'https://github.com/zxing-js/library'],
  ['tesseract.js mit Tesseract OCR', 'Liest die Zahlen vom Foto der Nährwerttabelle, auf dem Handy (vendor/tesseract/). Deutsches Sprachmodell aus tessdata.', 'tesseract.js 5.1.1 und tesseract.js-core · Apache License 2.0; Sprachdaten Apache 2.0, Paket @tesseract.js-data/deu MIT; mitgebündelte Bibliotheken siehe vendor/tesseract/README.md', 'https://github.com/naptha/tesseract.js'],
  ['Koffein-Modell und Richtwerte', 'Ein-Kompartiment-Modell mit Aufnahme und Abbau erster Ordnung; Richtwerte 400 mg/Tag und 200 mg je Einzeldosis (EFSA). Pegel sind Schätzungen.', CAFF_REFS.map(([t]) => t.split('.')[0]).join(' · '), CAFF_REFS[0][1]],
  ['Wasser-Richtwert', 'Standardziel 1,5 l Getränke pro Tag (DGE); Gesamtwasser 2,0/2,5 l inkl. Lebensmittel (EFSA 2010).', 'DGE · EFSA NDA Panel 2010', 'https://doi.org/10.2903/j.efsa.2010.1459'],
  ['Supplement-Katalog', '30 Supplements mit Studienlage, BfR-Höchstmengen und Quellen je Eintrag (ⓘ). Information, keine Empfehlung. Texte aus Rezeptbuch und Calorie-Tracker.', 'BfR, NIH ODS, Cochrane, EMA, ISSN u. a. – je Supplement im ⓘ', 'https://www.bfr.bund.de/cm/343/hoechstmengenempfehlungen-des-bfr.pdf'],
  ['Gewichtsziel', 'Kalorienziel aus Erhaltungsbedarf ± 7.700 kcal pro kg, Tempo-Grenzen 1 % (Abnahme) bzw. 0,5 % (Zunahme) pro Woche, Untergrenze 1.200/1.500 kcal, Grundumsatz-Schätzung (DGE). Datum und kcal sind Schätzungen. Rechnung aus dem Calorie-Tracker.', WG_REFS.map(([t]) => t.split(' – ')[0]).join(' · '), 'https://github.com/ST0PTV/Calorie-Tracker'],
  ['Alkohol-Schätzung', 'Widmark-Formel mit Aufnahme erster Ordnung und Abbau 0,15 ‰/h (einstellbar); Verteilungsfaktor fest oder aus dem BMI. Getränkevorlagen aus dem BLS 4.0 umgerechnet. Grobe Schätzung, nicht geeignet, um die Fahrtüchtigkeit zu beurteilen. Rechnung aus dem Calorie-Tracker.', ALC_REFS.map(([t]) => t.split(' (')[0]).join(' · '), 'https://github.com/ST0PTV/Calorie-Tracker'],
  ['Analyse', 'Gewichtstrend (geglätteter Mittelwert, a = 0,1), Energiebedarf aus Essen und Gewicht (Ø Aufnahme − Steigung × 7.700 kcal/kg, Spanne als 95-%-Intervall), Kalorien-Balken mit Zielband ±10 %, Monat und Jahr ohne Serie. Schätzungen, nur Anzeige. Rechnung und Aufbau aus dem Calorie-Tracker.', 'Walker (Hacker’s Diet) · MacroFactor (Methode) · ST0PTV, MIT-Lizenz', 'https://github.com/ST0PTV/Calorie-Tracker'],
  ['Mikronährstoffe', 'Ø pro Tag aus den BLS-Werten (Calcium, Magnesium, Eisen, Zink, Jod, Vitamin B12, Vitamin D, Folat) als Anteil am DGE-Referenzwert nach Alter und Geschlecht (seit 0.3.0; vorher EU-NRV) – Orientierung für Gesunde, kein gemessener Bedarf. Rechnung aus dem Calorie-Tracker.', 'DGE/ÖGE-Referenzwerte für die Nährstoffzufuhr (Eisen 2023, Jod 2025, Magnesium 2021, Zink 2019, Calcium 2013, Vitamin B12 2018, Folat, Vitamin D) · BLS 4.0', 'https://www.dge.de/wissenschaft/referenzwerte/'],
  ['Mangel nach Diagnose', 'Rezepte, die im Verhältnis zu ihren kcal reich an einem ärztlich festgestellten Mangel sind, kommen öfter dran (Anteil am DGE-Wert ÷ Anteil am Tagesziel; Schild ab 1,5×). Rechnung aus dem Rezeptbuch (microRatio, microBonus). Schätzung, keine Behandlung.', 'Copyright (c) 2026 JuliaKelp · MIT-Lizenz · DGE/ÖGE-Referenzwerte', 'https://github.com/juliakelp/Rezeptbuch'],
  ['Allergene Nüsse', 'Schalenfrüchte und Erdnuss getrennt wie in LMIV Anhang II Nr. 8 und Nr. 5 (seit 0.3.0).', 'Verordnung (EU) Nr. 1169/2011, Anhang II', 'https://eur-lex.europa.eu/eli/reg/2011/1169/oj'],
  ['Magen-Modell', 'Restanteil im Magen 2^(−(t/T½)²), T½ ≈ 1,75 h für ~250 kcal, länger für große und fettreiche Mahlzeiten (Annahme), Getränke 0,4 h, Faktor 1,1/0,9 für Frauen/Männer. Grobe Schätzung. Rechnung aus dem Calorie-Tracker.', 'Abell et al. 2008 · Datz et al. 1987 · Caballero-Plasencia et al. 1999', 'https://doi.org/10.2967/jnmt.107.048116'],
  ['Zyklus', 'Zykluslänge aus den eigenen Periodenbeginnen (Median, Spanne; ohne Daten 29 Tage), Eisprung als Spanne (Zykluslänge minus 11 bis 14 Tage), fruchtbares Fenster 5 Tage davor bis Eisprung, Hinweise nach FIGO-Normalwerten. Schätzungen, keine Verhütung, keine Diagnose. Alle Quellen mit Prüfvermerk unter „Zyklus → Wissen“.', 'Bull 2019 · Wilcox 1995 · Fehring 2006 · Munro/FIGO 2018 · Klein & Poth 2013 · McNulty 2020 · Colenso-Semple 2023', 'https://pubmed.ncbi.nlm.nih.gov/31482137/'],
  ['Standardportionen (LARN)', 'Portions-Schnellwahl im Mengen-Dialog. Rohgewicht, essbarer Anteil; gegarte Lebensmittel umgerechnet (Schätzung).', 'SINU (2024), LARN V Revisione, Porzioni standard (Werte über ATS Brescia 2025)', 'https://www.ats-brescia.it/documents/3432658/78612060/Porzioni+standard+degli+alimenti+per+la+popolazione+adulta.pdf/2ce817e7-0713-bbe6-56c7-767285a575dd']
];

function quellenView() {
  return h('div', {},
    h('a', { class: 'back', href: '#/ich' }, icon('chevron', { size: 16, cls: 'flip' }), 'Ich'),
    pageHead('Quellen & Lizenzen', 'Eigener Code: MIT-Lizenz. Übernommene Teile behalten ihre Lizenz.'),
    ...CREDITS.map(([name, what, who, link]) => h('section', { class: 'card' },
      h('h2', {}, name), h('p', {}, what), h('p', { class: 'muted small' }, who),
      h('a', { class: 'link', href: link, target: '_blank', rel: 'noopener' }, 'Repository öffnen'))));
}

// „/ich/getraenke“ (bis 0.1.7) führt auf die neue Übersicht
const oldDrinks = (rerender) => { setTimeout(() => { location.hash = '#/ich'; }, 0); return ichView(rerender); };
export const ichRoutes = { '/ich': ichView, '/ich/ziel': zielView, '/ich/quellen': quellenView, '/ich/koerper': bodyView, '/ich/ernaehrung': prefsView,
  '/ich/wasser': waterSettingsView, '/ich/koffein': caffSettingsView, '/ich/alkohol': alcSettingsView, '/ich/getraenke': oldDrinks,
  '/ich/supplements': suppSettingsView, '/ich/gewichtsziel': wgoalView };
