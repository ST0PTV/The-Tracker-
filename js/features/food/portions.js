// Portions-Schnellwahl im Mengen-Dialog: Standardportionen, Stückgewichte, Scheibengewicht, Packungsportion.
// Aus Rezeptbuch/tracker/js/app.js (Kalorien-Tracker von ST0PTV, ins Rezeptbuch übernommen von JuliaKelp; beide MIT).
//
// Quelle der Standardportionen: SINU – Società Italiana di Nutrizione Umana (2024), LARN V Revisione,
// „Porzioni standard“ für Erwachsene (Werte über ATS Brescia 2025). Gramm = Rohgewicht, essbarer Anteil.
// Schwächen: italienische Referenz (keine vergleichbare deutsche Tabelle für Einzelportionen gefunden);
// Zuordnung über BLS-Hauptgruppe und Stichwörter im Namen, daher bei ungewöhnlichen Namen ohne Vorschlag.
// Gegarte Lebensmittel: Portion vom rohen Gegenstück über das kcal-Verhältnis umgerechnet (Schätzung,
// Wasseraufnahme schwankt je nach Garzeit).
import { r1n } from '../../core/format.js';

const COOKED_RX = /,?\s*(gekocht|gegart|gedünstet|gedämpft|pochiert|geschmort ohne Fett|gebraten ohne Fett(?: \((?:Pfanne|Ofen)\))?|gegrillt)\b.*$/;
const FISH_CAN = /Konserve|Präserve|in Öl|im eigenen Saft/;

const blsGroup = (food) => (food.id && String(food.id).startsWith('bls:') ? food.id[4] : null);

