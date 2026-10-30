// Zutaten der Rezepte: Erkennen, Mengen lesen und skalieren, Nährwerte aus dem BLS 4.0.
// Übernommen aus dem Rezeptbuch, nutrition.js (Stand a254701): Copyright (c) 2026 JuliaKelp, MIT-Lizenz.
// Geändert: Die Werte kommen nicht aus einer eigenen Ladefunktion, sondern über prepareIngredients(lookup) aus den
// BLS-Daten der App (food/foods.js → foodById); sonst Rechnung, Zuordnung (BLS_CODES) und Einheiten unverändert.
// Rein (ohne DOM und Speicher), mit Node getestet.
// Zutaten der Rezepte (pro 100 g bzw. 100 ml, roh/ungekocht wo nicht anders angegeben).
// Die Nährwerte kommen beim Start aus der BLS-Datei des Kalorien-Trackers (tracker/data/bls.json), siehe loadNutrition().
// Quelle: Max Rubner-Institut (2025). Bundeslebensmittelschlüssel (BLS), Version 4.0. Karlsruhe.
// DOI: 10.25826/Data20251217-134202-0. Welche Zutat welcher BLS-Code ist, steht unten in BLS_CODES.
// Ausnahmen ohne BLS-Eintrag: siehe NOT_FROM_BLS.
//
// piece:  Gramm pro Stück (für die Einheit „Stück“)
// el:     Gramm pro Esslöffel (Standard 15)
// diet:   'fleisch' | 'fisch' | 'tierisch' (Milchprodukte, Ei, Honig); fehlt = vegan
// allergens wie in recipes.js
// group:  'gemuese' | 'eiweiss' | 'saettigung' | 'fett' | 'suess' | 'sonst' (für Gingers Tipps)

