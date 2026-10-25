# The Tracker

Rezeptbuch, Kalorien-Tracker und Workout-Tracker in **einer** Web-App (PWA) fürs iPhone. Läuft komplett im Browser, lässt sich über „Zum Home-Bildschirm“ installieren. Kein Server, kein Konto.

Entsteht schrittweise aus drei bestehenden Apps, die in ihren eigenen Repos weiterlaufen:

- [Rezeptbuch](https://github.com/juliakelp/Rezeptbuch) (JuliaKelp) – Basis für Rezepte, Wochenplan, Einkauf, Scanner und Zyklus
- [Calorie-Tracker](https://github.com/ST0PTV/Calorie-Tracker) (ST0PTV) – ergänzt das Tracking (Journal, Ziele, Wasser, Koffein, Supplements …)
- [Workout-Tracker](https://github.com/ST0PTV/Workout-Tracker) (ST0PTV) – Krafttraining; Basis für Code-Struktur und Design „Apple nativ“

## Stand

**Phase 1 – Gerüst** (Version 0.1.0): App-Hülle mit Reitern Heute · Rezepte · Training · Ich, Speicherschicht, gemeinsames Profil mit Tageszielen, Design „Apple nativ“ hell/dunkel, offline nutzbar.

**Phase 2 – Tracking** (in Arbeit; Schritt 1 in Version 0.1.1): Journal mit vier Mahlzeiten, Kalorien-Ring und Makros, Suche im Bundeslebensmittelschlüssel, Mengen-Dialog mit Standardportionen, Favoriten, „Zuletzt“, Vortag übernehmen, Untergrenzen-Hinweis beim Tagesziel. Weitere Schritte siehe [docs/ROADMAP.md](docs/ROADMAP.md).

**Entwicklung:** Unter „Ich → Entwicklung“ lassen sich 30 Tage Beispieldaten erzeugen und wieder entfernen. Sie sind erfunden, entstehen auf dem Gerät aus BLS-Lebensmitteln und sind markiert; echte Einträge bleiben beim Entfernen erhalten.

## Lokal starten

```sh
python3 -m http.server 8000
```

Dann http://localhost:8000 öffnen.

## Prüfen

```sh
npm test         # Node-Tests (Speicher, Profil, Suche, Portionen, Journal, Beispieldaten)
npm run check    # Syntax aller JS-Dateien + jede App-Datei im Precache von sw.js
npm run privacy  # Scan nach persönlichen Strings (eigene Begriffe in .privacy-terms.local)
npm run test:browser            # Browser-Abläufe (Playwright außerhalb des Repos)
npm run release -- check        # Vorabcheck vor einem Release
```

## Datenschutz

Alle Einträge bleiben **nur auf dem Gerät** (localStorage, Präfix `tt_`). Dieses Repository enthält ausschließlich Programmcode und öffentliche Referenzdaten, **keine persönlichen Daten**. Backups gehören nie ins Repo (per `.gitignore` ausgeschlossen).

Die App läuft unter derselben Adresse (`st0ptv.github.io`) wie Calorie-Tracker und Workout-Tracker. Sie liest und schreibt deshalb nur eigene Speicher-Keys (`tt_…`) und löscht nur eigene Offline-Caches (`tt-cache-…`).

## Aufbau

```
index.html, sw.js, manifest.webmanifest
css/app.css            Design-Tokens und Bausteine („Apple nativ“; weitere Themes später)
js/app.js              Einstieg: Router mit allen Bereichen
js/core/               gemeinsam: store (Speicher), profile (Ziele, Körper, Ernährung), ui, sheet, icons, theme
js/features/           Bereiche: heute, rezepte, training, ich; food/ (BLS, Portionen), journal/ (Daten, Karte, Sheets)
data/bls.json          Auszug aus dem Bundeslebensmittelschlüssel 4.0
tests/                 Node-Tests
```

Regel: Bereiche greifen nie direkt auf den Speicher anderer Bereiche zu. Ziele (kcal, Makros) liest jeder Bereich über `js/core/profile.js`.

## Lizenz und Quellen

Eigener Code: [MIT-Lizenz](LICENSE). Übernommene Teile behalten ihre Lizenz und ihren Hinweis:

- Workout-Tracker – Copyright (c) 2026 ST0PTV, MIT: Speicherschicht, Router, Sheets, Icons, Design „Apple nativ“
- Calorie-Tracker – Copyright (c) 2026 ST0PTV, MIT: Makro-Presets und Ziel-Historie (Herleitung und Studien in dessen README)
- Rezeptbuch – Copyright (c) 2026 JuliaKelp, MIT: Navigation; Journal, Lebensmittelsuche, Mengen-Dialog und Portionen aus der Tracker-Kopie im Rezeptbuch (Kalorien-Tracker von ST0PTV, dort angepasst)
- **Nährwerte:** Max Rubner-Institut (2025). Bundeslebensmittelschlüssel (BLS), Version 4.0. Karlsruhe. DOI [10.25826/Data20251217-134202-0](https://doi.org/10.25826/Data20251217-134202-0), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). `data/bls.json` ist verändert: Auszug (Energie, Makronährstoffe, Ballaststoffe, Zucker, acht Mineralstoffe/Vitamine je 100 g); freier Zucker, Ernährungsform und Allergene abgeleitet, nicht vom Max Rubner-Institut.
- **Standardportionen:** SINU (2024), LARN V Revisione, „Porzioni standard“ für Erwachsene, Werte über [ATS Brescia (2025)](https://www.ats-brescia.it/documents/3432658/78612060/Porzioni+standard+degli+alimenti+per+la+popolazione+adulta.pdf/2ce817e7-0713-bbe6-56c7-767285a575dd).

Weitere Fremdinhalte (Open Food Facts, ZXing, tesseract.js) werden hier und in der App unter „Ich → Quellen & Lizenzen“ ergänzt, sobald sie im Repo liegen.
