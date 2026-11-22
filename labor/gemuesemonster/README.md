# Labor: Level-System „Gemüsemonster“

Eigenständige Testseite für das Level-System. **Nicht Teil von The Tracker:** keine Verbindung zur App, kein Service Worker, nicht im Precache. Die Integration kommt erst nach Phase 5 (siehe `docs/ROADMAP.md`) und erst, wenn das Labor getestet ist.

- Online: https://st0ptv.github.io/The-Tracker-/labor/gemuesemonster/
- Lokal: im Repo-Ordner `python3 -m http.server 8765`, dann http://localhost:8765/labor/gemuesemonster/
- Tests der Berechnung: `node labor/gemuesemonster/tests/test_level.js` (läuft auch in `npm test` über `tests/labor-level.test.js`)

## Was man testen kann

Die Seite startet mit erfundenen Testdaten. Oben „Szenario wählen“:

| Szenario | Was passiert |
|---|---|
| Garten mit Besuch | Läuft seit gut vier Monaten, heute kommt ein neues Bonus-Monster |
| Mitbringsel heute | Ein Monster hat etwas mitgebracht |
| Kurz vor Entwicklung | „Heute eintragen“ löst die Entwicklung zur Normalform aus |
| Neuer Monat, Ei | „Heute eintragen“ lässt das Monatsei schlüpfen |
| Rückwirkend starten | Daten da, Starter noch nicht gewählt |
| Spiel noch aus | Hinweiskarte mit Einführung |
| Neu ohne Daten | Ei wählen und ausbrüten |

„Direkt öffnen“ führt zu Fortschritt, Garten, Sammlung, Entdecker, Kleiderschrank, Saison, Arenen und Einführung. „Scan zählen“ simuliert einen Barcode-Scan (XP in Monat 1, Entdecker).

**Speicher:** nur `gmlab.v1` und `gmlab.szenario` im localStorage. Das Labor liest und schreibt nie `ct.v1`, `tt_…`, `wt_…` oder `rezeptbuch-…`, obwohl alle ST0PTV-Apps dieselbe Origin teilen. Alle Daten sind erfunden.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `index.html` | Labor-Seite |
| `js/level.js` | Berechnung: XP, Level, Monatsmonster, Quartale, Jahre, Garten, Samen, Codes, Arena-Duell (reine Funktionen, mit Node testbar) |
| `js/monster_art.js` | Alle Monster als SVG (generiert aus `design/generatoren/build_monster_art.py`) |
| `js/level_ui.js` | Chip, Fortschritt, Starter-Wahl, Schlüpfen/Entwickeln, Einstellungen, Begleiter |
| `js/level_garden.js` | Garten, Beet, Besucher, Mitbringsel |
| `js/level_collection.js` | Sammlung, Sammelkarten, Steckbrief, Kleiderschrank |
| `js/level_explorer.js` | Entdecker-Rang, Forschungsauftrag, Vergleichen und Tauschen per Code |
| `js/level_extras.js` | Saison, Monatspostkarte, Arenen und Duell, Einführung |
| `js/level_notes.js` | Feldnotizen je Monster |
| `js/wirt.js` | **Labor-Wirt**: stellt bereit, was die Module von einer App erwarten, plus Szenarien |
| `css/monster.css` | Animationen der Monster (Ruhe `i-*`, typische Aktion `s-*`, generiert aus `design/generatoren/anim.py`) |
| `css/level.css` | Oberfläche des Level-Systems |
| `css/wirt.css` | Stil „Glas 2.0“ des Calorie Trackers (nur, damit die Oberfläche wie im Original aussieht) |
| `css/labor.css` | Nur Labor-Hinweise |
| `fonts/` | Sora (SIL OFL 1.1, `fonts/SORA-OFL.txt`) |
| `design/kompendium.html` | Gemüsemonster-Kompendium: alle Entwürfe interaktiv (lädt Schriften von Google Fonts) |
| `design/generatoren/` | Python-Generatoren der Entwürfe, Animationen und Monte-Carlo der Samen-Wirtschaft |
| `design/vorschau/` | Alte Vorschau aus dem Calorie Tracker (nur zum Nachlesen, schreibt `ct.v1` – nicht benutzen) |
| `KONZEPT.md` | Konzept, Entscheidungen und Regeln (alte Übergabe aus dem Calorie Tracker) |

## Was die Module von der Wirts-App erwarten

Für die spätere Integration in The Tracker. Heute erfüllt `js/wirt.js` diese Schnittstelle.

- Globale `state` mit `days` (`{ 'JJJJ-MM-TT': [{ meal, … }] }`), `level` (siehe `LEVEL_DEFAULTS()`), `weightLog`, `water`, `slices`
- `save()` ruft `lvInvalidate()` auf; `render()` zeichnet die Seite neu
- `toast(text)`, `openSheet(html)`, `closeSheet()`, `sheetHead(id, titel, unterfenster, extra)`, `infoBtn(key)` mit `INFO`
- `esc`, `isoDate`, `addDays`, `$`, `waterOf(iso)`, `waterGoalFor(iso)`, `setOpen`
- Optional: `liveFood`, `openAmount`, `openFoodForm` (Entdecker-Aufträge öffnen dann das Lebensmittel)
- Einstiegspunkte: `lvChipHtml`/`lvBindChip`/`lvAfterRender` (Journal-Kopf), `lvVisitorHtml`/`lvBindVisitor` und `lvIntroCardHtml`/`lvBindIntroCard` (Journal-Karten), `lvSettingsCard`/`lvBindSettings` (Einstellungen), `lvCompanionSvg` (Begleiter)
- Ereignisse aus der App: `levelEvent(state, 'scan' | 'own' | 'fill' | 'share', iso)` und `levelFoodEvent(state, art, iso, foodId)`

Für The Tracker noch nötig: ES-Module statt globaler Skripte, Speicher über `js/core/store.js` (`tt_level`), Farben über die Tokens von „Apple nativ“, Profil über `js/core/profile.js`.

## Herkunft

Code und Entwürfe stammen aus `ST0PTV/Calorie-Tracker`, Branch `wip/level-ui` (Stand `e170f25`, 19.10.2026), MIT, ST0PTV. Dort wurde das Level-System nie veröffentlicht; `main` des Calorie Trackers enthält es seit 2.4.0 nicht mehr.