export const FOODS = [
  // Sättigungsbeilagen
  { name: 'Nudeln', el: 10, allergens: ['gluten'], group: 'saettigung', aliases: ['spaghetti', 'penne', 'pasta', 'fusilli', 'makkaroni', 'vollkornnudeln', 'lasagneplatten', 'bandnudeln', 'tagliatelle', 'suppennudeln'] },
  { name: 'Gekochter Reis', el: 20, group: 'saettigung', aliases: ['reis gekocht', 'gekochter reis'] },
  { name: 'Reis', el: 15, group: 'saettigung', aliases: ['basmati', 'jasminreis', 'risottoreis', 'naturreis', 'milchreis', 'basmatireis'] },
  { name: 'Kartoffeln', piece: 100, group: 'saettigung', aliases: ['kartoffel'] },
  { name: 'Süßkartoffel', piece: 300, group: 'saettigung', aliases: ['süßkartoffeln', 'suesskartoffel'] },
  { name: 'Haferflocken', el: 8, allergens: ['gluten'], group: 'saettigung', aliases: ['hafer'] },
  { name: 'Brot', piece: 50, allergens: ['gluten'], group: 'saettigung', aliases: ['vollkornbrot', 'brotscheibe', 'scheibe brot', 'brötchen'] },
  { name: 'Toast', piece: 25, allergens: ['gluten'], group: 'saettigung', aliases: ['toastbrot'] },
  { name: 'Tortilla', piece: 60, allergens: ['gluten'], group: 'saettigung', aliases: ['tortillas', 'wrap', 'wraps', 'fladen'] },
  { name: 'Couscous', el: 12, allergens: ['gluten'], group: 'saettigung', aliases: ['bulgur'] },
  { name: 'Quinoa', el: 12, group: 'saettigung' },
  { name: 'Mehl', el: 10, allergens: ['gluten'], group: 'saettigung', aliases: ['weizenmehl', 'dinkelmehl'] },
  // Ab 0.2.4 (mehr Rezepte; Zuordnung zum BLS 4.0 unten in BLS_CODES)
  { name: 'Bulgur', el: 12, allergens: ['gluten'], group: 'saettigung' },
  { name: 'Gnocchi', allergens: ['gluten'], group: 'saettigung' },
  { name: 'Spätzle', diet: 'tierisch', allergens: ['gluten', 'ei'], group: 'saettigung', aliases: ['frische spätzle', 'eierspätzle'] },
  { name: 'Polenta', el: 12, group: 'saettigung', aliases: ['maisgrieß'] },
  { name: 'Hirse', el: 12, group: 'saettigung' },
  { name: 'Buchweizen', el: 12, group: 'saettigung' },
  { name: 'Reisnudeln', group: 'saettigung', aliases: ['reisbandnudeln'] },
  { name: 'Glasnudeln', group: 'saettigung' },
  { name: 'Grieß', el: 12, allergens: ['gluten'], group: 'saettigung', aliases: ['weichweizengrieß', 'hartweizengrieß'] },
  { name: 'Paniermehl', el: 8, allergens: ['gluten'], group: 'saettigung', aliases: ['semmelbrösel'] },
  { name: 'Fladenbrot', piece: 400, allergens: ['gluten'], group: 'saettigung', aliases: ['fladenbrote', 'türkisches fladenbrot'] },
  { name: 'Knäckebrot', piece: 10, allergens: ['gluten'], group: 'saettigung' },
  { name: 'Baguette', piece: 250, allergens: ['gluten'], group: 'saettigung', aliases: ['ciabatta'] },

  // Hülsenfrüchte und Eiweiß
  { name: 'Linsen', el: 12, group: 'eiweiss', aliases: ['rote linsen', 'berglinsen'] },
  { name: 'Kichererbsen', group: 'eiweiss', aliases: ['kichererbsen dose'] },
  { name: 'Kidneybohnen', group: 'eiweiss', aliases: ['bohnen', 'weiße bohnen', 'schwarze bohnen'] },
  { name: 'Tofu', allergens: ['soja'], group: 'eiweiss', aliases: ['räuchertofu'] },
  { name: 'Edamame', allergens: ['soja'], group: 'eiweiss' },
  { name: 'Sojaschnetzel', allergens: ['soja'], group: 'eiweiss', aliases: ['sojagranulat'] },
  { name: 'Ei', piece: 60, diet: 'tierisch', allergens: ['ei'], group: 'eiweiss', aliases: ['eier'] },
  { name: 'Hähnchen', diet: 'fleisch', group: 'eiweiss', aliases: ['hähnchenbrust', 'hühnchen', 'huhn', 'hähnchenbrustfilet', 'hähnchenfleisch'] },
  { name: 'Pute', diet: 'fleisch', group: 'eiweiss', aliases: ['putenbrust', 'putenschnitzel', 'putenfleisch', 'putengeschnetzeltes'] },
  { name: 'Hackfleisch', diet: 'fleisch', group: 'eiweiss', aliases: ['hack', 'gemischtes hack'] },
  { name: 'Rinderhack', diet: 'fleisch', group: 'eiweiss', aliases: ['rinderhackfleisch'] },
  { name: 'Schweinefilet', diet: 'fleisch', group: 'eiweiss', aliases: ['schweinelende', 'schweinemedaillons'] },
  { name: 'Schweineschnitzel', diet: 'fleisch', group: 'eiweiss', aliases: ['schnitzel', 'schweinefleisch', 'schweinegeschnetzeltes'] },
  { name: 'Schweinegulasch', diet: 'fleisch', group: 'eiweiss' },
  { name: 'Rindergulasch', diet: 'fleisch', group: 'eiweiss', aliases: ['gulaschfleisch'] },
  { name: 'Kasseler', diet: 'fleisch', group: 'eiweiss', aliases: ['kassler'] },
  { name: 'Bratwurst', piece: 100, diet: 'fleisch', group: 'fett', aliases: ['bratwürste', 'rostbratwurst'] },
  { name: 'Wiener Würstchen', piece: 50, diet: 'fleisch', group: 'fett', aliases: ['wiener', 'würstchen', 'wienerle'] },
  { name: 'Salami', diet: 'fleisch', group: 'fett' },
  { name: 'Leberkäse', diet: 'fleisch', group: 'fett', aliases: ['fleischkäse'] },
  { name: 'Rindfleisch', diet: 'fleisch', group: 'eiweiss', aliases: ['rind', 'steak'] },
  { name: 'Schinken', diet: 'fleisch', group: 'eiweiss', aliases: ['kochschinken'] },
  { name: 'Speck', diet: 'fleisch', group: 'fett', aliases: ['bacon', 'speckwürfel'] },
  { name: 'Lachs', piece: 125, diet: 'fisch', allergens: ['fisch'], group: 'eiweiss', aliases: ['lachsfilet'] },
  { name: 'Thunfisch', diet: 'fisch', allergens: ['fisch'], group: 'eiweiss', aliases: ['thunfisch dose'] },
  { name: 'Garnelen', diet: 'fisch', group: 'eiweiss', aliases: ['shrimps', 'krabben'] },

  // Milchprodukte
  { name: 'Milch', diet: 'tierisch', allergens: ['laktose'], group: 'eiweiss', aliases: ['milch 1,5%', 'vollmilch'] },
  { name: 'Haferdrink', allergens: ['gluten'], group: 'sonst', aliases: ['hafermilch', 'pflanzendrink', 'sojadrink', 'mandeldrink'] },
  { name: 'Joghurt', diet: 'tierisch', allergens: ['laktose'], group: 'eiweiss', aliases: ['naturjoghurt', 'griechischer joghurt'] },
  { name: 'Magerquark', diet: 'tierisch', allergens: ['laktose'], group: 'eiweiss', aliases: ['quark'] },
  { name: 'Frischkäse', diet: 'tierisch', allergens: ['laktose'], group: 'fett' },
  { name: 'Feta', diet: 'tierisch', allergens: ['laktose'], group: 'fett', aliases: ['schafskäse', 'hirtenkäse'] },
  { name: 'Käse', diet: 'tierisch', allergens: ['laktose'], group: 'fett', aliases: ['gouda', 'emmentaler', 'reibekäse', 'geriebener käse', 'cheddar'] },
  { name: 'Mozzarella', piece: 125, diet: 'tierisch', allergens: ['laktose'], group: 'fett' },
  { name: 'Parmesan', el: 6, diet: 'tierisch', allergens: ['laktose'], group: 'fett', aliases: ['hartkäse'] },
  { name: 'Sahne', diet: 'tierisch', allergens: ['laktose'], group: 'fett', aliases: ['schlagsahne', 'kochsahne'] },
  { name: 'Schmand', diet: 'tierisch', allergens: ['laktose'], group: 'fett', aliases: ['saure sahne', 'crème fraîche', 'creme fraiche'] },
  { name: 'Butter', el: 12, diet: 'tierisch', allergens: ['laktose'], group: 'fett' },
  { name: 'Skyr', diet: 'tierisch', allergens: ['laktose'], group: 'eiweiss' },
  { name: 'Körniger Frischkäse', diet: 'tierisch', allergens: ['laktose'], group: 'eiweiss', aliases: ['hüttenkäse', 'cottage cheese'] },
  { name: 'Ricotta', diet: 'tierisch', allergens: ['laktose'], group: 'fett' },
  { name: 'Halloumi', piece: 225, diet: 'tierisch', allergens: ['laktose'], group: 'fett', aliases: ['grillkäse'] },
  { name: 'Buttermilch', diet: 'tierisch', allergens: ['laktose'], group: 'eiweiss' },
  { name: 'Sojajoghurt', allergens: ['soja'], group: 'eiweiss', aliases: ['soja-joghurt', 'joghurtalternative'] },

  // Fette, Süßes, Saaten
  { name: 'Öl', el: 10, group: 'fett', aliases: ['olivenöl', 'rapsöl', 'sonnenblumenöl', 'sesamöl'] },
  { name: 'Kokosmilch light', kcal: 75, group: 'fett', aliases: ['kokosmilch fettreduziert'] },
  { name: 'Kokosmilch', group: 'fett' },
  { name: 'Pesto', el: 15, diet: 'tierisch', allergens: ['schalen', 'laktose'], group: 'fett' },
  { name: 'Mayonnaise', el: 15, diet: 'tierisch', allergens: ['ei'], group: 'fett', aliases: ['mayo'] },
  { name: 'Hummus', el: 15, group: 'eiweiss' },
  { name: 'Nüsse', el: 8, allergens: ['schalen'], group: 'fett', aliases: ['walnüsse', 'mandeln', 'cashews', 'haselnüsse'] },
  { name: 'Erdnussbutter', el: 15, allergens: ['erdnuss'], group: 'fett', aliases: ['erdnussmus'] },
  { name: 'Chiasamen', el: 12, group: 'fett', aliases: ['chia'] },
  { name: 'Leinsamen', el: 10, group: 'fett' },
  { name: 'Zucker', el: 15, group: 'suess', aliases: ['rohrzucker'] },
  { name: 'Honig', el: 20, diet: 'tierisch', group: 'suess' },
  { name: 'Ahornsirup', el: 20, group: 'suess', aliases: ['sirup', 'agavendicksaft'] },
  { name: 'Schokolade', group: 'suess', aliases: ['zartbitterschokolade', 'schoko'] },
  { name: 'Tahin', el: 15, allergens: ['sesam'], group: 'fett', aliases: ['sesammus', 'tahini'] },
  { name: 'Sesam', el: 9, allergens: ['sesam'], group: 'fett', aliases: ['sesamsamen'] },
  { name: 'Kürbiskerne', el: 9, group: 'fett' },
  { name: 'Sonnenblumenkerne', el: 9, group: 'fett' },
  { name: 'Erdnüsse', el: 9, allergens: ['erdnuss'], group: 'fett', aliases: ['erdnuss'] },
  { name: 'Kokosraspeln', el: 5, group: 'fett', aliases: ['kokosflocken'] },
  { name: 'Oliven', piece: 4, group: 'fett', aliases: ['schwarze oliven', 'kalamata-oliven'] },
  { name: 'Konfitüre', el: 20, group: 'suess', aliases: ['marmelade', 'fruchtaufstrich'] },
  { name: 'Kakao', el: 6, group: 'suess', aliases: ['kakaopulver', 'backkakao'] },
  { name: 'Backpulver', el: 10, group: 'sonst' },

  // Gemüse und Obst
  { name: 'Tomaten', piece: 100, group: 'gemuese', aliases: ['tomate', 'kirschtomaten', 'cherrytomaten'] },
  { name: 'Passierte Tomaten', group: 'gemuese', aliases: ['gehackte tomaten', 'tomaten dose', 'dosentomaten'] },
  { name: 'Tomatenmark', el: 15, group: 'gemuese' },
  { name: 'Zwiebel', piece: 80, group: 'gemuese', aliases: ['zwiebeln', 'rote zwiebel', 'frühlingszwiebel', 'lauchzwiebel'] },
  { name: 'Knoblauch', piece: 4, group: 'gemuese', aliases: ['knoblauchzehe', 'zehe'] },
  { name: 'Möhre', piece: 80, group: 'gemuese', aliases: ['möhren', 'karotte', 'karotten'] },
  { name: 'Paprika', piece: 150, group: 'gemuese', aliases: ['paprikaschote'] },
  { name: 'Zucchini', piece: 250, group: 'gemuese' },
  { name: 'Brokkoli', piece: 350, group: 'gemuese', aliases: ['broccoli'] },
  { name: 'Blumenkohl', piece: 600, group: 'gemuese' },
  { name: 'Spinat', group: 'gemuese', aliases: ['blattspinat'] },
  { name: 'Champignons', group: 'gemuese', aliases: ['pilze', 'champignon'] },
  { name: 'Gurke', piece: 400, group: 'gemuese', aliases: ['salatgurke'] },
  { name: 'Salat', group: 'gemuese', aliases: ['eisbergsalat', 'rucola', 'blattsalat'] },
  { name: 'Erbsen', group: 'gemuese', aliases: ['tk-erbsen'] },
  { name: 'Mais', el: 15, group: 'gemuese', aliases: ['maiskörner'] },
  { name: 'Aubergine', piece: 300, group: 'gemuese' },
  { name: 'Kürbis', group: 'gemuese', aliases: ['hokkaido'] },
  { name: 'Avocado', piece: 150, group: 'fett' },
  { name: 'Banane', piece: 120, group: 'suess' },
  { name: 'Apfel', piece: 150, group: 'suess', aliases: ['äpfel'] },
  { name: 'Beeren', group: 'suess', aliases: ['heidelbeeren', 'himbeeren', 'erdbeeren', 'tk-beeren'] },
  { name: 'Zitrone', piece: 100, group: 'sonst', aliases: ['zitronensaft', 'limette'] },
  { name: 'Lauch', piece: 200, group: 'gemuese', aliases: ['porree', 'lauchstange'] },
  { name: 'Weißkohl', group: 'gemuese', aliases: ['spitzkohl'] },
  { name: 'Rotkohl', group: 'gemuese', aliases: ['blaukraut'] },
  { name: 'Sauerkraut', group: 'gemuese' },
  { name: 'Grüne Bohnen', group: 'gemuese', aliases: ['prinzessbohnen', 'brechbohnen', 'buschbohnen'] },
  { name: 'Rote Bete', piece: 100, group: 'gemuese', aliases: ['rote beete', 'rote rübe'] },
  { name: 'Fenchel', piece: 250, group: 'gemuese', aliases: ['fenchelknolle'] },
  { name: 'Kohlrabi', piece: 300, group: 'gemuese' },
  { name: 'Spargel', group: 'gemuese', aliases: ['grüner spargel'] },
  { name: 'Radieschen', group: 'gemuese' },
  { name: 'Rosenkohl', group: 'gemuese' },
  { name: 'Grünkohl', group: 'gemuese' },
  { name: 'Wirsing', group: 'gemuese' },
  { name: 'Pak Choi', piece: 200, group: 'gemuese' },
  { name: 'Pastinake', piece: 150, group: 'gemuese', aliases: ['pastinaken'] },
  { name: 'Knollensellerie', allergens: ['sellerie'], group: 'gemuese', aliases: ['sellerie', 'staudensellerie'] },
  { name: 'Ingwer', el: 6, group: 'gemuese', aliases: ['ingwerwurzel'] },
  { name: 'Orange', piece: 150, group: 'suess', aliases: ['orangen', 'apfelsine'] },
  { name: 'Mango', piece: 250, group: 'suess' },
  { name: 'Ananas', group: 'suess' },
  { name: 'Birne', piece: 160, group: 'suess', aliases: ['birnen'] },
  { name: 'Kiwi', piece: 75, group: 'suess' },
  { name: 'Weintrauben', group: 'suess', aliases: ['trauben'] },
  { name: 'Datteln', piece: 8, group: 'suess', aliases: ['dattel'] },
  { name: 'Rosinen', el: 10, group: 'suess', aliases: ['sultaninen'] },
  { name: 'Pflaumen', piece: 35, group: 'suess', aliases: ['zwetschgen', 'pflaume'] },
  { name: 'Apfelmus', el: 15, group: 'suess' },

  // Fast ohne Kalorien
  { name: 'Salsa', el: 15, group: 'sonst', aliases: ['tomatensalsa'] },
  { name: 'Gemüsebrühe', group: 'sonst', aliases: ['brühe', 'wasser'] },
  { name: 'Sojasauce', el: 15, allergens: ['soja', 'gluten'], group: 'sonst', aliases: ['sojasoße'] },
  { name: 'Gewürze', kcal: 0, el: 5, group: 'sonst', aliases: ['salz', 'pfeffer', 'curry', 'currypulver', 'paprikapulver', 'zimt', 'oregano', 'kräuter', 'petersilie', 'schnittlauch', 'basilikum', 'senf', 'essig', 'kreuzkümmel', 'chiliflocken', 'chilipulver', 'chili', 'majoran', 'thymian', 'rosmarin', 'kümmel', 'muskat', 'kurkuma', 'garam masala', 'koriander', 'dill', 'minze', 'lorbeerblatt', 'zimtpulver', 'vanille', 'gewürze', 'kräuter der provence', 'paprika edelsüß', 'rauchpaprika'] }
];

