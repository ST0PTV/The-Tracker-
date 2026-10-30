# The Tracker

Rezeptbuch, Kalorien-Tracker und Workout-Tracker in **einer** Web-App (PWA) fürs iPhone. Läuft komplett im Browser, lässt sich über „Zum Home-Bildschirm“ installieren. Kein Server, kein Konto.

Entsteht schrittweise aus drei bestehenden Apps, die in ihren eigenen Repos weiterlaufen:

- [Rezeptbuch](https://github.com/juliakelp/Rezeptbuch) (JuliaKelp) – Basis für Rezepte, Wochenplan, Einkauf, Scanner und Zyklus
- [Calorie-Tracker](https://github.com/ST0PTV/Calorie-Tracker) (ST0PTV) – ergänzt das Tracking (Journal, Ziele, Wasser, Koffein, Supplements …)
- [Workout-Tracker](https://github.com/ST0PTV/Workout-Tracker) (ST0PTV) – Krafttraining; Basis für Code-Struktur und Design „Apple nativ“

## Stand

**Phase 1 – Gerüst** (Version 0.1.0): App-Hülle mit Reitern Heute · Rezepte · Training · Ich, Speicherschicht, gemeinsames Profil mit Tageszielen, Design „Apple nativ“ hell/dunkel, offline nutzbar.

**Phase 2 – Tracking** (abgeschlossen mit 0.2.0; Schritt 1 in 0.1.1, Schritt 2 in 0.1.3, Schritt 3 in 0.1.4, Gewichtsziel in 0.1.6, neue Heute-Seite und Alkohol in 0.1.7, neue Ich-Seite in 0.1.8, Analyse in 0.2.0): Journal mit vier Mahlzeiten, Kalorien-Ring und Makros, Suche im Bundeslebensmittelschlüssel, Mengen-Dialog mit Standardportionen, Favoriten, „Zuletzt“, Vortag übernehmen, Untergrenzen-Hinweis beim Tagesziel; Barcode-Scanner (Open Food Facts), Foto der Nährwerttabelle (Texterkennung auf dem Gerät) und eigene Lebensmittel; Wasserzähler, Koffein mit geschätztem Verlauf (Kurve, 30-Tage-Heatmap, Vorschau vor dem Trinken) und Supplements zum Abhaken (Katalog mit Studienlage und BfR-Höchstmengen); Gewicht mit Wochentrend und Gewichtsziel, das das Kalorienziel rechnet (Tempo-Grenzen und Untergrenze wie im Calorie-Tracker); Alkohol-Schätzung (Widmark wie im Calorie-Tracker). „Heute“ minimal: Tracker-Karten ohne Eintrag groß, mit Eintrag kompakt mit Kurve, leere Mahlzeiten ausgeblendet, Eintragen über das „+“ in der Tab-Leiste (auch „Schnell – nur kcal“). „Ich“ als gruppierte Liste mit Symbolen (Ziele, Über mich, Tracker, App); Körperdaten und Schlafzeit gesammelt unter „Schlaf & Körper“, je Tracker eine eigene Einstellungsseite. Analyse über den Trend-Knopf auf „Heute“: 7/30/90 Tage mit Kalorien (Zielband ±10 %), Gewichtstrend, geschätztem Energiebedarf, Wasser, Koffein, Alkohol und Eiweiß; Mikronährstoffe (BLS, Anteil am EU-Bezugswert), Monat mit Makros, Jahresansicht ohne Serie und Magen-Modell als Tageskurve. Weitere Schritte siehe [docs/ROADMAP.md](docs/ROADMAP.md).

**Phase 3 – Rezepte** (läuft; Rezepte in 0.2.1, alle 14 Hauptallergene in 0.2.2, Wochenplan und Einkauf in 0.2.3, danach mehr Rezepte 0.2.4, Vorrat 0.2.5, Zyklus 0.2.6, Abschluss 0.3.0): 200 Rezepte – 96 aus dem Rezeptbuch, 104 eigene Fassungen klassischer Gerichte (0.2.4, mehr Fleischgerichte, kein Fisch) – mit Nährwerten aus dem BLS 4.0 (je Zutat gerechnet, Schätzung). Kurzer Start beim ersten Öffnen (Ernährungsform, die 14 Hauptallergene nach LMIV – in Rezepten teils aus den Zutaten abgeleitet –, Geschmack, Mahlzeiten, Kochzeit, Portionen), änderbar unter „Ich → Ernährung & Rezepte“. Vorschläge für die nächste Mahlzeit passend zum kcal-Rahmen aus dem Tagesziel, Suche, Filter (Mahlzeit, Favoriten, „Ich habe …“). Rezeptseite mit Portionen, Zutaten, Schritten zum Abhaken, Nährwerten, Notiz, Favorit, „Mag ich nicht“ und „Gekocht“ ins Journal (mit Rückgängig). Eigene Rezepte mit Rechnung. „Rezept“ auch im „+“-Menü. Wochenplan für 7 Tage: passende Vorschläge je Mahlzeit, Übernehmen per Tipp, anderes Rezept, Tauschen, Mengen an das Tagesziel angepasst (0,6× bis 1,6×, Schätzung); „Einplanen“ auf der Rezeptseite; Übernommenes steht bei den Vorschlägen zuerst. Einkaufsliste aus den übernommenen Gerichten mit Portionen, zum Abhaken, Grundzutaten getrennt, abzüglich Vorrat. Vorrat (0.2.5): Lebensmittel mit Menge (Suche, Scan, lose Zutaten, „Gekauftes in den Vorrat“), „Gekocht“ zieht die Zutaten ab (Rückgängig), Vorschläge mit vorhandenen Zutaten zuerst, „Gegessen“ aus dem Vorrat ins Journal. Zeitstempel für spätere Auswertungen (Erfassungszeit der Einträge, eigene Lebensmittel, Scans) – nur auf dem Gerät. Zyklus (0.2.6, nur mit „Hast du deine Regel? Ja“ unter „Schlaf & Körper“): Karte auf „Heute“ (Streifen oder Ring), Kalender (Kreise oder Band), Eintragen (Blutung, Temperatur, Schleim, Muttermund, Tests, Körper, Medikamente, Stimmung, Notiz), Verlauf, Wissen mit geprüften Quellen, neutrale Hinweise zum Ansprechen, Erinnerungen auf „Heute“ und als Kalenderdatei, Bericht für die Ärztin, Import aus Text oder .ics. Fruchtbare Tage nur als breite Schätzung, keine Verhütung; mit hormoneller Verhütung ausgeblendet. PIN-Sperre für die ganze App oder nur den Zyklus, mit Schein-PIN. Phasenende 0.3.0: ärztlich festgestellter Mangel (selbst eingetragen) bevorzugt Rezepte, die im Verhältnis zu ihren kcal viel davon enthalten (Schild „viel …“, Schnitt im Wochenplan); Mikronährstoffe gegen DGE-Referenzwerte nach Alter und Geschlecht; Allergene Schalenfrüchte und Erdnuss getrennt.

**Entwicklung:** Unter „Ich → Beispieldaten“ lassen sich 30 Tage Beispieldaten erzeugen und wieder entfernen. Sie sind erfunden, entstehen auf dem Gerät aus BLS-Lebensmitteln und sind markiert; echte Einträge bleiben beim Entfernen erhalten.

## Lokal starten

```sh
python3 -m http.server 8000
```

Dann http://localhost:8000 öffnen.

## Prüfen

```sh
npm test         # Node-Tests (Speicher, Profil, Suche, Portionen, Journal, Beispieldaten, Getränke, Supplements, Gewichtsziel, Alkohol, Schnell-Einträge)
npm run check    # Syntax aller JS-Dateien + jede App-Datei im Precache von sw.js
npm run privacy  # Scan nach persönlichen Strings (eigene Begriffe in .privacy-terms.local)
npm run test:browser            # Browser-Abläufe inkl. Scanner (Test-Kamera, simulierte Open-Food-Facts-Antwort) und echter Texterkennung (Playwright außerhalb des Repos)
npm run release -- check        # Vorabcheck vor einem Release
```

## Datenschutz

Alle Einträge bleiben **nur auf dem Gerät** (localStorage, Präfix `tt_`). Einzige Anfrage nach außen: beim Barcode-Scan die Nummer an Open Food Facts. Fotos der Nährwerttabelle werden auf dem Gerät gelesen und nicht gespeichert. Dieses Repository enthält ausschließlich Programmcode und öffentliche Referenzdaten, **keine persönlichen Daten**. Backups gehören nie ins Repo (per `.gitignore` ausgeschlossen).

Die App läuft unter derselben Adresse (`st0ptv.github.io`) wie Calorie-Tracker und Workout-Tracker. Sie liest und schreibt deshalb nur eigene Speicher-Keys (`tt_…`) und löscht nur eigene Offline-Caches (`tt-cache-…`).

## Aufbau

```
index.html, sw.js, manifest.webmanifest
css/app.css            Design-Tokens und Bausteine („Apple nativ“; weitere Themes später)
js/app.js              Einstieg: Router mit allen Bereichen
js/core/               gemeinsam: store (Speicher), profile (Ziele, Körper, Ernährung), ui, sheet, icons, theme
js/features/           Bereiche: heute, rezepte, training, ich; food/ (BLS, Portionen), journal/ (Daten, Karte, Sheets), drinks/ (Wasser, Koffein- und Alkohol-Modell), supp/ (Supplements), goal/ (Gewicht, Gewichtsziel), me/ (Schlaf & Körper), analyse/ (Trend, Energiebedarf, Mikronährstoffe, Magen-Modell, Ansichten), recipes/ (Rezeptdaten, Zutaten-Nährwerte, Auswahl, Rezeptseite, eigene Rezepte, Start)
data/bls.json          Auszug aus dem Bundeslebensmittelschlüssel 4.0
tests/                 Node-Tests
```

Regel: Bereiche greifen nie direkt auf den Speicher anderer Bereiche zu. Ziele (kcal, Makros) liest jeder Bereich über `js/core/profile.js`.

## Lizenz und Quellen

Eigener Code: [MIT-Lizenz](LICENSE). Übernommene Teile behalten ihre Lizenz und ihren Hinweis:

- Workout-Tracker – Copyright (c) 2026 ST0PTV, MIT: Speicherschicht, Router, Sheets, Icons, Design „Apple nativ“, Tab-Leiste mit erhöhtem Mittelknopf und Streifen-Behandlung im iOS-Home-Bildschirm (`js/core/viewport-gap.js`)
- Calorie-Tracker – Copyright (c) 2026 ST0PTV, MIT: Makro-Presets und Ziel-Historie (Herleitung und Studien in dessen README); Gewichtsziel-Rechnung aus `js/weightgoal.js`, Alkohol-Schätzung aus `js/alcohol.js`, Auswertungen aus `js/insights.js`, `js/micro.js`, Magen-Modell aus `js/timeline.js` und Analytics-Aufbau aus `js/v2.js` (2.3.1); Idee des „+“-Menüs, der minimalen Tracker-Karten und der Ich-Seite mit Symbolen und „Schlaf & Körper“
- Rezeptbuch – Copyright (c) 2026 JuliaKelp, MIT: Navigation; Journal, Lebensmittelsuche, Mengen-Dialog, Portionen, Scanner, Foto-Erkennung (`parseNutrition`), eigene Lebensmittel, Wasser, Koffein-Modell und -Verlauf sowie Supplement-Tracker mit Katalog aus der Tracker-Kopie im Rezeptbuch (Kalorien-Tracker von ST0PTV, dort angepasst); Rezepte (`recipes.js`), Zutaten-Nährwerte (`nutrition.js`), Auswahl, Rezeptseite, eigene Rezepte, kurzer Start, Wochenplan (`ensureWeek`, Mengenfaktoren), Einkaufsliste, Vorrat (`vorrat.js`), Zyklus (`zyklus.js`, zerlegt in `js/features/cycle/` und die PIN-Sperre `js/core/lock.js`) und die Ginger-Zeichnung als Platzhalterbild; Farben für das dunkle Theme aus dem Calorie-Tracker
- **Nährwerte:** Max Rubner-Institut (2025). Bundeslebensmittelschlüssel (BLS), Version 4.0. Karlsruhe. DOI [10.25826/Data20251217-134202-0](https://doi.org/10.25826/Data20251217-134202-0), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). `data/bls.json` ist verändert: Auszug (Energie, Makronährstoffe, Ballaststoffe, Zucker, acht Mineralstoffe/Vitamine je 100 g); freier Zucker, Ernährungsform und Allergene abgeleitet, nicht vom Max Rubner-Institut.
- **Standardportionen:** SINU (2024), LARN V Revisione, „Porzioni standard“ für Erwachsene, Werte über [ATS Brescia (2025)](https://www.ats-brescia.it/documents/3432658/78612060/Porzioni+standard+degli+alimenti+per+la+popolazione+adulta.pdf/2ce817e7-0713-bbe6-56c7-767285a575dd).

- **Barcode-Daten:** [Open Food Facts](https://world.openfoodfacts.org), [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/), Inhalte Database Contents License (DbCL) 1.0. Abfrage zur Laufzeit, nur die Barcode-Nummer wird gesendet; Ergebnisse werden nur auf dem Gerät gespeichert.
- **Barcode-Erkennung:** [ZXing](https://github.com/zxing-js/library) (`vendor/zxing.min.js`), Apache License 2.0, siehe `vendor/ZXING-LICENSE`.
- **Texterkennung:** [tesseract.js](https://github.com/naptha/tesseract.js) 5.1.1 und tesseract.js-core (`vendor/tesseract/`), Apache License 2.0; deutsches Sprachmodell aus tessdata (Apache 2.0, Paket @tesseract.js-data/deu MIT); Hinweise zu mitgebündelten Bibliotheken in `vendor/tesseract/README.md`. Wird erst beim ersten Foto geladen; das Foto verlässt das Gerät nicht.

- **Koffein und Wasser:** Werte und Modell nach EFSA (2015), BfR, Seng et al. (2009), Drake et al. (2013), DGE und EFSA (2010); vollständige Liste und Schwächen des Modells in der App im ⓘ und unter „Quellen & Lizenzen“. Pegel sind Schätzungen.
- **Gewichtsziel:** 7.700 kcal pro kg (Faustregel; überschätzt die Änderung über längere Zeit, Thomas et al. 2013), Tempo höchstens 1 % (Abnahme, NHS, Helms et al. 2014) bzw. 0,5 % pro Woche (Zunahme, Iraki et al. 2019), Untergrenze 1.200/1.500 kcal (Harvard Health), Grundumsatz nach DGE-Formel (Müller et al. 2004). Angaben aus dem Calorie-Tracker übernommen; Datum und kcal sind Schätzungen.
- **Alkohol:** Widmark (1932), Abbau 0,15 ‰/h (Jones 2010), Verteilungsfaktor aus dem BMI (Maudens et al. 2014), Aufnahme mit Essen langsamer (Fraser et al. 1995), DGE-Position 2024. Aufnahmegeschwindigkeit und Resorptionsdefizit sind Annahmen ohne Quelle. Grobe Schätzung, nicht geeignet, um die Fahrtüchtigkeit zu beurteilen. Aus dem Calorie-Tracker übernommen.
- **Supplements:** BfR-Höchstmengenvorschläge für Nahrungsergänzungsmittel und Studien je Eintrag (im ⓘ des Katalogs). Information, keine Empfehlung.

- **Analyse:** Gewichtstrend als geglätteter Mittelwert (Walker, Hacker's Diet), Energiebedarf aus Essen und Gewicht wie MacroFactor (7.700 kcal/kg, Faustregel), Mikronährstoffe als Anteil am EU-Nährstoffbezugswert (VO (EU) 1169/2011 Anhang XIII), Magen-Modell nach Abell et al. 2008, Datz et al. 1987 und Caballero-Plasencia et al. 1999. Aus dem Calorie-Tracker übernommen, Quellen dort geprüft, hier nicht neu; alle Werte sind Schätzungen.

Alle Quellen stehen auch in der App unter „Ich → Quellen & Lizenzen“.
