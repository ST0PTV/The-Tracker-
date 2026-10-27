// Ginger, die Katze aus dem Rezeptbuch, als Platzhalterbild auf den Farbflächen der Rezepte (Nutzerwunsch 2026-10-27:
// „erstmal Ginger lassen“; Texte bleiben ohne Ginger). Zeichnung unverändert aus dem Rezeptbuch, app.js
// (gingerHead, gingerPeek; Copyright (c) 2026 JuliaKelp, MIT-Lizenz). Gibt SVG-Text zurück (nur feste Werte, keine Eingaben).
// Ginger sieht aus wie die echte Ginger: weiße Schnauze, Brust und Pfoten, Kopf und Rücken braun getigert
// mit M-Zeichnung auf der Stirn, schmale weiße Blesse, grün-goldene Augen, rosa Nase, geringelter Schwanz mit dunkler Spitze
const G = { fur: '#9A7353', stripe: '#4A3628', white: '#FFFFFF', line: '#E3D3C4', ear: '#F1BDB4', nose: '#EFA3A6', eye: '#241912', iris: '#AFA34C', rim: '#6F6A2E', tip: '#2B201A' };
let gingerId = 0;

function gingerHead({ happy = false, hat = false } = {}) {
  const id = `gh${++gingerId}`;
  // Augen leicht verschlafen wie auf den Fotos: obere Lider in Fellfarbe
  const eye = (x) => `<ellipse cx="${x}" cy="54" rx="6.4" ry="5.6" fill="${G.iris}" stroke="${G.rim}" stroke-width="0.8"/>
      <ellipse cx="${x}" cy="54.5" rx="3" ry="4.6" fill="${G.eye}"/><circle cx="${x + 2}" cy="52.6" r="1.4" fill="#FFF"/>
      <path d="M${x - 7.5} 50.5 Q${x} 46 ${x + 7.5} 50.5 L${x + 7.5} 47 L${x - 7.5} 47 Z" fill="${G.fur}"/>
      <path d="M${x - 6.6} 51.2 Q${x} 47.6 ${x + 6.6} 51.2" stroke="${G.stripe}" stroke-width="1.1" fill="none"/>`;
  const eyes = happy
    ? `<path d="M31 55 Q37 50 43 55 M57 55 Q63 50 69 55" stroke="${G.stripe}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`
    : eye(37) + eye(63);
  const mouth = `<path d="M50 66.5 L50 68.5 M50 68.5 Q46.5 72 43.5 69.5 M50 68.5 Q53.5 72 56.5 69.5" stroke="${G.stripe}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`
    + (happy ? `<ellipse cx="50" cy="72" rx="2.2" ry="1.8" fill="#EE8F98"/>` : '');
  const hatSvg = hat
    ? '<path d="M30 30 Q26 14 38 14 Q40 4 50 6 Q60 4 62 14 Q74 14 70 30 Z" fill="#FFFFFF" stroke="#E2CFBF" stroke-width="1.5"/><rect x="30" y="26" width="40" height="8" rx="3" fill="#FFFFFF" stroke="#E2CFBF" stroke-width="1.5"/>'
    : '';
  return `<defs><clipPath id="${id}"><ellipse cx="50" cy="57" rx="37" ry="33"/></clipPath></defs>
    <path d="M15 47 L19 7 L47 30 Z" fill="${G.fur}"/>
    <path d="M85 47 L81 7 L53 30 Z" fill="${G.fur}"/>
    <path d="M22 35 L24.5 17 L37 29 Z" fill="${G.ear}"/>
    <path d="M78 35 L75.5 17 L63 29 Z" fill="${G.ear}"/>
    <path d="M24 30 L28 25 M25 34 L30 30 M76 30 L72 25 M75 34 L70 30" stroke="#FFF" stroke-width="1.2" stroke-linecap="round"/>
    <ellipse cx="50" cy="57" rx="37" ry="33" fill="${G.white}" stroke="${G.line}" stroke-width="1.5"/>
    <g clip-path="url(#${id})">
      <path d="M0 0 L100 0 L100 70 Q76 66 64 63 Q58 61 56 52 Q54.5 42 52.5 34 Q50 30.5 47.5 34 Q45.5 42 44 52 Q42 61 36 63 Q24 66 0 70 Z" fill="${G.fur}"/>
      <path d="M42 22 L44.5 31 M50 20 L50 29.5 M58 22 L55.5 31 M36 26 L39 33 M64 26 L61 33 M27 45 Q21 44 16 40 M73 45 Q79 44 84 40 M26 59 Q20 59 15 56 M74 59 Q80 59 85 56" stroke="${G.stripe}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    </g>
    <ellipse cx="43" cy="66" rx="5" ry="3.6" fill="#FAF3EE"/><ellipse cx="57" cy="66" rx="5" ry="3.6" fill="#FAF3EE"/>
    ${eyes}
    <path d="M46.2 61.5 Q50 60.5 53.8 61.5 L50 66 Z" fill="${G.nose}"/>
    ${mouth}
    <path d="M13 61 L30 63.5 M13 68 L30 67 M87 61 L70 63.5 M87 68 L70 67" stroke="#BDAD9E" stroke-width="1.1" stroke-linecap="round"/>
    ${hatSvg}`;
}


/** Kopf, der von unten ins Bild schaut (Breite in px). */
export function gingerPeek(width) {
  return `<svg viewBox="0 0 100 60" width="${width}" height="${Math.round(width * 0.6)}" aria-hidden="true">
    <g transform="translate(0 -6)">${gingerHead()}</g>
  </svg>`;
}

/** Ginger als DOM-Knoten (für h()). */
export function gingerNode(width) {
  const s = document.createElement('span');
  s.className = 'ginger';
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = gingerPeek(width);
  return s;
}