export const UNITS = [
  { id: 'g', name: 'g' },
  { id: 'ml', name: 'ml' },
  { id: 'stueck', name: 'Stück' },
  { id: 'el', name: 'EL' },
  { id: 'tl', name: 'TL' }
];

function norm(s) {
  return String(s).toLowerCase().trim().replace(/\s+/g, ' ');
}

// Findet eine Zutat: exakter Name, Alias, dann Teilwort
// Allergene aus dem Zeilentext (0.2.2): Die Rezeptbuch-Daten markieren nur Gluten, Laktose, Ei, Nüsse, Soja und Fisch.
// Die übrigen Hauptallergene nach LMIV Anhang II leitet die App aus Stichwörtern ab – vorsichtig (Brühe zählt als
// Sellerie, Essig und Trockenobst als Sulfite), weil die Packung abweichen kann. Schätzung, kein Ersatz für die Packung.
export const ALLERGEN_WORDS = {
  sellerie: /sellerie|brühe|bruehe/,
  senf: /senf/,
  sesam: /sesam|tahin|hummus/,
  krebstiere: /garnele|shrimp|krabbe|hummer|languste|scampi|krebs/,
  weichtiere: /muschel|tintenfisch|kalmar|calamar|oktopus|sepia|schnecke/,
  lupine: /lupine/,
  sulfite: /wein|rosine|trockenobst|getrocknet|dörr|essig|balsamico|sauerkraut/,
  soja: /soja|edamame|miso/,
  // Schalenfrüchte und Erdnuss getrennt wie in LMIV Anhang II Nr. 8 und Nr. 5 (0.3.0; vorher zusammen „nuesse“)
  schalen: /(?<!muskat|kokos|erd)nuss|(?<!erd)nüsse|mandel|cashew|kaschu|pistazie|pekan|macadamia|paranuss|walnuss|haselnuss/,
  erdnuss: /erdnuss|erdnüsse/
};
/** Allergene einer Zutatenzeile: aus der erkannten Zutat und aus Stichwörtern im Text. */
export function allergensOfText(text) {
  const t = String(text || '').toLowerCase();
  const food = findFood(parseIngredient(text).name || t);
  const out = new Set((food && food.allergens) || []);
  for (const [a, re] of Object.entries(ALLERGEN_WORDS)) if (re.test(t)) out.add(a);
  return [...out];
}

