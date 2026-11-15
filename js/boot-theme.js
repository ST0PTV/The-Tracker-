// Darstellung vor dem ersten Zeichnen setzen (klassisches Skript im <head>, synchron). Seit 0.5.0 eigene Datei statt
// Inline-Skript, damit die Content-Security-Policy ohne 'unsafe-inline' für Skripte auskommt.
// Gleiche Regeln wie js/core/theme.js; BAR muss dort gleich sein (tests/themes.test.js).
(function () {
  try {
    var s = JSON.parse(localStorage.getItem('tt_settings') || '{}') || {};
    var BAR = { nativ: ['#000000', '#F2F2F7'], glas: ['#0B0E1A', '#EEF1F8'], sand: ['#14110E', '#F3EDE3'], see: ['#0A1114', '#EEF4F5'] };
    var pal = BAR[s.palette] ? s.palette : 'nativ';
    var light = s.appearance === 'light' || (s.appearance === 'system' && window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches);
    var root = document.documentElement;
    if (pal !== 'nativ') root.setAttribute('data-palette', pal);
    if (light) root.setAttribute('data-theme', 'light');
    document.querySelector('meta[name="theme-color"]').setAttribute('content', BAR[pal][light ? 1 : 0]);
    if (light) document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]').setAttribute('content', 'default');
  } catch (e) { /* ohne Speicher: Dunkel */ }
})();
