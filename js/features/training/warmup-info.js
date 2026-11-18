// Übernommen aus dem Workout-Tracker 3.14.0 (js/warmup-info.js, MIT, ST0PTV), angepasst für The Tracker.
// Aufwärm-Hinweis: Text und Evidenz (Recherche 2026-10-13, Details in Drive → Research & Sources).
// Bewusst vorsichtig formuliert: Leistungseffekt uneinheitlich, kein Beleg für Verletzungsschutz im Krafttraining.
export const WARMUP_CHECKED_AT = '2026-10-13';

// v2.34.0: einzeilig (Ebene 1); Begründung im Info-Sheet.
export const WARMUP_HINT = 'Erste Übung für diese Muskeln: 1–2 leichte Aufwärmsätze.';

export const WARMUP_INFO = {
  short: [
    '1–2 leichte Sätze vor der ersten Übung je Muskelgruppe (Konvention der App).',
    'Der Nutzen ist uneinheitlich, am ehesten vor schweren Sätzen.',
    'Leicht halten – langes, anstrengenderes Aufwärmen kann Leistung kosten.'
  ],
  summary: [
    'Spezifische Aufwärmsätze verbessern die folgenden Arbeitssätze nur uneinheitlich; am ehesten vor schweren Sätzen mit wenigen Wiederholungen.',
    'Zum Verletzungsschutz durch Aufwärmen fand ein Review zum Oberkörper keine Studie; fürs Krafttraining ist das kaum untersucht.',
    'Ein Aufwärmsatz vor Isolationsübungen nach Grundübungen brachte in einer Studie (57 trainierte Frauen ab 60) keinen Vorteil, bei Armübungen sogar weniger Wiederholungen. Der Hinweis erscheint deshalb nur bei der ersten Übung je Muskelgruppe (Entscheidung der App).',
    'Halte Aufwärmsätze leicht und nicht ermüdend – ermüdendes Aufwärmen kann die Leistung senken (zwei kleine Studien: 15 min Radfahren mittlerer Intensität senkte das Beinpresse-1RM; ein zusätzlicher Aufwärmsatz senkte bei Armübungen die Wiederholungen).'
  ],
  rule: 'Der Hinweis erscheint, wenn eine primäre Muskelgruppe der Übung heute noch nicht mit erledigten Sätzen belastet wurde (primär oder sekundär). Dass sekundäre Belastung als „aufgewärmt“ zählt, ist eine Design-Entscheidung ohne Studienbeleg.',
  sources: [
    { label: 'Ribeiro et al. 2021, Motricidade (Systematic Review)', url: 'https://doi.org/10.6063/motricidade.21143', note: '11 kleine Studien, uneinheitliche Ergebnisse; Nutzen am ehesten bei Aufwärmlasten nahe am Maximum.' },
    { label: 'Wilson, Nunes, Blazevich et al. 2025, J Sport Health Sci (Meta-Analyse)', url: 'https://doi.org/10.1016/j.jshs.2025.101024', note: 'Höhere Muskeltemperatur verbessert schnelle Kraftentwicklung, nicht die Maximalkraft.' },
    { label: 'McCrary, Ackermann & Halaki 2015, Br J Sports Med (Systematic Review)', url: 'https://doi.org/10.1136/bjsports-2014-094228', note: 'Keine Studie zu Verletzungen; Aufwärmen mit hoher Last verbessert Kraft und Leistung im Oberkörper.' },
    { label: 'Iversen, Norum, Schoenfeld & Fimland 2021, Sports Med (Narrative Review)', url: 'https://doi.org/10.1007/s40279-021-01490-1', note: 'Empfiehlt, sich auf übungsspezifisches Aufwärmen zu beschränken (bei Zeitmangel für jede Übung), vor allem vor schweren Lasten. Expertenmeinung.' },
    { label: 'Lisboa et al. 2024, Aging Clin Exp Res', url: 'https://doi.org/10.1007/s40520-024-02880-x', note: 'Zusätzlicher Aufwärmsatz vor Isolationsübungen nach Grundübungen brachte nichts bzw. weniger Wiederholungen (ältere trainierte Frauen).' },
    { label: 'Barroso et al. 2013, J Strength Cond Res (RCT, Crossover)', url: 'https://doi.org/10.1519/JSC.0b013e3182606cd9', note: '16 krafttrainierte Männer: 15 min Radfahren bei 70 % VO2max senkte das Beinpresse-1RM (−4 %), 15 min bei 40 % erhöhten es (+3 %), 5 min änderten nichts (Volltext).' }
  ]
};