export function findFood(name) {
  const n = norm(name);
  if (!n) return null;
  for (const f of FOODS) if (norm(f.name) === n || (f.aliases || []).includes(n)) return f;
  // sonst das längste passende Teilwort, damit „gehackte Tomaten“ nicht bei „Tomaten“ landet
  let best = null;
  let bestLen = 0;
  for (const f of FOODS) {
    for (const k of [f.name, ...(f.aliases || [])].map(norm)) {
      if (k.length >= 3 && (n.includes(k) || (k.includes(n) && n.length >= 4)) && k.length > bestLen) { best = f; bestLen = k.length; }
    }
  }
  return best;
}

// Gramm einer Zeile (ml werden wie g gezählt)
export function gramsOf(row, food) {
  const amount = Number(String(row.amount).replace(',', '.')) || 0;
  switch (row.unit) {
    case 'stueck': return amount * ((food && food.piece) || 100);
    case 'el': return amount * ((food && food.el) || 15);
    case 'tl': return amount * (((food && food.el) || 15) / 3);
    default: return amount;
  }
}

// Kalorien einer Zeile; null, wenn die Zutat unbekannt ist und kein eigener Wert eingetragen wurde
export function kcalOf(row) {
  const food = findFood(row.name);
  const per100 = row.kcal100 !== undefined && row.kcal100 !== '' ? Number(row.kcal100) : food ? food.kcal : null;
  if (per100 === null || Number.isNaN(per100)) return null;
  return (gramsOf(row, food) * per100) / 100;
}

