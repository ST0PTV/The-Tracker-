# The Tracker

Rezeptbuch, Kalorien-Tracker und Workout-Tracker in **einer** Web-App (PWA) fürs iPhone. Läuft komplett im Browser, lässt sich über „Zum Home-Bildschirm“ installieren. Kein Server, kein Konto.

Entsteht schrittweise aus drei bestehenden Apps, die in ihren eigenen Repos weiterlaufen:

- [Rezeptbuch](https://github.com/juliakelp/Rezeptbuch) (JuliaKelp) – Basis für Rezepte, Wochenplan, Einkauf, Scanner und Zyklus
- [Calorie-Tracker](https://github.com/ST0PTV/Calorie-Tracker) (ST0PTV) – ergänzt das Tracking (Journal, Ziele, Wasser, Koffein, Supplements …)
- [Workout-Tracker](https://github.com/ST0PTV/Workout-Tracker) (ST0PTV) – Krafttraining; Basis für Code-Struktur und Design „Apple nativ“

## Stand

**Phase 1 – Gerüst** (Version 0.1.0): App-Hülle mit Reitern Heute · Rezepte · Training · Ich, Speicherschicht, gemeinsames Profil mit Tageszielen, Design „Apple nativ“ hell/dunkel, offline nutzbar. Die Inhalte der drei Apps ziehen in den nächsten Phasen ein, siehe [docs/ROADMAP.md](docs/ROADMAP.md).

## Lokal starten

```sh
python3 -m http.server 8000
```

Dann http://localhost:8000 öffnen.

## Prüfen

```sh
npm test         # Node-Tests (Speicher, Profil)
npm run check    # Syntax aller JS-Dateien + jede App-Datei im Precache von sw.js
npm run privacy  # Scan nach persönlichen Strings (eigene Begriffe in .privacy-terms.local)
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
js/features/           ein Modul pro Bereich: heute, rezepte, training, ich
tests/                 Node-Tests
```

Regel: Bereiche greifen nie direkt auf den Speicher anderer Bereiche zu. Ziele (kcal, Makros) liest jeder Bereich über `js/core/profile.js`.

## Lizenz und Quellen

Eigener Code: [MIT-Lizenz](LICENSE). Übernommene Teile behalten ihre Lizenz und ihren Hinweis:

- Workout-Tracker – Copyright (c) 2026 ST0PTV, MIT: Speicherschicht, Router, Sheets, Icons, Design „Apple nativ“
- Calorie-Tracker – Copyright (c) 2026 ST0PTV, MIT: Makro-Presets und Ziel-Historie (Herleitung und Studien in dessen README)
- Rezeptbuch – Copyright (c) 2026 JuliaKelp, MIT: Navigation; weitere Teile ab Phase 3

Fremdinhalte, die mit späteren Phasen dazukommen (BLS 4.0, Open Food Facts, ZXing, tesseract.js, Schriften), werden hier und in der App unter „Ich → Quellen & Lizenzen“ ergänzt, sobald sie im Repo liegen.