/** Standardportion nach LARN für ein BLS-Lebensmittel, sonst null. */
export function larnPortion(food) {
  const n = food.n, g = blsGroup(food);
  if (!g) return null;
  const P = (grams, label, hint) => ({ grams, label, hint });
  switch (g) {
    case 'C':
      if (/Mehl|Stärke|Kleie|Malz|Drink|Grieß/.test(n)) return null;
      if (/Flocken|Müsli|Cerealien|Flakes|gepufft/.test(n)) return P(30, '1 Portion', 'Frühstückscerealien');
      return P(80, '1 Portion', 'Getreide/Reis roh');
    case 'E':
      if (/Hühnerei roh|^Hühnerei$/.test(n)) return P(50, '1 Ei (M)', 'essbarer Anteil');
      if (/Eiklar|Eigelb|Pulver/.test(n)) return null;
      if (/Gnocchi/.test(n)) return P(200, '1 Portion', 'Gnocchi');
      if (/Tortell|Ravioli|gefüllt|Füllung/.test(n)) return P(125, '1 Portion', 'gefüllte Pasta');
      if (/Frisch/.test(n)) return P(100, '1 Portion', 'frische Pasta');
      if (/[Tt]eigwaren|[Nn]udel/.test(n)) return P(80, '1 Portion', 'Nudeln roh');
      return null;
    case 'K':
      if (/Kartoffel|Batate|Süßkartoffel|Yams|Topinambur/.test(n) && !/Püree|Kloß|Stärke|Mehl|Chips|Pommes|Rösti|Krokette|Pulver|Trocken/.test(n)) return P(200, '1 Portion', 'ca. 2 kleine Kartoffeln');
      if (/getrocknet/.test(n)) return null;
      return P(200, '1 Portion', 'Pilze wie Gemüse');
    case 'H':
      if (/Drink|Joghurt|Mehl|Öl|Mus|Butter|Creme|Sprossen|Keimlinge/.test(n)) return null;
      if (/Mandel|Haselnuss|Walnuss|Cashew|Pekan|Paranuss|Pistazie|Macadamia|Erdnuss|Sesam|Sonnenblumenkern|Kürbiskern|Leinsamen|Chia|Pinienkern|Nuss/.test(n)) return P(30, '1 Portion', 'Nüsse/Samen, z. B. 7–8 Walnüsse');
      if (/Tofu|Tempeh|Seitan|Ersatz|Aufschnitt/.test(n)) return null;
      if (/Konserve|gekocht|gegart/.test(n)) return P(150, '1 Portion', 'Hülsenfrüchte gegart/Dose');
      if (/reif|getrocknet/.test(n)) return P(50, '1 Portion', 'Hülsenfrüchte getrocknet');
      return null;
    case 'G':
      if (/Saft|getrocknet|Pulver/.test(n)) return null;
      if (/zwiebel|knoblauch|ingwer|petersilie|schnittlauch|basilikum|dill|kerbel|koriander|minze|rosmarin|thymian|oregano|kresse|meerrettich|chili|peperoni/i.test(n)) return null;
      if (/Hülsenfr|Kichererbse reif|Erbse reif|Bohne reif|Linse/.test(n)) return /gekocht|Konserve/.test(n) ? P(150, '1 Portion', 'Hülsenfrüchte gegart') : P(50, '1 Portion', 'Hülsenfrüchte getrocknet');
      if (/salat|Rucola|Feldsalat|Eisberg|Endivie|Radicchio|Chicorée|Kresse/i.test(n)) return P(80, '1 Portion', 'Blattsalat');
      return P(200, '1 Portion', 'Gemüse');
    case 'F':
      if (/Saft|Nektar|Konfitüre|Marmelade|Mus\b|Sirup/.test(n)) return null;
      if (/getrocknet|Trocken/.test(n)) return P(30, '1 Portion', 'Trockenobst');
      return P(150, '1 Stück/Portion', 'mittelgroßes Stück Obst');
    case 'T':
      if (/Rogen|Kaviar|Leber|Salat|Paste/.test(n)) return null;
      if (FISH_CAN.test(n)) return P(50, '1 kleine Dose', 'Fischkonserve abgetropft');
      return P(150, '1 Portion', 'Fisch, z. B. 1 Filet');
    case 'U': case 'V':
      if (/Fett|Speck|Leber|Niere|Herz|Hirn|Zunge|Knochen|Mark|Blut|Haut\b/.test(n) && !/Filet|Brust/.test(n)) return null;
      return P(100, '1 Portion', 'Fleisch roh, z. B. 1 Scheibe Hähnchenbrust');
    case 'W':
      return P(50, '1 Portion', 'Wurst/Aufschnitt, ca. 3–4 Scheiben');
    case 'M':
      if (/Pulver|Butter|Sahne|Rahm/.test(n)) return null;
      if (/Ricotta/.test(n)) return P(150, '1 Portion', 'Ricotta');
      if (/[Jj]oghurt|Kefir|Dickmilch|Sauermilch|Buttermilch/.test(n)) return P(125, '1 Becher', 'Joghurt/Sauermilch');
      if (/[Mm]ilch\b|Milch,|Milch \d|Vollmilch|Trinkmilch/.test(n) && !/käse/i.test(n)) return P(125, '1 kleines Glas', 'Milch (ml ≈ g)');
      return (food.f || 0) > 25 ? P(50, '1 Portion', 'gereifter Käse') : P(100, '1 Portion', 'Frischkäse/Quark/Mozzarella');
    case 'B':
      return P(50, '1 Portion', '1 Scheibe oder kleines Brötchen');
    case 'Q':
      if (/[Öö]l\b/.test(n)) return P(9, '1 EL', 'Öl (10 ml)');
      if (/Butter|Schmalz/.test(n)) return P(10, '1 Portion', 'Butter/Schmalz');
      return null;
    default: return null;
  }
}

/** Zusätzliche Stückgewichte aus LARN-Haushaltsmaßen. */
export function pieceSize(food) {
  const n = food.n;
  if (/^Tomate roh/.test(n)) return { grams: 80, label: '1 Tomate' };
  if (/^Karotte\/Möhre, roh/.test(n)) return { grams: 60, label: '1 Karotte' };
  if (/^Kartoffel (geschält|ungeschält), roh/.test(n)) return { grams: 100, label: '1 kleine Kartoffel' };
  return null;
}

/* Scheibengewicht für Aufschnitt und Käse: Richtwerte aus den LARN-Haushaltsmaßen (50 g Aufschnitt = 5–6 Scheiben
   Salami ≈ 9 g, 3–4 Scheiben Schinken ≈ 15 g, 2 Scheiben Mortadella = 25 g; Käse 2 Scheiben = 50 g → 25 g).
   Echte Packungen weichen ab; ein eigener Wert (Packung ÷ Scheiben) kommt in einem späteren Schritt dazu. */