// BLS-Code je Zutat. Mehrere Codes (z. B. bei „Nüsse“ und „Beeren“) = Mittelwert dieser BLS-Einträge.
const BLS_CODES = {
  'Nudeln': 'E401000', // Teigwaren eifrei, roh
  'Gekochter Reis': 'C352032', // Reis poliert, gekocht
  'Reis': 'C352000', // Reis poliert, roh
  'Kartoffeln': 'K110100', // Kartoffel geschält, roh
  'Süßkartoffel': 'K420100', // Batate/Süßkartoffel, roh
  'Haferflocken': 'C133000', // Hafer Flocken
  'Brot': 'B271000', // Roggenmischbrot
  'Toast': 'B314000', // Weizentoastbrot/Buttertoastbrot
  'Tortilla': 'B783012', // Weizentortilla
  'Couscous': 'C119200', // Couscous (Hartweizen) roh
  'Quinoa': 'C118000', // Quinoa weiß, roh
  'Mehl': 'C214100', // Weizen Mehl, Type 405
  'Linsen': 'H725100', // Linse reif
  'Kichererbsen': 'H720902', // Kichererbse reif, Konserve, abgetropft
  'Kidneybohnen': 'H742902', // Kidneybohne reif, Konserve, abgetropft
  'Tofu': 'H861000', // Tofu
  'Ei': 'E111100', // Hühnerei roh
  'Hähnchen': 'V416100', // Hähnchen Brustfilet, roh
  'Hackfleisch': 'U050100', // Rind/Schwein, Hackfleisch gemischt, roh
  'Rindfleisch': 'U284100', // Rind Hüfte, roh
  'Schinken': 'W424000', // Schwein Kochschinken, Kochpökelware
  'Speck': 'W415000', // Schwein Frühstücksspeck, Rohpökelware, geräuchert
  'Lachs': 'T410100', // Lachs roh
  'Thunfisch': 'T121902', // Thunfisch im eigenen Saft, Konserve, abgetropft
  'Garnelen': 'T753100', // Garnele/Granat/Krabbe, roh
  'Milch': 'M111200', // Milch fettarm, frisch, 1,5 % Fett, pasteurisiert
  'Haferdrink': 'C660000', // Haferdrink ungesüßt
  'Joghurt': 'M141300', // Joghurt mild, mind. 3,5 % Fett
  'Magerquark': 'M713100', // Speisequark Magerstufe, Magerquark < 10 % Fett i. Tr.
  'Frischkäse': 'M710800', // Frischkäsezubereitung Natur, mind. 60 % Fett i. Tr.
  'Feta': 'M012200', // Feta mind. 45 % Fett i. Tr.
  'Käse': 'M402600', // Gouda 48 % Fett i. Tr.
  'Mozzarella': 'M032100', // Mozzarella mind. 45 % Fett i. Tr.
  'Parmesan': 'M306400', // Parmesan mind. 30 % Fett i. Tr.
  'Sahne': 'M173800', // Schlagsahne mind. 30 % Fett
  'Schmand': 'M172700', // Sauerrahm/Schmand, mind. 20 % Fett
  'Butter': 'Q630000', // Süßrahmbutter
  'Öl': 'Q120000', // Olivenöl
  'Kokosmilch': 'H154000', // Kokosmilch/Kokosnussmilch
  'Pesto': 'X372012', // Pesto verde
  'Mayonnaise': 'Q991000', // Mayonnaise (Fertigprodukt)
  'Hummus': 'H960000', // Hummus/Kichererbsenmus
  'Nüsse': 'H120100+H210100+H170100+H130100', // Walnuss / Mandel süß / Cashewkern / Haselnuss
  'Erdnussbutter': 'H880200', // Erdnussbutter/Erdnusscreme
  'Chiasamen': 'H480100', // Chia-Samen
  'Leinsamen': 'H410100', // Leinsamen
  'Zucker': 'S111000', // Zucker weiß (Raffinadezucker/Weißzucker)
  'Honig': 'S120000', // Honig
  'Ahornsirup': 'S151100', // Ahornsirup
  'Schokolade': 'S560000', // Zartbitter-/Halbbitterschokolade
  'Tomaten': 'G561100', // Tomate roh
  'Passierte Tomaten': 'R161200', // Tomaten passiert/Tomatenpüree
  'Tomatenmark': 'R160000', // Tomatenmark
  'Zwiebel': 'G480100', // Speisezwiebel roh
  'Knoblauch': 'G490100', // Knoblauch roh
  'Möhre': 'G620100', // Karotte/Möhre, roh
  'Paprika': 'G543100', // Gemüsepaprika rot, roh
  'Zucchini': 'G582100', // Zucchini roh
  'Brokkoli': 'G312100', // Broccoli roh
  'Blumenkohl': 'G311100', // Blumenkohl roh
  'Spinat': 'G211100', // Spinat roh
  'Champignons': 'K701100', // Champignon roh
  'Gurke': 'G520100', // Gurke roh
  'Salat': 'G105100', // Kopfsalat roh
  'Erbsen': 'G760200', // Erbse grün, tiefgefroren
  'Mais': 'G570902', // Zuckermais Konserve, abgetropft
  'Aubergine': 'G510100', // Aubergine roh
  'Kürbis': 'G581000', // Kürbis Hokkaido (C. maxima) roh
  'Avocado': 'F502100', // Avocado roh
  'Banane': 'F503100', // Banane roh
  'Apfel': 'F110100', // Apfel roh
  'Beeren': 'F301100+F302100+F304100', // Erdbeere roh / Himbeere roh / Heidelbeere roh
  'Zitrone': 'F601100', // Zitrone roh
  'Salsa': 'X3A7040', // Spanische Sauce (Salsa)
  'Gemüsebrühe': 'X416243', // Gemüsebrühe
  'Sojasauce': 'R143000', // Sojasauce/Sojasoße
  // Ab 0.2.4 – Codes in data/bls.json nachgesehen (2026-10-29)
  'Bulgur': 'C119100', // Bulgur (Hartweizen) roh
  'Gnocchi': 'K270000', // Gnocchi roh
  'Spätzle': 'X711512', // Eier-Frischteigwaren Spätzle, roh (frisch, Kühlregal)
  'Polenta': 'C346000', // Mais Grieß
  'Hirse': 'C332000', // Hirse roh
  'Buchweizen': 'C322000', // Buchweizen roh
  'Reisnudeln': 'C559000', // Reisnudeln roh
  'Glasnudeln': 'H030400', // Glasnudeln aus Mungbohnenstärke, roh
  'Grieß': 'C219300', // Hartweizen Grieß
  'Paniermehl': 'B821000', // Paniermehl/Semmelbrösel
  'Fladenbrot': 'B782100', // Weizenfladenbrot
  'Knäckebrot': 'B6A2100', // Roggenvollkornknäckebrot
  'Baguette': 'B781200', // Weizenbaguette
  'Edamame': 'G750100', // Sojabohne unreif (Edamame) roh
  'Sojaschnetzel': 'H765000', // Sojaschnetzel/Sojagranulat, trocken
  'Pute': 'V486100', // Pute Brust, ohne Haut, roh
  'Rinderhack': 'U010100', // Rind Hackfleisch, roh
  'Schweinefilet': 'U611100', // Schwein Filet/Lende, roh
  'Schweineschnitzel': 'U541100', // Schwein Schnitzel (Oberschale) roh
  'Schweinegulasch': 'U554100', // Schwein Gulasch (Restbug) roh
  'Rindergulasch': 'U151100', // Rind Gulasch (Bug) roh
  'Kasseler': 'W510000', // Kasseler, Rohpökelware, geräuchert
  'Bratwurst': 'W221000', // Rheinische Bratwurst
  'Wiener Würstchen': 'W211200', // Wiener Würstchen
  'Salami': 'W140000', // Salami
  'Leberkäse': 'W233000', // Fleischkäse/Leberkäse fein
  'Skyr': 'M710100', // Skyr
  'Körniger Frischkäse': 'M711100', // Körniger Frischkäse < 10 % Fett i. Tr.
  'Ricotta': 'M741600', // Ricotta
  'Halloumi': 'M524500', // Halloumi Grillkäse
  'Buttermilch': 'M150000', // Buttermilch
  'Sojajoghurt': 'H844000', // Soja-Joghurtalternative ungesüßt
  'Tahin': 'Q901000', // Tahin (Sesammus)
  'Sesam': 'H420100', // Sesam
  'Kürbiskerne': 'H310100', // Kürbiskern
  'Sonnenblumenkerne': 'H430100', // Sonnenblumenkern
  'Erdnüsse': 'H110600', // Erdnuss geröstet
  'Kokosraspeln': 'H150400', // Kokos Fruchtfleisch, geraspelt, getrocknet
  'Oliven': 'H520800', // Oliven geschwärzt, in Salzlake, abgetropft
  'Konfitüre': 'S132000', // Konfitüre extra
  'Kakao': 'S713000', // Kakaopulver stark entölt
  'Backpulver': 'R421100', // Backpulver
  'Lauch': 'G470100', // Porree/Lauch, roh
  'Weißkohl': 'G342100', // Weißkohl roh
  'Rotkohl': 'G341100', // Rotkohl roh
  'Sauerkraut': 'G345902', // Sauerkraut Konserve, abgetropft
  'Grüne Bohnen': 'G710100', // Bohne grün, roh
  'Rote Bete': 'G613132', // Rote Rübe/Rote Bete, gekocht (vakuumiert)
  'Fenchel': 'G430100', // Gemüsefenchel roh
  'Kohlrabi': 'G331100', // Kohlrabi roh
  'Spargel': 'G450100', // Spargel roh
  'Radieschen': 'G691100', // Radieschen roh
  'Rosenkohl': 'G332100', // Rosenkohl roh
  'Grünkohl': 'G322100', // Grünkohl roh
  'Wirsing': 'G343100', // Wirsing roh
  'Pak Choi': 'G324100', // Pak Choi roh
  'Pastinake': 'G640100', // Pastinake roh
  'Knollensellerie': 'G660100', // Knollensellerie roh
  'Ingwer': 'R211200', // Ingwer/Ingwerwurzel, roh
  'Orange': 'F603100', // Orange roh
  'Mango': 'F516100', // Mango roh
  'Ananas': 'F501100', // Ananas roh
  'Birne': 'F130100', // Birne roh
  'Kiwi': 'F514100', // Kiwi roh
  'Weintrauben': 'F310100', // Weintraube roh
  'Datteln': 'F504400', // Dattel getrocknet
  'Rosinen': 'F840100', // Rosine/Sultanine
  'Pflaumen': 'F220100', // Pflaume roh
  'Apfelmus': 'Y864112', // Apfelmus ungesüßt
};

