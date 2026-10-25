# Hinweise für Claude

- Öffentliches Repo: niemals persönliche Daten, Backups, Namen, Orte oder Gesundheitsangaben einchecken. Vor jedem Push `npm run privacy`.
- Sprache: Oberfläche und Kommentare auf Deutsch, kurze Sätze.
- Keine Build-Schritte, keine Abhängigkeiten zur Laufzeit. ES-Module, ein Modul pro Zuständigkeit.
- Speicher nur über `js/core/store.js` (Präfix `tt_`). Nie `ct.v1`, `wt_…` oder `rezeptbuch-…` lesen oder schreiben.
- Ziele, Körper- und Ernährungsdaten nur über `js/core/profile.js`.
- Neue Datei → in `PRECACHE` von `sw.js` eintragen und `CACHE_VERSION` erhöhen (`npm run check` prüft das).
- Farben nur über Tokens in `css/app.css` (später mehrere Themes).
- Übernommener Code: Herkunft im Dateikopf nennen und in README + „Ich → Quellen & Lizenzen“ eintragen.
- Level-System bleibt bis nach Phase 5 draußen.
- Vor dem Commit: `npm test && npm run check`.
