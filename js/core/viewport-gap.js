// Lücke am unteren Rand im iOS-Home-Bildschirm. Übernommen aus dem Workout-Tracker (js/device.js, v3.0.5/3.0.6,
// ST0PTV, MIT), nur umbenannt (Klasse .tt-gap statt .wt-gap) und ohne die übrigen Geräte-Funktionen.
// Gemessen am iPhone (dort): Unter dem Fenster liegt ein Streifen, den die Seite nicht zeichnen kann. Die Leiste bleibt
// im Fenster; bei Lücke setzt diese Funktion nur die Klasse .tt-gap (siehe css/app.css). Ursache dort nicht belegt
// (Hypothese: WebKit-Fehler 301994). Im Safari-Browser bleibt die Lücke 0.
const isStandalone = () => (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const fullHeight = () => (innerWidth > innerHeight ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height));

export function initViewportGap() {
  if (typeof document === 'undefined') return;
  const upd = () => {
    let gap = 0;
    if (isStandalone()) {
      gap = Math.max(0, Math.round(fullHeight() - innerHeight));
      if (gap > 120) gap = 0; // größere Werte = Tastatur o. Ä., nicht der Streifen
    }
    document.documentElement.classList.toggle('tt-gap', gap >= 20);
  };
  upd();
  addEventListener('resize', upd);
  addEventListener('orientationchange', () => setTimeout(upd, 300));
}