// Ohne passenden BLS-Eintrag: Kokosmilch light (fettreduzierte Kokosmilch gibt es im BLS nicht) und Gewürze (in kleinen Mengen vernachlässigt).
// [Eiweiß, Kohlenhydrate, Zucker, Fett, Ballaststoffe]; kcal steht in FOODS.
export const NOT_FROM_BLS = ['Kokosmilch light', 'Gewürze'];
const NOT_FROM_BLS_VALUES = { 'Kokosmilch light': [0.8, 2, 1.5, 7, 0.2], 'Gewürze': [0, 0, 0, 0, 0] };

// [Eiweiß, Kohlenhydrate, Zucker, freier Zucker, Fett, Ballaststoffe] pro 100 g
const NUTR = {};
// Mineralstoffe und Vitamine je 100 g aus dem BLS (null = Quelle nennt keinen Wert). Nur gefüllt, wenn bls.json sie enthält.
export const MICROS = [
  { id: 'fe', name: 'Eisen', unit: 'mg' }, { id: 'mg', name: 'Magnesium', unit: 'mg' }, { id: 'b12', name: 'Vitamin B12', unit: 'µg' },
  { id: 'zn', name: 'Zink', unit: 'mg' }, { id: 'ca', name: 'Calcium', unit: 'mg' }, { id: 'fol', name: 'Folat', unit: 'µg' },
  { id: 'vd', name: 'Vitamin D', unit: 'µg' }, { id: 'jod', name: 'Jod', unit: 'µg' }
];
const MICRO = {};
let microsLoaded = false;
export function hasMicros() { return microsLoaded; }
for (const [name, v] of Object.entries(NOT_FROM_BLS_VALUES)) NUTR[name] = [v[0], v[1], v[2], 0, v[3], v[4]];

