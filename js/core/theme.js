// Darstellung: Theme (Palette) und Erscheinung (hell, dunkel, System). Grundidee aus dem Workout-Tracker (MIT).
// Setzt am <html> data-palette (fehlt = Apple nativ) und data-theme="light" (fehlt = dunkel) für die Tokens in css/app.css
// und passt Statusleiste und Browserfarbe an. index.html setzt beides schon vor dem ersten Zeichnen (kein Aufblitzen);
// die Tabelle BAR steht dort noch einmal (tests/themes.test.js prüft, dass beide gleich sind).

export const PALETTES = [
  ['nativ', 'Apple nativ', 'Schwarz und Weiß wie iOS'],
  ['glas', 'Glas', 'Farbverlauf, durchscheinende Karten'],
  ['sand', 'Sand', 'Warme Papier- und Espressotöne'],
  ['see', 'See', 'Kühles Petrol und Schiefer']
];
export const APPEARANCES = [['light', 'Hell'], ['dark', 'Dunkel'], ['system', 'System']];
// Farbe der Browserleiste = Grund des Themes (bei Glas ohne Verlauf)
export const BAR = {
  nativ: { dark: '#000000', light: '#F2F2F7' },
  glas: { dark: '#0B0E1A', light: '#EEF1F8' },
  sand: { dark: '#14110E', light: '#F3EDE3' },
  see: { dark: '#0A1114', light: '#EEF4F5' }
};

/** 'light', 'dark' oder 'system' aus den Einstellungen (unbekannte Werte → 'dark'). */
export function appearanceOf(settings) {
  const a = settings && settings.appearance;
  return a === 'light' || a === 'system' ? a : 'dark';
}

/** Schlüssel des Themes (unbekannte Werte → 'nativ'). */
export function paletteOf(settings) {
  const p = settings && settings.palette;
  return PALETTES.some(([k]) => k === p) ? p : 'nativ';
}

/** Tatsächlicher Modus: bei 'system' entscheidet das Gerät (prefersLight). */
export function modeOf(appearance, prefersLight) {
  if (appearance === 'system') return prefersLight ? 'light' : 'dark';
  return appearance === 'light' ? 'light' : 'dark';
}

const mq = () => (typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: light)') : null);
let current = null;
let listening = false;

/** Wendet die Darstellung aus den Einstellungen an. Ohne DOM (Node-Tests) passiert nichts. */
export function applyTheme(settings) {
  if (typeof document === 'undefined') return;
  current = settings;
  const m = mq();
  if (m && !listening) {
    listening = true;
    // „System“: Wechsel des Geräts sofort übernehmen
    m.addEventListener('change', () => { if (current && appearanceOf(current) === 'system') applyTheme(current); });
  }
  const mode = modeOf(appearanceOf(settings), !!(m && m.matches));
  const pal = paletteOf(settings);
  const root = document.documentElement;
  if (mode === 'light') root.setAttribute('data-theme', 'light'); else root.removeAttribute('data-theme');
  if (pal === 'nativ') root.removeAttribute('data-palette'); else root.setAttribute('data-palette', pal);
  const meta = (name) => document.querySelector(`meta[name="${name}"]`);
  meta('theme-color')?.setAttribute('content', BAR[pal][mode]);
  // iOS liest die Statusleisten-Angabe nur beim Start der Web-App; die Änderung greift nach dem nächsten Öffnen.
  meta('apple-mobile-web-app-status-bar-style')?.setAttribute('content', mode === 'light' ? 'default' : 'black-translucent');
  document.dispatchEvent(new CustomEvent('tt-theme', { detail: mode }));
}
