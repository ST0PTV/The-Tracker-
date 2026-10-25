# Roadmap

Schrittweises Zusammenführen. Die Ursprungs-Apps bleiben in ihren Repos; eingetragene Daten werden **nicht** übernommen (Neustart in der neuen App).

## Festgelegt

- Neues Repo, eigene Speicher-Keys `tt_…` (gleiche Origin wie die alten ST0PTV-Apps).
- Design: zunächst nur „Apple nativ“ (hell/dunkel). Weitere Themes später als eigene Token-Sätze.
- Ernährung: Das Rezeptbuch (mit seiner Tracker-Kopie) ist die Basis; Funktionen aus dem Calorie-Tracker ergänzen es. Der Scanner aus dem Rezeptbuch (mit Foto der Nährwerttabelle) ersetzt den des Calorie-Trackers.
- Zyklus: Basis ist der Zyklus aus dem Rezeptbuch; Recherchen aus dem Workout-Tracker fließen ein.
- Level-System: vorerst komplett raus; kommt erst, wenn alles vereint ist.
- Verbrauch kommt von der Smartwatch und fließt nicht automatisch in die Kalorienbilanz.
- Ziele (kcal, Makros, Gewichtsziel) fließen direkt in die Rezept- und Wochenplanung.

## Phasen

1. **Gerüst** – Hülle, Router, Speicher, gemeinsames Profil, Design, Tests. ✅ (0.1.0)
2. **Tracking** – Journal, Lebensmittelsuche (BLS), Scanner + OCR (aus dem Rezeptbuch), Wasser, Koffein, Alkohol, Supplements, Gewichtsziel, Analyse. Ergänzungen aus dem Calorie-Tracker (Insights, Mikronährstoffe, Magen-Modell u. a.), ohne Level-System.
3. **Rezepte** – Rezepte, Wochenplan, Einkauf/Vorrat, Zyklus; Planung liest die Ziele aus dem Profil; Gekochtes landet im Journal.
4. **Training** – Workout-Tracker als eigener Bereich; Körpergewicht aus dem Profil; große Daten erst beim Öffnen laden.
5. **Aufräumen** – ein Backup für alles, eine Einstellungsseite, eine Quellen-Seite; danach Themes und Level-System.