/**
 * Füllt kcal, Makros und Mikronährstoffe je Zutat aus den BLS-Daten. lookup('bls:<Code>') → Lebensmittel der App
 * (k, p, c, su, fs, f, fi und Mikro-Felder je 100 g) oder null. Mehrere Codes = Mittelwert. Gibt true zurück, wenn
 * alle Codes gefunden wurden. Kann mehrfach aufgerufen werden.
 */
export function prepareIngredients(lookup) {
  let missing = 0;
  microsLoaded = false;
  for (const food of FOODS) {
    const code = BLS_CODES[food.name];
    if (!code) continue;
    const rows = code.split('+').map((c) => lookup('bls:' + c)).filter(Boolean);
    if (!rows.length) { missing++; food.kcal = 0; NUTR[food.name] = [0, 0, 0, 0, 0, 0]; continue; }
    const avg = (k) => rows.reduce((s, r) => s + (r[k] || 0), 0) / rows.length;
    food.kcal = Math.round(avg('k'));
    NUTR[food.name] = [avg('p'), avg('c'), avg('su'), avg('fs'), avg('f'), avg('fi')];
    // Mikronährstoffe nur, wenn jede verwendete BLS-Zeile einen Wert hat
    MICRO[food.name] = {};
    for (const m of MICROS) {
      if (rows.every((r) => r[m.id] != null)) { MICRO[food.name][m.id] = avg(m.id); microsLoaded = true; }
    }
  }
  ready = true;
  return missing === 0;
}
let ready = false;
export const ingredientsReady = () => ready;
export const blsCodeOf = (name) => BLS_CODES[name] || null;

// Gramm pro Handvoll, Dose (abgetropft) und Scheibe
const HAND = { 'Weintrauben': 80, 'Radieschen': 60, 'Grünkohl': 40, 'Spinat': 30, 'Beeren': 70, 'Erbsen': 60, 'Salat': 30, 'Gewürze': 10, 'Nüsse': 25, 'Champignons': 50 };
const DOSE = { 'Kichererbsen': 240, 'Kidneybohnen': 240, 'Sauerkraut': 500, 'Passierte Tomaten': 400, 'Tomaten': 400, 'Thunfisch': 150, 'Mais': 140, 'Kokosmilch': 400, 'Kokosmilch light': 400 };
const SCHEIBE = { 'Brot': 50, 'Toast': 25, 'Käse': 20, 'Schinken': 20, 'Salami': 8, 'Leberkäse': 100, 'Ananas': 60, 'Knäckebrot': 10 };

export const NUTRIENTS = [
  { id: 'protein', name: 'Eiweiß' },
  { id: 'kh', name: 'Kohlenhydrate' },
  { id: 'zucker', name: 'davon Zucker' },
  { id: 'zugesetzt', name: 'freier Zucker' },
  { id: 'fett', name: 'Fett' },
  { id: 'ballast', name: 'Ballaststoffe' }
];

export function emptyNutrients() {
  const n = { kcal: 0, protein: 0, kh: 0, zucker: 0, zugesetzt: 0, fruktose: 0, fett: 0, ballast: 0 };
  // je Mikronährstoff der Wert und wie viele Zutaten keinen Wert in der Quelle haben (miss_…)
  for (const m of MICROS) { n[m.id] = 0; n['miss_' + m.id] = 0; }
  return n;
}
// Mikronährstoffe einer Zutat je 100 g (für den Vorrat); null, wenn unbekannt
export function microsOf(food) { return (food && MICRO[food.name]) || null; }

export function addNutrients(a, b, factor = 1) {
  const out = { ...a };
  for (const k of Object.keys(out)) out[k] += ((b && b[k]) || 0) * factor;
  return out;
}

