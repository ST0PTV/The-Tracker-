// Rezepte ab 0.2.4 (104): eigene Fassungen klassischer Gerichte für The Tracker, geschrieben 2026-10-29.
// Keine Übernahme aus einer bestimmten Sammlung; eigene Mengen und Schritte, keine Bilder. Lizenz wie das Repo (MIT).
// Gleiches Format wie recipe-data.js (Rezeptbuch, JuliaKelp, MIT): je 1 Portion; kcal sind Startwerte, die App rechnet
// kcal und Nährwerte aus den Zutaten (BLS 4.0, ingredients.js). allergens: nur die sechs Gruppen des Rezeptbuchs;
// die übrigen Hauptallergene leitet recipes.allergensOf aus den Zutaten ab. Kein Fisch, keine Meeresfrüchte (Nutzerwunsch).
// Erzeugt mit einem Hilfsskript, das jede Zutat gegen ingredients.js prüft; tests/recipe-data.test.js prüft erneut.

export const RECIPES_2 = [
  // ---------- Fleisch – Mittag und Abend ----------
  {
    id: 'puten-geschnetzeltes-paprika',
    name: 'Putengeschnetzeltes mit Paprika und Reis',
    meals: ['mittag', 'abend'],
    time: 20, mealprep: true,
    kcal: 620,
    diet: 'fleisch',
    allergens: ['laktose'],
    foods: ['Reis', 'Pute', 'Paprika'],
    ingredients: ['60 g Reis', '150 g Putenbrust', '1 Paprika', '½ Zwiebel', '50 ml Kochsahne', '1 TL Öl', 'Salz, Pfeffer, Paprikapulver'],
    steps: [
      'Reis nach Packung garen.',
      'Putenbrust in Streifen schneiden und in Öl kräftig anbraten.',
      'Zwiebel und Paprika in Streifen dazugeben und 4 Minuten mitbraten.',
      'Sahne angießen, würzen und kurz einkochen lassen.',
      'Mit dem Reis anrichten.'
    ],
    tint: '#F3C9A8'
  },
  {
    id: 'schweinefilet-bohnen-kartoffeln',
    name: 'Schweinefilet mit grünen Bohnen und Kartoffeln',
    meals: ['abend'],
    time: 30,
    kcal: 490,
    diet: 'fleisch',
    allergens: ['laktose'],
    foods: ['Schweinefleisch', 'Kartoffeln', 'Bohnen'],
    ingredients: ['150 g Schweinefilet', '250 g Kartoffeln', '150 g grüne Bohnen', '1 TL Öl', '1 TL Butter', 'Salz, Pfeffer, Thymian'],
    steps: [
      'Kartoffeln in Salzwasser 20 Minuten kochen.',
      'Bohnen putzen und die letzten 8 Minuten mitgaren.',
      'Filet in 3 Medaillons schneiden, salzen und in Öl je Seite 3–4 Minuten braten.',
      'Bohnen in der Butter schwenken, mit Thymian und Pfeffer würzen.',
      'Alles zusammen anrichten.'
    ],
    tint: '#F7D2B0'
  },
  {
    id: 'rindergulasch-nudeln',
    name: 'Rindergulasch mit Paprika und Nudeln',
    meals: ['mittag', 'abend'],
    time: 45, mealprep: true,
    kcal: 570,
    diet: 'fleisch',
    allergens: ['gluten'],
    foods: ['Rindfleisch', 'Paprika', 'Nudeln'],
    ingredients: ['150 g Rindergulasch', '1 Zwiebel', '1 Paprika', '1 EL Tomatenmark', '200 ml Gemüsebrühe', '1 TL Öl', '70 g Bandnudeln', 'Salz, Paprikapulver, Kümmel'],
    steps: [
      'Fleisch in Öl portionsweise scharf anbraten.',
      'Zwiebel würfeln, dazugeben und glasig werden lassen. Tomatenmark kurz mitrösten.',
      'Mit Brühe ablöschen, würzen und zugedeckt 35 Minuten schmoren.',
      'Paprika würfeln und die letzten 10 Minuten mitgaren.',
      'Nudeln kochen und mit dem Gulasch servieren. Hält sich 3 Tage im Kühlschrank.'
    ],
    tint: '#E8DCCB'
  },
  {
    id: 'chili-con-carne',
    name: 'Chili con Carne mit Reis',
    meals: ['mittag', 'abend'],
    time: 30, mealprep: true,
    kcal: 790,
    diet: 'fleisch',
    allergens: [],
    foods: ['Rindfleisch', 'Paprika', 'Bohnen', 'Mais', 'Reis'],
    ingredients: ['100 g Rinderhack', '1 Zwiebel', '1 Paprika', '½ Dose Kidneybohnen', '3 EL Mais', '200 g passierte Tomaten', '1 TL Öl', '60 g Reis', 'Salz, Kreuzkümmel, Chilipulver'],
    steps: [
      'Reis garen.',
      'Hack in Öl krümelig braten, Zwiebel- und Paprikawürfel mitbraten.',
      'Tomaten, abgespülte Bohnen und Mais dazugeben.',
      'Mit Kreuzkümmel, Chili und Salz würzen und 15 Minuten köcheln.',
      'Mit Reis servieren.'
    ],
    tint: '#F2C2B5'
  },
  {
    id: 'haehnchen-ofenkartoffeln',
    name: 'Hähnchen mit Ofenkartoffeln und Gemüse',
    meals: ['abend'],
    time: 40, mealprep: true,
    kcal: 540,
    diet: 'fleisch',
    allergens: [],
    foods: ['Hähnchen', 'Kartoffeln', 'Zucchini', 'Paprika'],
    ingredients: ['150 g Hähnchenbrust', '250 g Kartoffeln', '½ Zucchini', '1 Paprika', '1 EL Öl', 'Salz, Pfeffer, Rosmarin'],
    steps: [
      'Ofen auf 200 °C vorheizen.',
      'Kartoffeln in Spalten, Zucchini und Paprika in Stücke schneiden.',
      'Mit Öl, Salz und Rosmarin mischen und 20 Minuten backen.',
      'Hähnchen würzen, aufs Blech legen und weitere 18 Minuten garen, bis es innen nicht mehr rosa ist.'
    ],
    tint: '#F7DDB8'
  },
  {
    id: 'kasseler-sauerkraut-pueree',
    name: 'Kasseler mit Sauerkraut und Püree',
    meals: ['abend'],
    time: 30,
    kcal: 490,
    diet: 'fleisch',
    allergens: ['laktose'],
    foods: ['Schweinefleisch', 'Kartoffeln'],
    ingredients: ['150 g Kasseler', '200 g Sauerkraut', '250 g Kartoffeln', '50 ml Milch', '1 TL Butter', 'Salz, Muskat, Lorbeerblatt'],
    steps: [
      'Kartoffeln schälen und in Salzwasser weich kochen.',
      'Sauerkraut mit Lorbeerblatt und etwas Wasser 15 Minuten köcheln.',
      'Kasseler in Scheiben auf das Kraut legen und darin erwärmen.',
      'Kartoffeln mit Milch und Butter zerstampfen, mit Muskat würzen.'
    ],
    tint: '#F3C9A8'
  },
  {
    id: 'bratwurst-rotkohl',
    name: 'Bratwurst mit Rotkohl und Kartoffeln',
    meals: ['abend'],
    time: 35,
    kcal: 550,
    diet: 'fleisch',
    allergens: [],
    foods: ['Kartoffeln'],
    ingredients: ['1 Bratwurst', '200 g Rotkohl', '½ Apfel', '250 g Kartoffeln', '1 TL Öl', 'Salz, Zimt, Lorbeerblatt'],
    steps: [
      'Kartoffeln kochen.',
      'Rotkohl fein schneiden, Apfel würfeln, beides mit etwas Wasser, Salz, Lorbeer und einer Prise Zimt 25 Minuten dünsten.',
      'Bratwurst in Öl rundum braun braten.',
      'Alles zusammen anrichten.'
    ],
    tint: '#F7D2B0'
  },
  {
    id: 'hackbaellchen-tomatensosse',
    name: 'Hackbällchen in Tomatensoße mit Nudeln',
    meals: ['mittag', 'abend'],
    time: 30, mealprep: true,
    kcal: 610,
    diet: 'fleisch',
    allergens: ['gluten'],
    foods: ['Rindfleisch', 'Nudeln'],
    ingredients: ['100 g Hackfleisch', '1 EL Paniermehl', '½ Zwiebel', '200 g passierte Tomaten', '70 g Nudeln', '1 TL Öl', 'Salz, Pfeffer, Oregano'],
    steps: [
      'Hack mit Paniermehl, der Hälfte der fein gehackten Zwiebel, Salz und Pfeffer verkneten und kleine Bällchen formen.',
      'Bällchen in Öl rundum anbraten.',
      'Restliche Zwiebel kurz mitbraten, Tomaten und Oregano dazu, 12 Minuten köcheln.',
      'Nudeln kochen und mit den Bällchen servieren.'
    ],
    tint: '#E8DCCB'
  },
  {
    id: 'pute-reisnudeln-pak-choi',
    name: 'Puten-Pfanne mit Reisnudeln und Pak Choi',
    meals: ['mittag', 'abend'],
    time: 20,
    kcal: 490,
    diet: 'fleisch',
    allergens: ['soja', 'gluten'],
    foods: ['Pute'],
    ingredients: ['150 g Putenbrust', '60 g Reisnudeln', '1 Pak Choi', '1 Möhre', '10 g Ingwer', '1 EL Sojasauce', '1 TL Öl'],
    steps: [
      'Reisnudeln nach Packung einweichen oder kochen.',
      'Pute in Streifen, Möhre in dünne Stifte, Pak Choi in Stücke schneiden. Ingwer reiben.',
      'Pute in Öl anbraten, Möhre und Ingwer 2 Minuten mitbraten.',
      'Pak Choi und Nudeln dazu, mit Sojasauce ablöschen und durchschwenken.'
    ],
    tint: '#F2C2B5'
  },
  {
    id: 'schnitzel-bratkartoffeln',
    name: 'Schnitzel natur mit Bratkartoffeln und Gurkensalat',
    meals: ['abend'],
    time: 30,
    kcal: 510,
    diet: 'fleisch',
    allergens: ['laktose'],
    foods: ['Schweinefleisch', 'Kartoffeln', 'Gurke', 'Joghurt'],
    ingredients: ['150 g Schweineschnitzel', '250 g Kartoffeln', '1 EL Öl', '½ Gurke', '2 EL Joghurt', 'Salz, Pfeffer, Dill'],
    steps: [
      'Kartoffeln in dünne Scheiben schneiden und in der Hälfte des Öls 15 Minuten goldbraun braten.',
      'Gurke hobeln, mit Joghurt, Dill, Salz und Pfeffer anmachen.',
      'Schnitzel flach klopfen, würzen und im restlichen Öl je Seite 3 Minuten braten.',
      'Mit Bratkartoffeln und Salat anrichten.'
    ],
    tint: '#F7DDB8'
  },
  {
    id: 'hack-weisskohl-pfanne',
    name: 'Hack-Weißkohl-Pfanne mit Kartoffeln',
    meals: ['mittag', 'abend'],
    time: 25, mealprep: true,
    kcal: 500,
    diet: 'fleisch',
    allergens: [],
    foods: ['Rindfleisch', 'Kartoffeln'],
    ingredients: ['100 g Hackfleisch', '250 g Weißkohl', '150 g Kartoffeln', '1 Zwiebel', '1 TL Öl', 'Salz, Kümmel, Paprikapulver'],
    steps: [
      'Kartoffeln klein würfeln, Kohl in feine Streifen schneiden, Zwiebel würfeln.',
      'Hack in Öl krümelig braten, Zwiebel und Kartoffeln dazu, 8 Minuten braten.',
      'Kohl unterheben, würzen, einen Schuss Wasser dazu und zugedeckt 10 Minuten garen.'
    ],
    tint: '#F3C9A8'
  },
  {
    id: 'steak-ofenkartoffel-quark',
    name: 'Rindersteak mit Ofenkartoffel und Kräuter-Quark',
    meals: ['abend'],
    time: 40,
    kcal: 510,
    diet: 'fleisch',
    allergens: ['laktose'],
    foods: ['Rindfleisch', 'Kartoffeln', 'Quark'],
    ingredients: ['150 g Rindersteak', '300 g Kartoffeln', '100 g Magerquark', '1 TL Öl', 'Salz, Pfeffer, Schnittlauch'],
    steps: [
      'Kartoffeln waschen, längs halbieren und bei 200 °C 35 Minuten backen.',
      'Quark mit Schnittlauch, Salz und Pfeffer verrühren.',
      'Steak trocken tupfen und in heißem Öl je Seite 2–3 Minuten braten, kurz ruhen lassen.',
      'Steak salzen und mit Kartoffeln und Quark servieren.'
    ],
    tint: '#F7D2B0'
  },
  {
    id: 'haehnchen-fajitas',
    name: 'Hähnchen-Fajitas',
    meals: ['mittag', 'abend'],
    time: 20,
    kcal: 670,
    diet: 'fleisch',
    allergens: ['gluten', 'laktose'],
    foods: ['Hähnchen', 'Paprika', 'Joghurt'],
    ingredients: ['150 g Hähnchenbrust', '2 Tortillas', '1 Paprika', '½ Zwiebel', '2 EL Joghurt', '2 EL Salsa', '1 TL Öl', 'Salz, Kreuzkümmel, Paprikapulver'],
    steps: [
      'Hähnchen, Paprika und Zwiebel in Streifen schneiden.',
      'Hähnchen mit den Gewürzen in Öl anbraten, Gemüse dazu und 5 Minuten weiterbraten.',
      'Tortillas in der trockenen Pfanne kurz erwärmen.',
      'Füllung, Joghurt und Salsa in die Tortillas geben und einrollen.'
    ],
    tint: '#E8DCCB'
  },
  {
    id: 'gyros-pfanne-tzatziki',
    name: 'Gyros-Pfanne mit Tzatziki und Fladenbrot',
    meals: ['mittag', 'abend'],
    time: 20,
    kcal: 550,
    diet: 'fleisch',
    allergens: ['laktose', 'gluten'],
    foods: ['Schweinefleisch', 'Joghurt', 'Gurke'],
    ingredients: ['150 g Schweineschnitzel', '1 Zwiebel', '100 g Joghurt', '100 g Gurke', '1 Knoblauchzehe', '¼ Fladenbrot', '1 TL Öl', 'Salz, Oregano, Paprikapulver'],
    steps: [
      'Fleisch in feine Streifen schneiden und mit Oregano, Paprikapulver und Salz mischen.',
      'Gurke raspeln, ausdrücken und mit Joghurt und Knoblauch zu Tzatziki verrühren.',
      'Fleisch in Öl scharf anbraten, Zwiebelringe dazu und weich braten.',
      'Mit Tzatziki und Fladenbrot servieren.'
    ],
    tint: '#F2C2B5'
  },
  {
    id: 'haehnchen-tomate-bulgur',
    name: 'Hähnchen in Tomaten-Paprika-Soße mit Bulgur',
    meals: ['mittag', 'abend'],
    time: 25, mealprep: true,
    kcal: 530,
    diet: 'fleisch',
    allergens: ['gluten'],
    foods: ['Hähnchen', 'Paprika'],
    ingredients: ['150 g Hähnchenbrust', '60 g Bulgur', '1 Paprika', '200 g passierte Tomaten', '½ Zwiebel', '1 TL Öl', 'Salz, Paprikapulver, Kreuzkümmel'],
    steps: [
      'Bulgur mit der doppelten Menge kochendem Wasser übergießen und 10 Minuten quellen lassen.',
      'Hähnchen würfeln und in Öl anbraten.',
      'Zwiebel und Paprika dazu, 3 Minuten braten.',
      'Tomaten und Gewürze dazugeben und 10 Minuten köcheln. Mit dem Bulgur servieren.'
    ],
    tint: '#F7DDB8'
  },
  {
    id: 'spaghetti-carbonara',
    name: 'Spaghetti Carbonara',
    meals: ['mittag', 'abend'],
    time: 15,
    kcal: 530,
    diet: 'fleisch',
    allergens: ['gluten', 'ei', 'laktose'],
    foods: ['Nudeln', 'Eier'],
    ingredients: ['80 g Spaghetti', '30 g Speckwürfel', '1 Ei', '20 g Parmesan', 'Pfeffer'],
    steps: [
      'Spaghetti in Salzwasser kochen, eine Tasse Kochwasser aufheben.',
      'Speck ohne Fett knusprig braten, Pfanne vom Herd nehmen.',
      'Ei mit Parmesan und viel Pfeffer verquirlen.',
      'Nudeln in die Pfanne geben, Eimasse und einen Schuss Kochwasser unterrühren, bis eine cremige Soße entsteht – nicht mehr erhitzen, sonst stockt das Ei.'
    ],
    tint: '#F3C9A8'
  },
  {
    id: 'lasagne-bolognese',
    name: 'Lasagne mit Hackfleisch',
    meals: ['mittag', 'abend'],
    time: 60, mealprep: true,
    kcal: 680,
    diet: 'fleisch',
    allergens: ['gluten', 'laktose'],
    foods: ['Nudeln', 'Rindfleisch', 'Käse'],
    ingredients: ['60 g Lasagneplatten', '100 g Hackfleisch', '½ Zwiebel', '200 g passierte Tomaten', '100 ml Milch', '1 TL Butter', '1 TL Mehl', '20 g geriebener Käse', 'Salz, Pfeffer, Oregano, Muskat'],
    steps: [
      'Hack mit Zwiebel anbraten, Tomaten und Oregano dazu und 10 Minuten köcheln.',
      'Butter schmelzen, Mehl einrühren, Milch nach und nach dazugeben und zu einer hellen Soße aufkochen, mit Muskat würzen.',
      'In einer kleinen Form Soße, Platten, Hacksoße und helle Soße schichten, mit Käse abschließen.',
      'Bei 180 °C 35 Minuten backen. Lässt sich gut für mehrere Tage vorbereiten.'
    ],
    tint: '#F7D2B0'
  },
  {
    id: 'schweinemedaillons-spaetzle',
    name: 'Schweinemedaillons mit Pilzrahm und Spätzle',
    meals: ['abend'],
    time: 25,
    kcal: 730,
    diet: 'fleisch',
    allergens: ['laktose', 'gluten', 'ei'],
    foods: ['Schweinefleisch', 'Pilze'],
    ingredients: ['150 g Schweinefilet', '150 g Champignons', '50 ml Kochsahne', '150 g Spätzle', '1 TL Öl', 'Salz, Pfeffer, Petersilie'],
    steps: [
      'Filet in Medaillons schneiden und in Öl je Seite 3 Minuten braten, warm stellen.',
      'Pilze in Scheiben im Bratfett anbraten.',
      'Sahne angießen, würzen und kurz einkochen.',
      'Spätzle in der Pfanne oder im Wasser erhitzen und mit Fleisch und Soße anrichten.'
    ],
    tint: '#E8DCCB'
  },
  {
    id: 'haehnchen-brokkoli-nudeln',
    name: 'Hähnchen-Brokkoli-Nudeln mit Frischkäse',
    meals: ['mittag', 'abend'],
    time: 20, mealprep: true,
    kcal: 570,
    diet: 'fleisch',
    allergens: ['gluten', 'laktose'],
    foods: ['Nudeln', 'Hähnchen', 'Brokkoli'],
    ingredients: ['80 g Nudeln', '120 g Hähnchenbrust', '150 g Brokkoli', '30 g Frischkäse', '1 TL Öl', 'Salz, Pfeffer, Zitronenschale'],
    steps: [
      'Nudeln kochen, Brokkoli-Röschen die letzten 4 Minuten mitkochen.',
      'Hähnchen würfeln und in Öl goldbraun braten.',
      'Nudeln und Brokkoli abgießen, etwas Wasser aufheben.',
      'Alles mit Frischkäse und einem Schuss Nudelwasser verrühren und würzen.'
    ],
    tint: '#F2C2B5'
  },
  {
    id: 'gulaschsuppe',
    name: 'Gulaschsuppe mit Brot',
    meals: ['mittag', 'abend'],
    time: 50, mealprep: true,
    kcal: 530,
    diet: 'fleisch',
    allergens: ['gluten'],
    foods: ['Rindfleisch', 'Kartoffeln', 'Paprika', 'Brot'],
    ingredients: ['120 g Rindergulasch', '150 g Kartoffeln', '1 Paprika', '1 Zwiebel', '1 EL Tomatenmark', '400 ml Gemüsebrühe', '1 TL Öl', '1 Scheibe Brot', 'Salz, Paprikapulver, Kümmel, Majoran'],
    steps: [
      'Fleisch klein würfeln und in Öl kräftig anbraten.',
      'Zwiebel dazu, Tomatenmark und Paprikapulver kurz mitrösten.',
      'Brühe und Gewürze dazu, 30 Minuten köcheln.',
      'Kartoffeln und Paprika würfeln, dazugeben und weitere 15 Minuten garen.',
      'Mit Brot servieren.'
    ],
    tint: '#F7DDB8'
  },
  {
    id: 'linseneintopf-wuerstchen',
    name: 'Linseneintopf mit Würstchen',
    meals: ['mittag', 'abend'],
    time: 40, mealprep: true,
    kcal: 560,
    diet: 'fleisch',
    allergens: [],
    foods: ['Linsen', 'Kartoffeln'],
    ingredients: ['60 g Berglinsen', '150 g Kartoffeln', '1 Möhre', '50 g Lauch', '1 Wiener Würstchen', '400 ml Gemüsebrühe', '1 TL Öl', 'Salz, Pfeffer, Essig'],
    steps: [
      'Möhre, Kartoffeln und Lauch klein schneiden und in Öl andünsten.',
      'Linsen und Brühe dazugeben und 30 Minuten köcheln.',
      'Würstchen in Scheiben schneiden und darin erwärmen.',
      'Mit Salz, Pfeffer und einem Spritzer Essig abschmecken.'
    ],
    tint: '#F3C9A8'
  },
  {
    id: 'putenschnitzel-gurkensalat',
    name: 'Putenschnitzel mit Kartoffeln und Gurkensalat',
    meals: ['mittag', 'abend'],
    time: 25,
    kcal: 450,
    diet: 'fleisch',
    allergens: ['laktose'],
    foods: ['Pute', 'Kartoffeln', 'Gurke', 'Joghurt'],
    ingredients: ['150 g Putenschnitzel', '250 g Kartoffeln', '½ Gurke', '2 EL Joghurt', '1 TL Öl', 'Salz, Pfeffer, Dill'],
    steps: [
      'Kartoffeln kochen.',
      'Gurke in dünne Scheiben schneiden und mit Joghurt, Dill, Salz und Pfeffer mischen.',
      'Schnitzel würzen und in Öl je Seite 3 Minuten braten.',
      'Alles zusammen anrichten.'
    ],
    tint: '#F7D2B0'
  },
  {
    id: 'haehnchen-couscous-salat',
    name: 'Hähnchen-Couscous-Salat mit Feta',
    meals: ['mittag'],
    time: 20, mealprep: true,
    kcal: 500,
    diet: 'fleisch',
    allergens: ['gluten', 'laktose'],
    foods: ['Hähnchen', 'Tomaten', 'Gurke', 'Feta'],
    ingredients: ['60 g Couscous', '120 g Hähnchenbrust', '1 Tomate', '100 g Gurke', '30 g Feta', '1 TL Öl', '1 EL Zitronensaft', 'Salz, Pfeffer, Minze'],
    steps: [
      'Couscous mit kochendem Wasser übergießen und 5 Minuten quellen lassen.',
      'Hähnchen würfeln, würzen und in Öl braten.',
      'Tomate und Gurke würfeln, Feta zerbröseln.',
      'Alles mit Zitronensaft, Salz, Pfeffer und Minze mischen. Hält sich gut bis zum nächsten Mittag.'
    ],
    tint: '#E8DCCB'
  },
  {
    id: 'puten-avocado-wrap',
    name: 'Puten-Wrap mit Avocado',
    meals: ['mittag', 'abend'],
    time: 15,
    kcal: 620,
    diet: 'fleisch',
    allergens: ['gluten'],
    foods: ['Pute', 'Avocado', 'Tomaten'],
    ingredients: ['2 Tortillas', '100 g Putenbrust', '½ Avocado', '1 Tomate', '1 Handvoll Salat', '1 TL Öl', 'Salz, Pfeffer, Limettensaft'],
    steps: [
      'Putenbrust in Streifen schneiden, würzen und in Öl braten.',
      'Avocado mit Limettensaft und Salz zerdrücken.',
      'Tortillas mit Avocado bestreichen, mit Salat, Tomatenscheiben und Pute belegen und einrollen.'
    ],
    tint: '#F2C2B5'
  },
  {
    id: 'rinderhack-reis-bowl',
    name: 'Rinderhack-Bowl mit Reis und Gemüse',
    meals: ['mittag', 'abend'],
    time: 20, mealprep: true,
    kcal: 540,
    diet: 'fleisch',
    allergens: ['soja', 'gluten'],
    foods: ['Reis', 'Rindfleisch', 'Gurke'],
    ingredients: ['60 g Reis', '100 g Rinderhack', '1 Möhre', '100 g Gurke', '1 EL Sojasauce', '1 TL Sesam', '1 Knoblauchzehe', '1 TL Öl'],
    steps: [
      'Reis garen.',
      'Hack in Öl krümelig braten, Knoblauch und Sojasauce dazugeben.',
      'Möhre raspeln, Gurke in Scheiben schneiden.',
      'Reis, Hack und Gemüse in eine Schale geben und mit Sesam bestreuen.'
    ],
    tint: '#F7DDB8'
  },
  {
    id: 'haehnchen-kokos-suppe',
    name: 'Hähnchen-Kokos-Suppe mit Reisnudeln',
    meals: ['mittag', 'abend'],
    time: 25,
    kcal: 670,
    diet: 'fleisch',
    allergens: ['soja', 'gluten'],
    foods: ['Hähnchen'],
    ingredients: ['120 g Hähnchenbrust', '40 g Reisnudeln', '150 ml Kokosmilch', '250 ml Gemüsebrühe', '1 Pak Choi', '10 g Ingwer', '1 EL Limettensaft', '1 TL Sojasauce'],
    steps: [
      'Brühe mit Kokosmilch und geriebenem Ingwer aufkochen.',
      'Hähnchen in dünne Streifen schneiden und 6 Minuten darin garen.',
      'Pak Choi und Reisnudeln dazugeben und 3 Minuten ziehen lassen.',
      'Mit Limettensaft und Sojasauce abschmecken.'
    ],
    tint: '#F3C9A8'
  },
  {
    id: 'schwein-suess-sauer',
    name: 'Schweinefleisch süß-sauer mit Reis',
    meals: ['mittag', 'abend'],
    time: 25,
    kcal: 540,
    diet: 'fleisch',
    allergens: ['soja', 'gluten'],
    foods: ['Schweinefleisch', 'Reis', 'Paprika'],
    ingredients: ['150 g Schweineschnitzel', '60 g Reis', '1 Paprika', '100 g Ananas', '1 EL Tomatenmark', '1 EL Sojasauce', '1 TL Zucker', '1 TL Öl', 'Essig'],
    steps: [
      'Reis garen.',
      'Fleisch in Würfel schneiden und in Öl rundum anbraten.',
      'Paprika und Ananas würfeln und 3 Minuten mitbraten.',
      'Tomatenmark, Sojasauce, Zucker, einen Schuss Essig und 4 EL Wasser verrühren, dazugeben und kurz einkochen.',
      'Mit Reis servieren.'
    ],
    tint: '#F7D2B0'
  },
  {
    id: 'kartoffel-lauch-suppe-speck',
    name: 'Kartoffel-Lauch-Suppe mit Speck',
    meals: ['mittag', 'abend'],
    time: 30, mealprep: true,
    kcal: 490,
    diet: 'fleisch',
    allergens: ['laktose', 'gluten'],
    foods: ['Kartoffeln', 'Brot'],
    ingredients: ['250 g Kartoffeln', '100 g Lauch', '20 g Speckwürfel', '400 ml Gemüsebrühe', '2 EL Schmand', '1 Scheibe Brot', 'Salz, Pfeffer, Majoran'],
    steps: [
      'Speck in einem Topf auslassen, Lauchringe darin andünsten.',
      'Kartoffeln würfeln, mit der Brühe dazugeben und 20 Minuten köcheln.',
      'Die Hälfte der Suppe pürieren und zurückgeben.',
      'Mit Schmand, Majoran, Salz und Pfeffer abschmecken. Brot dazu.'
    ],
    tint: '#E8DCCB'
  },
  {
    id: 'gruenkohl-kasseler',
    name: 'Grünkohl mit Kasseler und Kartoffeln',
    meals: ['abend'],
    time: 45, mealprep: true,
    kcal: 490,
    diet: 'fleisch',
    allergens: [],
    foods: ['Schweinefleisch', 'Kartoffeln'],
    ingredients: ['200 g Grünkohl (TK)', '120 g Kasseler', '250 g Kartoffeln', '½ Zwiebel', '1 TL Öl', '1 TL Senf', 'Salz, Pfeffer'],
    steps: [
      'Zwiebel in Öl andünsten, Grünkohl und eine Tasse Wasser dazu, 30 Minuten zugedeckt garen.',
      'Kartoffeln kochen.',
      'Kasseler in Scheiben die letzten 10 Minuten im Kohl erwärmen.',
      'Mit Senf, Salz und Pfeffer abschmecken.'
    ],
    tint: '#F2C2B5'
  },
  {
    id: 'pizza-toast-salami',
    name: 'Pizza-Toast mit Salami',
    meals: ['abend'],
    time: 15,
    kcal: 370,
    diet: 'fleisch',
    allergens: ['gluten', 'laktose'],
    foods: ['Käse', 'Paprika'],
    ingredients: ['2 Scheiben Toast', '3 Scheiben Salami', '3 EL passierte Tomaten', '30 g geriebener Käse', '½ Paprika', 'Oregano'],
    steps: [
      'Ofen auf 200 °C vorheizen.',
      'Toast mit Tomaten bestreichen und mit Oregano würzen.',
      'Mit Salami und Paprikastreifen belegen, Käse darüber.',
      '8–10 Minuten backen, bis der Käse schmilzt.'
    ],
    tint: '#F7DDB8'
  },
  {
    id: 'currywurst-kartoffelspalten',
    name: 'Currywurst mit Ofen-Kartoffelspalten',
    meals: ['abend'],
    time: 35,
    kcal: 510,
    diet: 'fleisch',
    allergens: [],
    foods: ['Kartoffeln'],
    ingredients: ['1 Bratwurst', '250 g Kartoffeln', '100 g passierte Tomaten', '1 EL Tomatenmark', '1 TL Zucker', '1 TL Öl', 'Salz, Currypulver, Paprikapulver'],
    steps: [
      'Kartoffeln in Spalten schneiden, mit Öl und Salz mischen und bei 220 °C 25 Minuten backen.',
      'Tomaten, Tomatenmark, Zucker und Currypulver aufkochen.',
      'Bratwurst braten und in Scheiben schneiden.',
      'Mit der Soße übergießen und mit Curry bestreuen.'
    ],
    tint: '#F3C9A8'
  },
  {
    id: 'haehnchen-spargel-pfanne',
    name: 'Hähnchen-Spargel-Pfanne mit Kartoffeln',
    meals: ['mittag', 'abend'],
    time: 25,
    kcal: 460,
    diet: 'fleisch',
    allergens: ['laktose'],
    foods: ['Hähnchen', 'Kartoffeln'],
    ingredients: ['150 g Hähnchenbrust', '250 g grüner Spargel', '200 g Kartoffeln', '1 TL Öl', '1 TL Butter', 'Salz, Pfeffer, Zitronensaft'],
    steps: [
      'Kartoffeln kochen und halbieren.',
      'Spargel unten schälen und in Stücke schneiden.',
      'Hähnchen in Öl anbraten, Spargel dazu und 6 Minuten braten.',
      'Kartoffeln und Butter dazugeben, mit Salz, Pfeffer und Zitrone abschmecken.'
    ],
    tint: '#F7D2B0'
  },
  // ---------- Frühstück ----------
  {
    id: 'skyr-beeren-hafer',
    name: 'Skyr mit Beeren und Haferflocken',
    meals: ['fruehstueck'],
    time: 5,
    kcal: 250,
    diet: 'vegetarisch',
    allergens: ['laktose', 'gluten'],
    foods: ['Beeren', 'Haferflocken'],
    ingredients: ['150 g Skyr', '1 Handvoll Beeren (auch TK)', '30 g Haferflocken', '1 TL Honig'],
    steps: [
      'Skyr in eine Schale geben.',
      'Haferflocken und Beeren darüber, mit Honig beträufeln.'
    ],
    tint: '#F5E6B8'
  },
  {
    id: 'quark-apfel-zimt',
    name: 'Apfel-Zimt-Quark mit Nüssen',
    meals: ['fruehstueck'],
    time: 5,
    kcal: 250,
    diet: 'vegetarisch',
    allergens: ['laktose', 'nuesse'],
    foods: ['Quark'],
    ingredients: ['150 g Magerquark', '30 ml Milch', '1 Apfel', '1 EL Nüsse', 'Zimt'],
    steps: [
      'Quark mit Milch glatt rühren.',
      'Apfel klein würfeln und unterheben.',
      'Mit gehackten Nüssen und Zimt bestreuen.'
    ],
    tint: '#F2D4DC'
  },
  {
    id: 'porridge-banane-erdnuss',
    name: 'Bananen-Porridge mit Erdnussbutter',
    meals: ['fruehstueck'],
    time: 10,
    kcal: 340,
    diet: 'vegetarisch',
    allergens: ['gluten', 'laktose', 'nuesse'],
    foods: ['Haferflocken', 'Banane'],
    ingredients: ['50 g Haferflocken', '200 ml Milch', '½ Banane', '1 TL Erdnussbutter', 'Zimt'],
    steps: [
      'Haferflocken mit Milch unter Rühren 4 Minuten köcheln.',
      'Banane in Scheiben schneiden.',
      'Porridge mit Banane, Erdnussbutter und Zimt anrichten.'
    ],
    tint: '#E3DCF2'
  },
  {
    id: 'chia-mango',
    name: 'Chia-Pudding mit Mango',
    meals: ['fruehstueck'],
    time: 5, serve: 2, prep: true,
    kcal: 250,
    diet: 'vegan',
    allergens: ['gluten'],
    foods: [],
    ingredients: ['25 g Chiasamen', '150 ml Haferdrink', '½ Mango', '1 TL Ahornsirup'],
    steps: [
      'Chiasamen mit Haferdrink und Ahornsirup verrühren, nach 10 Minuten nochmals umrühren.',
      'Über Nacht im Kühlschrank quellen lassen.',
      'Morgens Mango würfeln und darauf geben.'
    ],
    tint: '#DDEAF4'
  },
  {
    id: 'ruehrei-schinken-brot',
    name: 'Rührei mit Schinken auf Vollkornbrot',
    meals: ['fruehstueck'],
    time: 10,
    kcal: 350,
    diet: 'fleisch',
    allergens: ['ei', 'gluten', 'laktose'],
    foods: ['Eier', 'Brot'],
    ingredients: ['2 Eier', '2 Scheiben Schinken', '1 Scheibe Vollkornbrot', '1 TL Butter', 'Salz, Pfeffer, Schnittlauch'],
    steps: [
      'Eier verquirlen und würzen.',
      'Schinken in Streifen schneiden und in der Butter kurz anbraten.',
      'Eier dazugeben und bei mittlerer Hitze stocken lassen.',
      'Auf dem Brot anrichten, Schnittlauch darüber.'
    ],
    tint: '#F5E1A4'
  },
  {
    id: 'salami-frischkaese-brot',
    name: 'Vollkornbrot mit Frischkäse und Salami',
    meals: ['fruehstueck'],
    time: 5,
    kcal: 400,
    diet: 'fleisch',
    allergens: ['gluten', 'laktose'],
    foods: ['Brot'],
    ingredients: ['2 Scheiben Vollkornbrot', '20 g Frischkäse', '4 Scheiben Salami', '50 g Radieschen'],
    steps: [
      'Brot mit Frischkäse bestreichen.',
      'Mit Salami belegen, Radieschen dazu.'
    ],
    tint: '#F5E6B8'
  },
  {
    id: 'leberkaes-semmel',
    name: 'Leberkässemmel mit Radieschen',
    meals: ['fruehstueck', 'mittag'],
    time: 10,
    kcal: 400,
    diet: 'fleisch',
    allergens: ['gluten'],
    foods: ['Brot'],
    ingredients: ['1 Brötchen', '1 Scheibe Leberkäse', '1 TL Senf', '50 g Radieschen'],
    steps: [
      'Leberkäse in der Pfanne von beiden Seiten kurz anbraten.',
      'Brötchen aufschneiden, mit Senf bestreichen.',
      'Leberkäse hineinlegen, Radieschen dazu.'
    ],
    tint: '#F2D4DC'
  },
  {
    id: 'bauernfruehstueck',
    name: 'Bauernfrühstück mit Speck',
    meals: ['fruehstueck', 'mittag'],
    time: 20,
    kcal: 430,
    diet: 'fleisch',
    allergens: ['ei'],
    foods: ['Kartoffeln', 'Eier'],
    ingredients: ['200 g Kartoffeln', '2 Eier', '20 g Speckwürfel', '½ Zwiebel', '1 TL Öl', 'Salz, Pfeffer, Schnittlauch'],
    steps: [
      'Kartoffeln in dünne Scheiben schneiden und in Öl 12 Minuten braten (gekochte vom Vortag gehen schneller).',
      'Speck und Zwiebel dazu und 3 Minuten mitbraten.',
      'Eier verquirlen, würzen, darübergießen und stocken lassen.',
      'Mit Schnittlauch servieren.'
    ],
    tint: '#E3DCF2'
  },
  {
    id: 'french-toast-beeren',
    name: 'French Toast mit Beeren',
    meals: ['fruehstueck'],
    time: 10,
    kcal: 300,
    diet: 'vegetarisch',
    allergens: ['gluten', 'ei', 'laktose'],
    foods: ['Eier', 'Beeren'],
    ingredients: ['2 Scheiben Toast', '1 Ei', '50 ml Milch', '1 TL Butter', '1 Handvoll Beeren (auch TK)', 'Zimt'],
    steps: [
      'Ei, Milch und Zimt verquirlen.',
      'Toastscheiben kurz darin wenden.',
      'In Butter von beiden Seiten goldbraun braten.',
      'Mit Beeren servieren.'
    ],
    tint: '#DDEAF4'
  },
  {
    id: 'hafer-pancakes-banane',
    name: 'Haferflocken-Pancakes mit Joghurt',
    meals: ['fruehstueck'],
    time: 15,
    kcal: 410,
    diet: 'vegetarisch',
    allergens: ['ei', 'gluten', 'laktose'],
    foods: ['Banane', 'Eier', 'Haferflocken', 'Joghurt'],
    ingredients: ['1 Banane', '2 Eier', '30 g Haferflocken', '1 TL Öl', '2 EL Joghurt'],
    steps: [
      'Banane zerdrücken, mit Eiern und Haferflocken zu einem Teig verrühren.',
      'In Öl kleine Pancakes von beiden Seiten je 2 Minuten backen.',
      'Mit Joghurt servieren.'
    ],
    tint: '#F5E1A4'
  },
  {
    id: 'knaecke-huettenkaese',
    name: 'Knäckebrot mit Hüttenkäse und Gurke',
    meals: ['fruehstueck'],
    time: 5,
    kcal: 230,
    diet: 'vegetarisch',
    allergens: ['gluten', 'laktose'],
    foods: ['Gurke'],
    ingredients: ['3 Knäckebrot', '150 g Hüttenkäse', '100 g Gurke', '50 g Radieschen', 'Salz, Pfeffer, Schnittlauch'],
    steps: [
      'Gurke und Radieschen in Scheiben schneiden.',
      'Hüttenkäse mit Schnittlauch, Salz und Pfeffer würzen.',
      'Auf das Knäckebrot geben und mit dem Gemüse belegen.'
    ],
    tint: '#F5E6B8'
  },
  {
    id: 'buttermilch-muesli-birne',
    name: 'Buttermilch-Müsli mit Birne',
    meals: ['fruehstueck'],
    time: 5,
    kcal: 370,
    diet: 'vegetarisch',
    allergens: ['gluten', 'laktose'],
    foods: ['Haferflocken'],
    ingredients: ['50 g Haferflocken', '200 ml Buttermilch', '1 Birne', '1 EL Rosinen'],
    steps: [
      'Birne würfeln.',
      'Haferflocken, Rosinen und Birne in eine Schale geben.',
      'Mit Buttermilch übergießen und kurz ziehen lassen.'
    ],
    tint: '#F2D4DC'
  },
  {
    id: 'vegane-smoothie-bowl',
    name: 'Vegane Smoothie-Bowl mit Kürbiskernen',
    meals: ['fruehstueck'],
    time: 5,
    kcal: 320,
    diet: 'vegan',
    allergens: ['soja', 'gluten'],
    foods: ['Banane', 'Beeren', 'Haferflocken'],
    ingredients: ['1 Banane', '1 Handvoll Beeren (auch TK)', '150 g Sojajoghurt', '20 g Haferflocken', '1 EL Kürbiskerne'],
    steps: [
      'Halbe Banane, Beeren und Sojajoghurt cremig pürieren.',
      'In eine Schale füllen.',
      'Mit restlicher Banane, Haferflocken und Kürbiskernen belegen.'
    ],
    tint: '#E3DCF2'
  },
  {
    id: 'griessbrei-apfelmus',
    name: 'Grießbrei mit Apfelmus',
    meals: ['fruehstueck', 'snack'],
    time: 10,
    kcal: 320,
    diet: 'vegetarisch',
    allergens: ['gluten', 'laktose'],
    foods: [],
    ingredients: ['40 g Grieß', '250 ml Milch', '1 TL Zucker', '100 g Apfelmus', 'Zimt'],
    steps: [
      'Milch mit Zucker aufkochen.',
      'Grieß einrieseln lassen und unter Rühren 3 Minuten quellen lassen.',
      'Mit Apfelmus und Zimt servieren.'
    ],
    tint: '#DDEAF4'
  },
  {
    id: 'milchreis-apfelmus',
    name: 'Milchreis mit Apfelmus',
    meals: ['fruehstueck', 'snack'],
    time: 35, serve: 2, prep: true, mealprep: true,
    kcal: 360,
    diet: 'vegetarisch',
    allergens: ['laktose'],
    foods: ['Reis'],
    ingredients: ['50 g Milchreis', '250 ml Milch', '1 TL Zucker', '100 g Apfelmus', 'Zimt'],
    steps: [
      'Milch mit Reis und Zucker aufkochen.',
      'Bei kleinster Hitze zugedeckt 30 Minuten quellen lassen, ab und zu umrühren.',
      'Warm oder kalt mit Apfelmus und Zimt essen. Hält sich 2 Tage im Kühlschrank.'
    ],
    tint: '#F5E1A4'
  },
  {
    id: 'hirse-porridge-apfel',
    name: 'Hirse-Porridge mit Apfel',
    meals: ['fruehstueck'],
    time: 15,
    kcal: 300,
    diet: 'vegan',
    allergens: ['gluten'],
    foods: [],
    ingredients: ['40 g Hirse', '200 ml Haferdrink', '1 Apfel', '1 TL Ahornsirup', 'Zimt'],
    steps: [
      'Hirse heiß abspülen.',
      'Mit Haferdrink aufkochen und 12 Minuten bei kleiner Hitze quellen lassen.',
      'Apfel reiben, unterrühren und mit Ahornsirup und Zimt abschmecken.'
    ],
    tint: '#F5E6B8'
  },
  {
    id: 'joghurt-kiwi-kerne',
    name: 'Joghurt mit Kiwi und Kürbiskernen',
    meals: ['fruehstueck'],
    time: 5,
    kcal: 290,
    diet: 'vegetarisch',
    allergens: ['laktose', 'gluten'],
    foods: ['Joghurt', 'Haferflocken'],
    ingredients: ['150 g Joghurt', '1 Kiwi', '20 g Haferflocken', '1 EL Kürbiskerne', '1 TL Honig'],
    steps: [
      'Kiwi schälen und würfeln.',
      'Joghurt mit Haferflocken in eine Schale geben.',
      'Kiwi und Kerne darüber, mit Honig beträufeln.'
    ],
    tint: '#F2D4DC'
  },
  {
    id: 'wuerstchen-ruehrei-toast',
    name: 'Würstchen mit Rührei und Toast',
    meals: ['fruehstueck'],
    time: 10,
    kcal: 420,
    diet: 'fleisch',
    allergens: ['ei', 'gluten', 'laktose'],
    foods: ['Eier', 'Tomaten'],
    ingredients: ['1 Wiener Würstchen', '2 Eier', '1 Scheibe Toast', '1 Tomate', '1 TL Butter', 'Salz, Pfeffer'],
    steps: [
      'Würstchen in heißem Wasser 5 Minuten ziehen lassen.',
      'Eier verquirlen und in Butter zu Rührei stocken lassen.',
      'Toast rösten, Tomate halbieren.',
      'Alles zusammen anrichten.'
    ],
    tint: '#E3DCF2'
  },
  {
    id: 'bircher-birne-walnuss',
    name: 'Bircher-Müsli mit Birne und Walnüssen',
    meals: ['fruehstueck'],
    time: 5, serve: 1, prep: true,
    kcal: 390,
    diet: 'vegetarisch',
    allergens: ['gluten', 'laktose', 'nuesse'],
    foods: ['Haferflocken', 'Joghurt'],
    ingredients: ['40 g Haferflocken', '100 ml Milch', '100 g Joghurt', '1 Birne', '1 EL Walnüsse'],
    steps: [
      'Haferflocken mit Milch und Joghurt verrühren und über Nacht kalt stellen.',
      'Morgens die Birne grob reiben und unterheben.',
      'Mit gehackten Walnüssen bestreuen.'
    ],
    tint: '#DDEAF4'
  },
  {
    id: 'quark-broetchen-konfituere',
    name: 'Brötchen mit Quark und Konfitüre',
    meals: ['fruehstueck'],
    time: 5,
    kcal: 260,
    diet: 'vegetarisch',
    allergens: ['gluten', 'laktose'],
    foods: ['Brot', 'Quark'],
    ingredients: ['1 Brötchen', '50 g Magerquark', '1 EL Konfitüre', '1 Orange'],
    steps: [
      'Brötchen aufschneiden.',
      'Mit Quark und Konfitüre bestreichen.',
      'Orange dazu essen.'
    ],
    tint: '#F5E1A4'
  },
  {
    id: 'herzhafter-haferbrei-ei',
    name: 'Herzhafter Haferbrei mit Ei und Spinat',
    meals: ['fruehstueck'],
    time: 10,
    kcal: 290,
    diet: 'vegetarisch',
    allergens: ['gluten', 'ei', 'laktose'],
    foods: ['Haferflocken', 'Eier', 'Spinat'],
    ingredients: ['40 g Haferflocken', '200 ml Gemüsebrühe', '1 Ei', '1 Handvoll Spinat', '15 g Parmesan', 'Pfeffer'],
    steps: [
      'Haferflocken in der Brühe 4 Minuten köcheln.',
      'Spinat unterrühren, bis er zusammenfällt.',
      'Ei in einer Pfanne zum Spiegelei braten.',
      'Brei mit Parmesan und Pfeffer anrichten, Ei obendrauf.'
    ],
    tint: '#F5E6B8'
  },
  {
    id: 'buchweizen-pfannkuchen-apfel',
    name: 'Buchweizen-Pfannkuchen mit Apfel',
    meals: ['fruehstueck'],
    time: 20,
    kcal: 350,
    diet: 'vegetarisch',
    allergens: ['gluten', 'ei', 'laktose'],
    foods: ['Eier'],
    ingredients: ['40 g Buchweizenmehl', '1 Ei', '100 ml Milch', '½ Apfel', '1 TL Öl', '1 TL Ahornsirup'],
    steps: [
      'Mehl, Ei und Milch zu einem glatten Teig verrühren und 5 Minuten ruhen lassen.',
      'Apfel in dünne Scheiben schneiden.',
      'Teig in Öl ausbacken, Apfelscheiben auf die rohe Seite legen und wenden.',
      'Mit Ahornsirup servieren.'
    ],
    tint: '#F2D4DC'
  },
  {
    id: 'overnight-oats-kakao',
    name: 'Kakao-Overnight-Oats mit Banane',
    meals: ['fruehstueck'],
    time: 5, serve: 0, prep: true,
    kcal: 310,
    diet: 'vegetarisch',
    allergens: ['gluten', 'laktose'],
    foods: ['Haferflocken', 'Banane'],
    ingredients: ['50 g Haferflocken', '150 ml Milch', '1 TL Kakao', '½ Banane', '1 TL Ahornsirup'],
    steps: [
      'Haferflocken, Milch, Kakao und Ahornsirup in einem Glas verrühren.',
      'Über Nacht in den Kühlschrank stellen.',
      'Morgens Bananenscheiben darauf geben.'
    ],
    tint: '#E3DCF2'
  },
  // ---------- Vegetarisch und vegan – Hauptgerichte ----------
  {
    id: 'kaesespaetzle',
    name: 'Käsespätzle mit Röstzwiebeln',
    meals: ['mittag', 'abend'],
    time: 20,
    kcal: 650,
    diet: 'vegetarisch',
    allergens: ['gluten', 'ei', 'laktose'],
    foods: ['Käse'],
    ingredients: ['200 g Spätzle', '40 g Bergkäse', '1 Zwiebel', '1 TL Butter', '1 Handvoll Salat', 'Salz, Pfeffer, Muskat'],
    steps: [
      'Zwiebel in Ringe schneiden und in Butter langsam goldbraun braten, herausnehmen.',
      'Spätzle in der Pfanne erhitzen.',
      'Geriebenen Käse unterheben, bis er schmilzt, mit Muskat und Pfeffer würzen.',
      'Röstzwiebeln darauf, Salat dazu.'
    ],
    tint: '#DCE8C8'
  },
  {
    id: 'gnocchi-spinat-tomate',
    name: 'Gnocchi-Pfanne mit Spinat und Tomaten',
    meals: ['mittag', 'abend'],
    time: 15,
    kcal: 460,
    diet: 'vegetarisch',
    allergens: ['gluten', 'laktose'],
    foods: ['Spinat', 'Tomaten'],
    ingredients: ['200 g Gnocchi', '2 Handvoll Spinat', '150 g Kirschtomaten', '20 g Parmesan', '1 TL Öl', '1 Knoblauchzehe', 'Salz, Pfeffer'],
    steps: [
      'Gnocchi in Öl goldbraun braten.',
      'Knoblauch und halbierte Tomaten dazu und 2 Minuten mitbraten.',
      'Spinat unterheben, bis er zusammenfällt.',
      'Mit Parmesan, Salz und Pfeffer servieren.'
    ],
    tint: '#E6EFD0'
  },
  {
    id: 'halloumi-bulgur-salat',
    name: 'Bulgur-Salat mit gebratenem Halloumi',
    meals: ['mittag', 'abend'],
    time: 20, mealprep: true,
    kcal: 530,
    diet: 'vegetarisch',
    allergens: ['gluten', 'laktose'],
    foods: ['Gurke', 'Tomaten'],
    ingredients: ['60 g Bulgur', '60 g Halloumi', '100 g Gurke', '1 Tomate', '1 EL Öl', '1 EL Zitronensaft', 'Salz, Pfeffer, Minze'],
    steps: [
      'Bulgur mit kochendem Wasser übergießen und 10 Minuten quellen lassen.',
      'Gurke und Tomate würfeln.',
      'Halloumi in Scheiben ohne Fett von beiden Seiten braun braten.',
      'Bulgur mit Gemüse, Öl, Zitrone und Minze mischen, Halloumi darauf.'
    ],
    tint: '#F6CFC2'
  },
  {
    id: 'spinat-ricotta-lasagne',
    name: 'Spinat-Ricotta-Lasagne',
    meals: ['mittag', 'abend'],
    time: 55, mealprep: true,
    kcal: 520,
    diet: 'vegetarisch',
    allergens: ['gluten', 'laktose'],
    foods: ['Nudeln', 'Spinat'],
    ingredients: ['60 g Lasagneplatten', '100 g Ricotta', '3 Handvoll Spinat', '200 g passierte Tomaten', '30 g Mozzarella', '1 Knoblauchzehe', 'Salz, Pfeffer, Muskat'],
    steps: [
      'Spinat mit Knoblauch zusammenfallen lassen, ausdrücken und mit Ricotta, Salz und Muskat mischen.',
      'Tomaten würzen.',
      'In einer kleinen Form Tomaten, Platten und Spinatmasse schichten, mit Tomaten abschließen.',
      'Mozzarella darauf und bei 180 °C 35 Minuten backen.'
    ],
    tint: '#F5D9A0'
  },
  {
    id: 'blumenkohl-linsen-curry',
    name: 'Blumenkohl-Linsen-Curry mit Reis',
    meals: ['mittag', 'abend'],
    time: 30, mealprep: true,
    kcal: 720,
    diet: 'vegan',
    allergens: [],
    foods: ['Linsen', 'Reis'],
    ingredients: ['200 g Blumenkohl', '40 g rote Linsen', '100 ml Kokosmilch', '200 g passierte Tomaten', '60 g Reis', '1 TL Öl', 'Salz, Currypulver, Kurkuma'],
    steps: [
      'Reis garen.',
      'Currypulver und Kurkuma in Öl kurz anrösten.',
      'Blumenkohl-Röschen, Linsen, Tomaten, Kokosmilch und 100 ml Wasser dazu.',
      '15 Minuten köcheln, bis Linsen und Kohl weich sind. Mit Reis servieren.'
    ],
    tint: '#E3DCF2'
  },
  {
    id: 'rote-bete-risotto',
    name: 'Rote-Bete-Risotto mit Feta',
    meals: ['abend'],
    time: 35,
    kcal: 510,
    diet: 'vegetarisch',
    allergens: ['laktose'],
    foods: ['Reis', 'Feta'],
    ingredients: ['70 g Risottoreis', '1 Rote Bete', '½ Zwiebel', '400 ml Gemüsebrühe', '15 g Parmesan', '30 g Feta', '1 TL Butter'],
    steps: [
      'Zwiebel in Butter glasig dünsten, Reis kurz mitrösten.',
      'Nach und nach heiße Brühe angießen und unter Rühren 20 Minuten garen.',
      'Rote Bete würfeln oder pürieren und unterrühren.',
      'Parmesan einrühren, Feta darüberbröseln.'
    ],
    tint: '#DCE8C8'
  },
  {
    id: 'polenta-ratatouille',
    name: 'Polenta mit Ratatouille-Gemüse',
    meals: ['abend'],
    time: 30,
    kcal: 450,
    diet: 'vegetarisch',
    allergens: ['laktose'],
    foods: ['Zucchini', 'Paprika'],
    ingredients: ['60 g Polenta', '½ Zucchini', '½ Aubergine', '1 Paprika', '200 g passierte Tomaten', '15 g Parmesan', '1 TL Öl', 'Salz, Pfeffer, Kräuter der Provence'],
    steps: [
      'Gemüse würfeln und in Öl 5 Minuten anbraten.',
      'Tomaten und Kräuter dazu, 15 Minuten schmoren.',
      'Polenta in 250 ml kochendes Salzwasser rühren und 5 Minuten quellen lassen.',
      'Parmesan unter die Polenta rühren und mit dem Gemüse servieren.'
    ],
    tint: '#E6EFD0'
  },
  {
    id: 'kichererbsen-bratlinge',
    name: 'Kichererbsen-Bratlinge mit Joghurt-Dip',
    meals: ['mittag', 'abend'],
    time: 30, mealprep: true,
    kcal: 640,
    diet: 'vegetarisch',
    allergens: ['ei', 'gluten', 'laktose'],
    foods: ['Kichererbsen', 'Eier', 'Joghurt'],
    ingredients: ['1 Dose Kichererbsen', '1 Ei', '2 EL Paniermehl', '½ Zwiebel', '1 EL Öl', '100 g Joghurt', '1 Handvoll Salat', 'Salz, Kreuzkümmel, Petersilie'],
    steps: [
      'Kichererbsen abspülen und grob zerdrücken.',
      'Mit Ei, Paniermehl, gehackter Zwiebel und Gewürzen mischen und 4 Bratlinge formen.',
      'In Öl je Seite 4 Minuten braten.',
      'Joghurt mit Salz und Petersilie verrühren und mit Salat dazu servieren.'
    ],
    tint: '#F6CFC2'
  },
  {
    id: 'gefuellte-paprika-feta',
    name: 'Gefüllte Paprika mit Reis und Feta',
    meals: ['abend'],
    time: 45, mealprep: true,
    kcal: 470,
    diet: 'vegetarisch',
    allergens: ['laktose'],
    foods: ['Paprika', 'Reis', 'Feta'],
    ingredients: ['2 Paprika', '50 g Reis', '40 g Feta', '200 g passierte Tomaten', '½ Zwiebel', 'Salz, Pfeffer, Oregano'],
    steps: [
      'Reis garen.',
      'Paprika aufschneiden und entkernen.',
      'Reis mit Feta, gehackter Zwiebel und Oregano mischen und einfüllen.',
      'Tomaten in eine Form geben, Paprika hineinsetzen und bei 200 °C 30 Minuten backen.'
    ],
    tint: '#F5D9A0'
  },
  {
    id: 'spinat-ricotta-nudeln',
    name: 'Nudeln mit Spinat-Ricotta-Soße',
    meals: ['mittag', 'abend'],
    time: 15,
    kcal: 480,
    diet: 'vegetarisch',
    allergens: ['gluten', 'laktose'],
    foods: ['Nudeln', 'Spinat'],
    ingredients: ['80 g Nudeln', '80 g Ricotta', '2 Handvoll Spinat', '1 Knoblauchzehe', '15 g Parmesan', 'Salz, Pfeffer, Muskat'],
    steps: [
      'Nudeln kochen.',
      'Spinat mit Knoblauch in etwas Nudelwasser zusammenfallen lassen.',
      'Ricotta unterrühren und mit Muskat würzen.',
      'Nudeln untermischen, mit Parmesan servieren.'
    ],
    tint: '#E3DCF2'
  },
  {
    id: 'erdnuss-reisnudeln-edamame',
    name: 'Erdnuss-Reisnudeln mit Edamame',
    meals: ['mittag', 'abend'],
    time: 15,
    kcal: 570,
    diet: 'vegan',
    allergens: ['soja', 'nuesse', 'gluten'],
    foods: [],
    ingredients: ['70 g Reisnudeln', '100 g Edamame', '1 Möhre', '1 EL Erdnussbutter', '1 EL Sojasauce', '1 EL Limettensaft', '1 TL Öl'],
    steps: [
      'Reisnudeln nach Packung garen, Edamame die letzten 3 Minuten mitkochen.',
      'Erdnussbutter, Sojasauce, Limettensaft und 3 EL warmes Wasser glatt rühren.',
      'Möhre in feine Streifen schneiden und in Öl kurz anbraten.',
      'Nudeln, Edamame und Soße dazugeben und durchschwenken.'
    ],
    tint: '#DCE8C8'
  },
  {
    id: 'linsensalat-rucola-feta',
    name: 'Linsensalat mit Rucola und Feta',
    meals: ['mittag'],
    time: 25, mealprep: true,
    kcal: 510,
    diet: 'vegetarisch',
    allergens: ['laktose', 'gluten'],
    foods: ['Linsen', 'Feta', 'Paprika', 'Brot'],
    ingredients: ['60 g Berglinsen', '1 Handvoll Rucola', '30 g Feta', '½ Paprika', '1 EL Öl', '1 Scheibe Brot', 'Salz, Pfeffer, Essig'],
    steps: [
      'Linsen in Wasser 20 Minuten bissfest kochen und abgießen.',
      'Paprika würfeln.',
      'Linsen mit Öl, Essig, Salz und Pfeffer anmachen, Paprika und Rucola unterheben.',
      'Feta darüberbröseln, Brot dazu. Schmeckt auch am nächsten Tag.'
    ],
    tint: '#E6EFD0'
  },
  {
    id: 'kartoffel-erbsen-curry',
    name: 'Kartoffel-Erbsen-Curry mit Spinat',
    meals: ['mittag', 'abend'],
    time: 30, mealprep: true,
    kcal: 620,
    diet: 'vegan',
    allergens: [],
    foods: ['Kartoffeln', 'Spinat'],
    ingredients: ['250 g Kartoffeln', '100 g Erbsen (TK)', '1 Handvoll Spinat', '100 ml Kokosmilch', '200 g passierte Tomaten', '½ Zwiebel', '1 TL Öl', 'Salz, Currypulver, Kreuzkümmel'],
    steps: [
      'Zwiebel in Öl andünsten, Gewürze kurz mitrösten.',
      'Kartoffeln würfeln, mit Tomaten, Kokosmilch und etwas Wasser dazugeben.',
      '20 Minuten köcheln, bis die Kartoffeln weich sind.',
      'Erbsen und Spinat die letzten 3 Minuten mitgaren.'
    ],
    tint: '#F6CFC2'
  },
  {
    id: 'gemuese-hirse-quark',
    name: 'Gemüse-Hirse-Pfanne mit Kräuterdip',
    meals: ['mittag', 'abend'],
    time: 25,
    kcal: 390,
    diet: 'vegetarisch',
    allergens: ['laktose'],
    foods: ['Zucchini', 'Paprika', 'Quark'],
    ingredients: ['60 g Hirse', '½ Zucchini', '1 Paprika', '100 g Magerquark', '1 TL Öl', 'Salz, Pfeffer, Kräuter'],
    steps: [
      'Hirse abspülen und in der doppelten Menge Wasser 15 Minuten garen.',
      'Zucchini und Paprika würfeln und in Öl anbraten.',
      'Hirse unterheben und würzen.',
      'Quark mit Kräutern, Salz und Pfeffer verrühren und dazu servieren.'
    ],
    tint: '#F5D9A0'
  },
  {
    id: 'spargel-kartoffeln-ruehrei',
    name: 'Spargel mit Kartoffeln und Rührei',
    meals: ['mittag', 'abend'],
    time: 30,
    kcal: 480,
    diet: 'vegetarisch',
    allergens: ['ei', 'laktose'],
    foods: ['Kartoffeln', 'Eier'],
    ingredients: ['300 g Spargel', '250 g Kartoffeln', '2 Eier', '1 TL Butter', 'Salz, Pfeffer, Schnittlauch'],
    steps: [
      'Spargel schälen und in Salzwasser 12 Minuten garen.',
      'Kartoffeln kochen.',
      'Eier verquirlen und in Butter zu Rührei stocken lassen.',
      'Alles zusammen anrichten, Schnittlauch darüber.'
    ],
    tint: '#E3DCF2'
  },
  {
    id: 'veganes-gyros-soja',
    name: 'Veganes Gyros mit Soja-Tzatziki',
    meals: ['mittag', 'abend'],
    time: 25,
    kcal: 610,
    diet: 'vegan',
    allergens: ['soja', 'gluten'],
    foods: ['Gurke'],
    ingredients: ['50 g Sojaschnetzel', '1 Zwiebel', '¼ Fladenbrot', '100 g Sojajoghurt', '100 g Gurke', '1 Knoblauchzehe', '1 EL Öl', '1 TL Sojasauce', 'Salz, Oregano, Paprikapulver'],
    steps: [
      'Sojaschnetzel in heißer Brühe oder Wasser 10 Minuten einweichen und gut ausdrücken.',
      'Mit Sojasauce, Oregano und Paprikapulver mischen und in Öl knusprig braten, Zwiebelringe dazu.',
      'Gurke raspeln und mit Sojajoghurt und Knoblauch verrühren.',
      'Mit Fladenbrot servieren.'
    ],
    tint: '#DCE8C8'
  },
  {
    id: 'teriyaki-tofu-brokkoli',
    name: 'Teriyaki-Tofu mit Brokkoli und Reis',
    meals: ['mittag', 'abend'],
    time: 25, mealprep: true,
    kcal: 530,
    diet: 'vegan',
    allergens: ['soja', 'gluten'],
    foods: ['Tofu', 'Brokkoli', 'Reis'],
    ingredients: ['150 g Tofu', '200 g Brokkoli', '60 g Reis', '1 EL Sojasauce', '1 TL Ahornsirup', '10 g Ingwer', '1 TL Sesam', '1 TL Öl'],
    steps: [
      'Reis garen.',
      'Tofu würfeln und in Öl rundum knusprig braten.',
      'Brokkoli in Röschen 4 Minuten dämpfen.',
      'Sojasauce, Ahornsirup, geriebenen Ingwer und 2 EL Wasser zum Tofu geben und einkochen lassen.',
      'Mit Brokkoli und Reis anrichten, Sesam darüber.'
    ],
    tint: '#E6EFD0'
  },
  {
    id: 'minestrone',
    name: 'Minestrone mit weißen Bohnen',
    meals: ['mittag', 'abend'],
    time: 35, mealprep: true,
    kcal: 510,
    diet: 'vegetarisch',
    allergens: ['gluten', 'laktose'],
    foods: ['Nudeln', 'Zucchini', 'Bohnen'],
    ingredients: ['40 g Suppennudeln', '1 Möhre', '½ Zucchini', '½ Dose weiße Bohnen', '200 g passierte Tomaten', '300 ml Gemüsebrühe', '15 g Parmesan', '1 TL Öl', 'Salz, Pfeffer, Basilikum'],
    steps: [
      'Möhre und Zucchini würfeln und in Öl andünsten.',
      'Tomaten und Brühe dazu, 10 Minuten köcheln.',
      'Nudeln und abgespülte Bohnen dazugeben und weitere 8 Minuten garen.',
      'Mit Basilikum und Parmesan servieren.'
    ],
    tint: '#F6CFC2'
  },
  {
    id: 'wirsing-kartoffel-eintopf',
    name: 'Wirsing-Kartoffel-Eintopf',
    meals: ['mittag', 'abend'],
    time: 35, mealprep: true,
    kcal: 590,
    diet: 'vegan',
    allergens: ['gluten'],
    foods: ['Kartoffeln', 'Kichererbsen', 'Brot'],
    ingredients: ['200 g Wirsing', '200 g Kartoffeln', '1 Möhre', '½ Dose Kichererbsen', '400 ml Gemüsebrühe', '1 TL Öl', '1 Scheibe Brot', 'Salz, Pfeffer, Kümmel'],
    steps: [
      'Kartoffeln und Möhre würfeln, Wirsing in Streifen schneiden.',
      'Gemüse in Öl andünsten, mit Brühe auffüllen.',
      'Kichererbsen dazugeben und 20 Minuten köcheln.',
      'Mit Kümmel, Salz und Pfeffer abschmecken, Brot dazu.'
    ],
    tint: '#F5D9A0'
  },
  {
    id: 'glasnudelsuppe-tofu',
    name: 'Glasnudelsuppe mit Tofu und Pak Choi',
    meals: ['mittag', 'abend'],
    time: 20,
    kcal: 480,
    diet: 'vegan',
    allergens: ['soja', 'gluten'],
    foods: ['Tofu'],
    ingredients: ['60 g Glasnudeln', '150 g Tofu', '1 Pak Choi', '1 Möhre', '400 ml Gemüsebrühe', '1 EL Sojasauce', '10 g Ingwer'],
    steps: [
      'Brühe mit geriebenem Ingwer aufkochen.',
      'Möhre in dünne Scheiben, Tofu in Würfel, Pak Choi in Streifen schneiden.',
      'Alles mit den Glasnudeln in die Brühe geben und 5 Minuten ziehen lassen.',
      'Mit Sojasauce abschmecken.'
    ],
    tint: '#E3DCF2'
  },
  {
    id: 'ofen-feta-nudeln',
    name: 'Ofen-Feta-Nudeln mit Kirschtomaten',
    meals: ['mittag', 'abend'],
    time: 30,
    kcal: 530,
    diet: 'vegetarisch',
    allergens: ['gluten', 'laktose'],
    foods: ['Nudeln', 'Feta', 'Tomaten'],
    ingredients: ['80 g Nudeln', '60 g Feta', '200 g Kirschtomaten', '1 Knoblauchzehe', '1 TL Öl', 'Salz, Pfeffer, Oregano'],
    steps: [
      'Tomaten und Feta mit Öl, Knoblauch und Oregano in eine kleine Form geben.',
      'Bei 200 °C 25 Minuten backen.',
      'Währenddessen die Nudeln kochen.',
      'Feta und Tomaten zerdrücken und mit den Nudeln mischen.'
    ],
    tint: '#DCE8C8'
  },
  {
    id: 'kartoffelpuffer-apfelmus',
    name: 'Kartoffelpuffer mit Apfelmus',
    meals: ['mittag', 'abend'],
    time: 30,
    kcal: 540,
    diet: 'vegetarisch',
    allergens: ['ei', 'gluten'],
    foods: ['Kartoffeln', 'Eier'],
    ingredients: ['300 g Kartoffeln', '1 Ei', '1 EL Mehl', '½ Zwiebel', '1 EL Öl', '150 g Apfelmus', 'Salz'],
    steps: [
      'Kartoffeln und Zwiebel fein reiben und gut ausdrücken.',
      'Mit Ei, Mehl und Salz mischen.',
      'Flache Puffer in Öl von beiden Seiten knusprig braten.',
      'Mit Apfelmus servieren.'
    ],
    tint: '#E6EFD0'
  },
  {
    id: 'bulgur-fenchel-orange',
    name: 'Bulgur-Salat mit Fenchel und Orange',
    meals: ['mittag'],
    time: 20, mealprep: true,
    kcal: 630,
    diet: 'vegan',
    allergens: ['gluten'],
    foods: ['Kichererbsen'],
    ingredients: ['60 g Bulgur', '½ Fenchel', '1 Orange', '½ Dose Kichererbsen', '1 Handvoll Salat', '1 EL Kürbiskerne', '1 EL Öl', 'Salz, Pfeffer, Essig'],
    steps: [
      'Bulgur mit kochendem Wasser übergießen und 10 Minuten quellen lassen.',
      'Fenchel fein hobeln, Orange filetieren, Kichererbsen abspülen.',
      'Alles mit Öl, Essig, Salz und Pfeffer mischen.',
      'Mit Salat und Kürbiskernen anrichten.'
    ],
    tint: '#F6CFC2'
  },
  {
    id: 'tortilla-pizza-gemuese',
    name: 'Tortilla-Pizza mit Gemüse',
    meals: ['abend'],
    time: 15,
    kcal: 580,
    diet: 'vegetarisch',
    allergens: ['gluten', 'laktose'],
    foods: ['Paprika', 'Mais'],
    ingredients: ['2 Tortillas', '100 g passierte Tomaten', '40 g Mozzarella', '½ Paprika', '3 EL Mais', '5 Oliven', 'Oregano'],
    steps: [
      'Ofen auf 220 °C vorheizen.',
      'Tortillas mit Tomaten bestreichen und mit Oregano würzen.',
      'Mit Paprika, Mais und Oliven belegen, Mozzarella darauf.',
      '8 Minuten knusprig backen.'
    ],
    tint: '#F5D9A0'
  },
  {
    id: 'rotkohl-apfel-salat',
    name: 'Rotkohl-Apfel-Salat mit Feta und Walnüssen',
    meals: ['mittag'],
    time: 15,
    kcal: 460,
    diet: 'vegetarisch',
    allergens: ['nuesse', 'laktose', 'gluten'],
    foods: ['Feta', 'Brot'],
    ingredients: ['150 g Rotkohl', '1 Apfel', '1 EL Walnüsse', '30 g Feta', '1 EL Öl', '1 Scheibe Brot', 'Salz, Essig'],
    steps: [
      'Rotkohl fein hobeln und mit Salz und Essig kräftig durchkneten.',
      'Apfel in Stifte schneiden und mit Öl unterheben.',
      'Feta und gehackte Walnüsse darüber, Brot dazu.'
    ],
    tint: '#E3DCF2'
  },
  {
    id: 'ofen-rosenkohl-kartoffeln',
    name: 'Ofen-Rosenkohl mit Kartoffeln und Kräuterdip',
    meals: ['abend'],
    time: 35,
    kcal: 440,
    diet: 'vegetarisch',
    allergens: ['laktose'],
    foods: ['Kartoffeln', 'Quark'],
    ingredients: ['200 g Rosenkohl', '250 g Kartoffeln', '1 EL Öl', '100 g Magerquark', 'Salz, Pfeffer, Kräuter'],
    steps: [
      'Ofen auf 220 °C vorheizen.',
      'Rosenkohl halbieren, Kartoffeln würfeln, mit Öl und Salz mischen.',
      'Auf dem Blech 25 Minuten backen, einmal wenden.',
      'Quark mit Kräutern würzen und dazu servieren.'
    ],
    tint: '#DCE8C8'
  },
  {
    id: 'halloumi-wrap',
    name: 'Halloumi-Wrap mit Joghurt',
    meals: ['mittag', 'abend'],
    time: 10,
    kcal: 590,
    diet: 'vegetarisch',
    allergens: ['gluten', 'laktose'],
    foods: ['Tomaten', 'Joghurt'],
    ingredients: ['2 Tortillas', '60 g Halloumi', '1 Tomate', '1 Handvoll Salat', '2 EL Joghurt', 'Salz, Pfeffer, Minze'],
    steps: [
      'Halloumi in Scheiben ohne Fett braun braten.',
      'Joghurt mit Minze, Salz und Pfeffer verrühren.',
      'Tortillas mit Joghurt bestreichen, mit Salat, Tomate und Halloumi belegen und einrollen.'
    ],
    tint: '#E6EFD0'
  },
  {
    id: 'kohlrabi-kartoffel-gratin',
    name: 'Kohlrabi-Kartoffel-Gratin',
    meals: ['abend'],
    time: 45, mealprep: true,
    kcal: 560,
    diet: 'vegetarisch',
    allergens: ['laktose'],
    foods: ['Kartoffeln', 'Käse'],
    ingredients: ['1 Kohlrabi', '200 g Kartoffeln', '100 ml Milch', '50 ml Kochsahne', '30 g geriebener Käse', 'Salz, Pfeffer, Muskat'],
    steps: [
      'Ofen auf 200 °C vorheizen.',
      'Kohlrabi und Kartoffeln in dünne Scheiben schneiden und in eine Form schichten.',
      'Milch und Sahne mit Salz, Pfeffer und Muskat verrühren und darübergießen.',
      'Mit Käse bestreuen und 35 Minuten backen.'
    ],
    tint: '#F6CFC2'
  },
  // ---------- Snacks ----------
  {
    id: 'snack-edamame',
    name: 'Edamame mit Meersalz',
    meals: ['snack'],
    time: 5,
    kcal: 150,
    diet: 'vegan',
    allergens: ['soja'],
    foods: [],
    ingredients: ['100 g Edamame', 'Salz'],
    steps: [
      'Edamame in kochendem Wasser 4 Minuten garen.',
      'Abgießen und mit grobem Salz bestreuen.'
    ],
    tint: '#DDEAF4'
  },
  {
    id: 'snack-datteln-mandeln',
    name: 'Datteln mit Mandeln',
    meals: ['snack'],
    time: 1,
    kcal: 140,
    diet: 'vegan',
    allergens: ['nuesse'],
    foods: [],
    ingredients: ['3 Datteln', '1 EL Mandeln'],
    steps: [
      'Datteln entkernen und je eine Mandel hineinstecken, Rest dazu essen.'
    ],
    tint: '#F5E1A4'
  },
  {
    id: 'snack-skyr-mango',
    name: 'Skyr mit Mango',
    meals: ['snack'],
    time: 3,
    kcal: 130,
    diet: 'vegetarisch',
    allergens: ['laktose'],
    foods: [],
    ingredients: ['150 g Skyr', '¼ Mango'],
    steps: [
      'Mango würfeln.',
      'Über den Skyr geben.'
    ],
    tint: '#DCE8C8'
  },
  {
    id: 'snack-huettenkaese-radieschen',
    name: 'Hüttenkäse mit Radieschen',
    meals: ['snack'],
    time: 3,
    kcal: 80,
    diet: 'vegetarisch',
    allergens: ['laktose'],
    foods: [],
    ingredients: ['100 g Hüttenkäse', '50 g Radieschen', 'Salz, Pfeffer, Schnittlauch'],
    steps: [
      'Radieschen in Scheiben schneiden.',
      'Mit dem Hüttenkäse mischen und würzen.'
    ],
    tint: '#F2D4DC'
  },
  {
    id: 'snack-knaecke-frischkaese',
    name: 'Knäckebrot mit Frischkäse und Gurke',
    meals: ['snack'],
    time: 3,
    kcal: 120,
    diet: 'vegetarisch',
    allergens: ['gluten', 'laktose'],
    foods: ['Gurke'],
    ingredients: ['2 Knäckebrot', '20 g Frischkäse', '50 g Gurke'],
    steps: [
      'Knäckebrot mit Frischkäse bestreichen.',
      'Mit Gurkenscheiben belegen.'
    ],
    tint: '#F7DDB8'
  },
  {
    id: 'snack-kohlrabi-dip',
    name: 'Kohlrabi-Sticks mit Joghurt-Dip',
    meals: ['snack'],
    time: 5,
    kcal: 110,
    diet: 'vegetarisch',
    allergens: ['laktose'],
    foods: ['Joghurt'],
    ingredients: ['½ Kohlrabi', '100 g Joghurt', 'Salz, Pfeffer, Kräuter'],
    steps: [
      'Kohlrabi schälen und in Stifte schneiden.',
      'Joghurt mit Kräutern, Salz und Pfeffer verrühren.'
    ],
    tint: '#DDEAF4'
  },
  {
    id: 'snack-dattel-kakao-kugeln',
    name: 'Dattel-Kakao-Kugeln',
    meals: ['snack'],
    time: 10, mealprep: true,
    kcal: 180,
    diet: 'vegan',
    allergens: ['nuesse'],
    foods: [],
    ingredients: ['4 Datteln', '1 EL Nüsse', '1 TL Kakao', '1 TL Kokosraspeln'],
    steps: [
      'Datteln und Nüsse fein hacken oder im Mixer zerkleinern.',
      'Mit Kakao zu einer Masse verkneten und 3 Kugeln formen.',
      'In Kokosraspeln wälzen. Halten sich eine Woche im Kühlschrank.'
    ],
    tint: '#F5E1A4'
  },
  {
    id: 'snack-salami-kaese-trauben',
    name: 'Salami-Käse-Spieße mit Trauben',
    meals: ['snack'],
    time: 3,
    kcal: 200,
    diet: 'fleisch',
    allergens: ['laktose'],
    foods: ['Käse'],
    ingredients: ['3 Scheiben Salami', '20 g Käse', '50 g Weintrauben'],
    steps: [
      'Käse würfeln, Salami falten.',
      'Abwechselnd mit den Trauben auf Spieße stecken.'
    ],
    tint: '#DCE8C8'
  },
  {
    id: 'snack-orange-kiwi',
    name: 'Orangen-Kiwi-Salat mit Minze',
    meals: ['snack'],
    time: 3,
    kcal: 120,
    diet: 'vegan',
    allergens: [],
    foods: [],
    ingredients: ['1 Orange', '1 Kiwi', 'Minze'],
    steps: [
      'Orange und Kiwi schälen und in Stücke schneiden.',
      'Mit gehackter Minze mischen.'
    ],
    tint: '#F2D4DC'
  },
  {
    id: 'snack-birne-ricotta',
    name: 'Birne mit Ricotta und Honig',
    meals: ['snack'],
    time: 3,
    kcal: 190,
    diet: 'vegetarisch',
    allergens: ['laktose'],
    foods: [],
    ingredients: ['1 Birne', '50 g Ricotta', '1 TL Honig'],
    steps: [
      'Birne in Spalten schneiden.',
      'Ricotta dazu, mit Honig beträufeln.'
    ],
    tint: '#F7DDB8'
  },
  {
    id: 'snack-rote-bete-hummus',
    name: 'Hummus mit Roter Bete und Möhre',
    meals: ['snack'],
    time: 5,
    kcal: 160,
    diet: 'vegan',
    allergens: [],
    foods: [],
    ingredients: ['2 EL Hummus', '50 g Rote Bete', '1 Möhre'],
    steps: [
      'Rote Bete fein würfeln und unter den Hummus rühren.',
      'Möhre in Stifte schneiden und zum Dippen dazu.'
    ],
    tint: '#DDEAF4'
  },
  {
    id: 'snack-apfel-kuerbiskerne',
    name: 'Apfel mit Kürbiskernen',
    meals: ['snack'],
    time: 1,
    kcal: 140,
    diet: 'vegan',
    allergens: [],
    foods: [],
    ingredients: ['1 Apfel', '1 EL Kürbiskerne'],
    steps: [
      'Apfel in Spalten schneiden und mit den Kernen essen.'
    ],
    tint: '#F5E1A4'
  },
  {
    id: 'snack-buttermilch-shake',
    name: 'Buttermilch-Beeren-Shake',
    meals: ['snack'],
    time: 3,
    kcal: 130,
    diet: 'vegetarisch',
    allergens: ['laktose'],
    foods: ['Beeren'],
    ingredients: ['200 ml Buttermilch', '1 Handvoll Beeren (auch TK)', '1 TL Honig'],
    steps: [
      'Alles im Mixer fein pürieren.'
    ],
    tint: '#DCE8C8'
  },
  {
    id: 'snack-gurke-tzatziki',
    name: 'Gurke mit Tzatziki',
    meals: ['snack'],
    time: 5,
    kcal: 100,
    diet: 'vegetarisch',
    allergens: ['laktose'],
    foods: ['Gurke', 'Joghurt'],
    ingredients: ['½ Gurke', '100 g Joghurt', '½ Knoblauchzehe', 'Salz, Dill'],
    steps: [
      'Ein Viertel der Gurke raspeln, mit Joghurt, Knoblauch, Salz und Dill verrühren.',
      'Restliche Gurke in Sticks schneiden und dippen.'
    ],
    tint: '#F2D4DC'
  },
  {
    id: 'snack-ananas-huettenkaese',
    name: 'Ananas mit Hüttenkäse',
    meals: ['snack'],
    time: 3,
    kcal: 120,
    diet: 'vegetarisch',
    allergens: ['laktose'],
    foods: [],
    ingredients: ['100 g Ananas', '100 g Hüttenkäse'],
    steps: [
      'Ananas würfeln.',
      'Mit dem Hüttenkäse in eine Schale geben.'
    ],
    tint: '#F7DDB8'
  },
  {
    id: 'snack-wuerstchen-brot',
    name: 'Wiener Würstchen mit Senf und Brot',
    meals: ['snack'],
    time: 5,
    kcal: 250,
    diet: 'fleisch',
    allergens: ['gluten'],
    foods: ['Brot'],
    ingredients: ['1 Wiener Würstchen', '1 Scheibe Brot', '1 TL Senf'],
    steps: [
      'Würstchen in heißem Wasser erwärmen.',
      'Mit Senf und Brot essen.'
    ],
    tint: '#DDEAF4'
  },
  {
    id: 'snack-knaecke-tahin-banane',
    name: 'Knäckebrot mit Tahin und Banane',
    meals: ['snack'],
    time: 3,
    kcal: 200,
    diet: 'vegan',
    allergens: ['gluten'],
    foods: ['Banane'],
    ingredients: ['2 Knäckebrot', '1 EL Tahin', '½ Banane'],
    steps: [
      'Knäckebrot dünn mit Tahin bestreichen.',
      'Mit Bananenscheiben belegen.'
    ],
    tint: '#F5E1A4'
  },
  {
    id: 'snack-sojajoghurt-beeren',
    name: 'Sojajoghurt mit Beeren und Kürbiskernen',
    meals: ['snack'],
    time: 3,
    kcal: 120,
    diet: 'vegan',
    allergens: ['soja'],
    foods: ['Beeren'],
    ingredients: ['150 g Sojajoghurt', '1 Handvoll Beeren (auch TK)', '1 TL Kürbiskerne'],
    steps: [
      'Joghurt in eine Schale geben.',
      'Beeren und Kerne darüber.'
    ],
    tint: '#DCE8C8'
  },
  {
    id: 'snack-erdnuss-rosinen',
    name: 'Erdnüsse mit Rosinen',
    meals: ['snack'],
    time: 1,
    kcal: 120,
    diet: 'vegan',
    allergens: ['nuesse'],
    foods: [],
    ingredients: ['15 g Erdnüsse', '1 EL Rosinen'],
    steps: [
      'Erdnüsse und Rosinen mischen.'
    ],
    tint: '#F2D4DC'
  },
  {
    id: 'snack-pflaumen-quark',
    name: 'Pflaumen mit Zimt-Quark',
    meals: ['snack'],
    time: 3,
    kcal: 140,
    diet: 'vegetarisch',
    allergens: ['laktose'],
    foods: ['Quark'],
    ingredients: ['3 Pflaumen', '100 g Magerquark', '1 TL Honig', 'Zimt'],
    steps: [
      'Pflaumen entsteinen und in Spalten schneiden.',
      'Quark mit Honig und Zimt verrühren und die Pflaumen darauf geben.'
    ],
    tint: '#F7DDB8'
  },
  {
    id: 'snack-apfelmus-hafer',
    name: 'Apfelmus mit Haferflocken',
    meals: ['snack'],
    time: 2,
    kcal: 150,
    diet: 'vegan',
    allergens: ['gluten'],
    foods: ['Haferflocken'],
    ingredients: ['150 g Apfelmus', '20 g Haferflocken', 'Zimt'],
    steps: [
      'Apfelmus in eine Schale geben.',
      'Haferflocken und Zimt darüberstreuen.'
    ],
    tint: '#DDEAF4'
  }
];