const SLICE_RULES = [
  [/Salami|Bresaola|Chorizo|Cervelat|Plockwurst|Pfefferbei|Landjäger|Coppa|Rohwurst|Pepperoni|Mettwurst(?!.*(?:Streich|grob))|Sucuk/i, 9, 'Salami/Rohwurst'],
  [/Schinken(?!wurst)|Putenbrust|Hähnchenbrust.*(?:Aufschnitt|geräuchert|gegart)|Kassler|Kasseler|Bacon|Speck|Pastrami|Roastbeef/i, 15, 'Schinken/Brustaufschnitt'],
  [/Mortadella|Lyoner|Fleischwurst|Bierschinken|Jagdwurst|Leberkäse|Fleischkäse|Gelbwurst|Schinkenwurst|Sülze|Aspik|Blutwurst|Zungenwurst|Pressack/i, 25, 'Brühwurst'],
  [/Gouda|Edamer|Emmentaler|Tilsiter|Butterkäse|Leerdammer|Maasdamer|Bergkäse|Gruy[eè]re|Appenzeller|Schmelzkäse|Scheiblette|Cheddar|Provolone|Raclette|Esrom|Havarti|Käse.*Scheiben|Scheibenkäse/i, 25, 'Schnittkäse'],
];

export function sliceRule(food) {
  const n = food.n || '';
  if (/gerieben|Reibe|Streich|Aufstrich|Pulver|Würfel|Pastete|Suppe|Brötchen|Sandwich|Pizza/i.test(n)) return null;
  const id = String(food.ref || food.id || '');
  if (id.startsWith('bls:') && !'WUM'.includes(id[4])) return null; // nur Wurst, Fleisch-Aufschnitt, Käse
  return SLICE_RULES.find(([rx]) => rx.test(n)) || null;
}

// Hülsenfrüchte gekocht/Dose: Portion bezieht sich direkt auf den gegarten Zustand
function larnPortionDirect(food) {
  return /^[HG]/.test(food.id[4]) && /Hülsen|Kichererbse|Erbse reif|Bohne reif|Linse/.test(food.n) && /gekocht|Konserve/.test(food.n);
}

/**
 * Alle Portionsvorschläge für ein Lebensmittel: [{ grams, label, hint, larn?, slice? }].
 * foods: BLS-Liste, um bei gegarten Lebensmitteln das rohe Gegenstück zu finden.
 */
export function portionOptions(food, foods = []) {
  const out = [];
  let base = food;
  let factor = 1;
  if (blsGroup(food) && COOKED_RX.test(food.n) && !larnPortionDirect(food)) {
    const stem = food.n.replace(COOKED_RX, '').trim();
    const raw = foods.find((x) => x.id[4] === food.id[4] && (x.n === stem + ', roh' || x.n === stem + ' roh' || x.n === stem));
    if (raw && raw.k > 0 && food.k > 0) { base = raw; factor = raw.k / food.k; } else base = null;
  }
  const p = base ? larnPortion(base) : null;
  if (p) {
    const g = factor === 1 ? p.grams : Math.round((p.grams * factor) / 5) * 5;
    out.push({ grams: g, label: p.label + (factor !== 1 ? ' (gegart)' : ''), hint: p.hint + (factor !== 1 ? `; ${p.grams} g roh umgerechnet (Schätzung)` : ''), larn: true });
  }
  const pc = factor === 1 ? pieceSize(food) : null;
  if (pc && !out.some((o) => o.grams === pc.grams)) out.push({ grams: pc.grams, label: pc.label, hint: 'aus LARN-Haushaltsmaß', larn: true });
  if (food.serving && !out.some((o) => o.grams === Math.round(food.serving))) {
    out.push({ grams: r1n(food.serving), label: food.src === 'off' ? 'Packungsportion' : '1 Portion', hint: food.src === 'off' ? 'laut Open Food Facts' : 'eigene Angabe' });
  }
  const sl = sliceRule(food);
  if (sl && !out.some((o) => o.grams === sl[1])) out.unshift({ grams: sl[1], label: '1 Scheibe', hint: `Richtwert ${sl[2]} (LARN-Haushaltsmaß)`, larn: true, slice: true });
  return out;
}