// Nährwerte einer Menge in Gramm
export function nutrientsFor(food, grams, kcal100) {
  const n = emptyNutrients();
  if (!food && kcal100 == null) return n;
  const v = (food && NUTR[food.name]) || [0, 0, 0, 0, 0, 0];
  const f = grams / 100;
  n.kcal = (kcal100 != null && kcal100 !== '' ? Number(kcal100) : food.kcal) * f;
  if (!food) for (const m of MICROS) n['miss_' + m.id] = 1;
  if (food) {
    [n.protein, n.kh, n.zucker, n.zugesetzt, n.fett, n.ballast] = v.map((x) => x * f);
    // Gewürze in Rezeptmengen sind zu wenig, um zu zählen; sonst fehlt der Wert ehrlich
    const mic = MICRO[food.name] || {};
    for (const m of MICROS) {
      if (mic[m.id] != null) n[m.id] = mic[m.id] * f;
      else if (food.name !== 'Gewürze' && grams > 0) n['miss_' + m.id] = 1;
    }
  }
  return n;
}

// ---------- Zutatenzeilen der fertigen Rezepte lesen und skalieren ----------

const FRACTIONS = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };
const UNIT_WORDS = {
  g: 'g', ml: 'ml', el: 'el', tl: 'tl', handvoll: 'hand', dose: 'dose', dosen: 'dose', scheibe: 'scheibe', scheiben: 'scheibe', stück: 'stueck'
};
const UNIT_LABEL = { g: 'g', ml: 'ml', el: 'EL', tl: 'TL', hand: 'Handvoll', stueck: 'Stück' };
const PLURAL = {
  Zwiebel: 'Zwiebeln', Möhre: 'Möhren', Tomate: 'Tomaten', Banane: 'Bananen', Knoblauchzehe: 'Knoblauchzehen', Süßkartoffel: 'Süßkartoffeln',
  Avocado: 'Avocados', Gurke: 'Gurken', Lachsfilet: 'Lachsfilets', Paprika: 'Paprika', Zucchini: 'Zucchini', Brokkoli: 'Brokkoli', Zitrone: 'Zitronen',
  Scheibe: 'Scheiben', Dose: 'Dosen', Ei: 'Eier', Tortilla: 'Tortillas', Apfel: 'Äpfel', Kartoffel: 'Kartoffeln', Mozzarella: 'Mozzarella'
};

// „½ Dose Kichererbsen“ → { amount: 0.5, unit: 'dose', name: 'Kichererbsen' }; ohne Menge (z. B. „Salz, Pfeffer“) ist amount null
export function parseIngredient(text) {
  const m = String(text).match(/^\s*(\d+(?:[.,]\d+)?)?\s*([½¼¾⅓⅔])?\s+(.*)$/) || [];
  let amount = null;
  if (m[1] || m[2]) amount = (m[1] ? Number(m[1].replace(',', '.')) : 0) + (m[2] ? FRACTIONS[m[2]] : 0);
  let rest = amount === null ? String(text) : m[3];
  let unit = 'stueck';
  if (amount !== null) {
    const w = rest.split(/\s+/)[0];
    const u = UNIT_WORDS[w.toLowerCase()];
    if (u) { unit = u; rest = rest.slice(w.length).trim(); }
  }
  return { amount, unit, unitWord: amount !== null && UNIT_WORDS[String(m[3] || '').split(/\s+/)[0].toLowerCase()] ? String(m[3]).split(/\s+/)[0] : '', name: rest };
}

function gramsParsed(p, food) {
  const a = p.amount || 0;
  if (!food) return 0;
  switch (p.unit) {
    case 'g': case 'ml': return a;
    case 'el': return a * (food.el || 15);
    case 'tl': return a * (food.el || 15) / 3;
    case 'hand': return a * (HAND[food.name] || 30);
    case 'dose': return a * (DOSE[food.name] || 400);
    case 'scheibe': return a * (SCHEIBE[food.name] || 40);
    default: return a * (food.piece || 100);
  }
}

// Nährwerte einer Zutatenzeile wie „60 g Reis“
export function nutrientsOfText(text) {
  const p = parseIngredient(text);
  if (p.amount === null) return emptyNutrients();
  const food = findFood(p.name.replace(/[()]/g, ' '));
  return nutrientsFor(food, gramsParsed(p, food));
}

// Gewicht einer Zutatenzeile in Gramm (ml zählen wie g, unbekannte Zutaten 0)
export function gramsOfText(text) {
  const p = parseIngredient(text);
  if (p.amount === null) return 0;
  return gramsParsed(p, findFood(p.name.replace(/[()]/g, ' ')));
}

function fmtAmount(x) {
  const whole = Math.floor(x + 1e-9);
  const frac = x - whole;
  const nice = [[0.25, '¼'], [0.5, '½'], [0.75, '¾']].find(([v]) => Math.abs(frac - v) < 0.04);
  if (frac < 0.04) return String(whole);
  if (nice) return whole ? `${whole} ${nice[1]}` : nice[1];
  return String(Math.round(x * 10) / 10).replace('.', ',');
}

// Skaliert eine Zutatenzeile, z. B. („½ Dose Kichererbsen“, 3) → „1 ½ Dosen Kichererbsen“
export function scaleIngredient(text, factor) {
  if (factor === 1) return text;
  const p = parseIngredient(text);
  if (p.amount === null) return text;
  let x = p.amount * factor;
  if (p.unit === 'g' || p.unit === 'ml') x = x >= 20 ? Math.round(x / 5) * 5 : Math.round(x);
  else x = Math.round(x * 4) / 4;
  const many = x > 1;
  let word = p.unitWord;
  if (word && many && PLURAL[word]) word = PLURAL[word];
  let name = p.name;
  if (!word && many) name = name.replace(/^(\S+)/, (w) => PLURAL[w] || w).replace(/(\S+)$/, (w) => (p.name.split(' ').length > 1 && PLURAL[w] ? PLURAL[w] : w));
  return `${fmtAmount(x)} ${word ? word + ' ' : ''}${name}`;
}
