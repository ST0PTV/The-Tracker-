// Prüfer für Kontrast, Tippflächen, Wortbrüche und Breite (Browser).
// Kontrast und Tippflächen übernommen aus QRate/tests/browser/a11y.mjs (MIT, ST0PTV), Selektoren an The Tracker angepasst.
// Regeln (WCAG 2.2, Workout Tracker 3.10.0):
// - Kontrast: Text ≥ 4,5:1, großer Text (≥ 24 px oder ≥ 18,7 px fett) ≥ 3:1. Deaktivierte Bedienelemente zählen nicht.
// - Tippflächen: unter 24 × 24 px ist ein Fehler (WCAG 2.2 AA), unter 44 px nur ein Hinweis (Apple-Empfehlung).
//   Echter Treffertest: elementFromPoint in der Mitte und 3 px innerhalb jeder Kante muss das Element selbst treffen.
// - Wortbrüche: Ein Wort darf nicht ohne Trennstrich auf zwei Zeilen stehen (eigene Ergänzung 0.5.3).
// - Breite: Die Seite darf nicht breiter als der Bildschirm werden.
// Gezeichnete Flächen (svg, canvas) und die Animation werden übersprungen.

// .visually-hidden: Datei-Inputs, deren sichtbares Label die Tippfläche ist
const SKIP = 'svg, canvas, [disabled], [aria-disabled="true"], [hidden], .anim-stage, .visually-hidden';
const FIXED = '.tabbar, .toast, .savebar';

export async function auditContrast(p, where) {
  return p.evaluate(({ where, SKIP }) => {
    const out = [];
    const parse = (s) => {
      let m = s.match(/^rgba?\(([^)]+)\)$/);
      if (m) { const v = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return [v[0], v[1], v[2], v[3] ?? 1]; }
      m = s.match(/^color\(srgb ([^)]+)\)$/);
      if (m) { const v = m[1].split(/[\s/]+/).filter(Boolean).map(Number); return [v[0] * 255, v[1] * 255, v[2] * 255, v[3] ?? 1]; }
      return null;
    };
    const over = (top, bottom) => { const a = top[3]; return [0, 1, 2].map((i) => top[i] * a + bottom[i] * (1 - a)).concat(1); };
    const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    // Hintergrund: Schichten von innen nach außen sammeln, bis eine deckend ist. Bild oder Verlauf auf einem Element = nicht
    // messbar (gezählt). Ausnahme body/html und Theme-Vorschau [data-pv] (Glas-Verlauf): dort zählt --bg, die Grundfarbe darunter.
    // --bg eines Elements als Farbe auflösen (Theme-Vorschauen [data-pv] setzen ihr eigenes --bg)
    const bgOf = (e) => { const pr = document.createElement('i'); pr.style.cssText = 'position:absolute;color:var(--bg)'; e.append(pr); const c = parse(getComputedStyle(pr).color); pr.remove(); return c; };
    const pageBg = bgOf(document.body) || [255, 255, 255, 1];
    const background = (el) => {
      const layers = [];
      let base = null;
      for (let e = el; e; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.backgroundImage !== 'none') {
          if (e === document.body || e === document.documentElement) { base = pageBg; break; }
          if (e.matches('[data-pv]')) { base = bgOf(e) || pageBg; break; }
          return null;
        }
        const c = parse(cs.backgroundColor);
        if (c && c[3] > 0) { layers.push(c); if (c[3] >= 1) break; }
      }
      if (!base) base = parse(getComputedStyle(document.documentElement).backgroundColor) || pageBg;
      if (base[3] < 1) base = pageBg;
      for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
      return base;
    };
    const opacity = (el) => { let o = 1; for (let e = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity); return o; };
    const seen = new Set();
    let total = 0, skipped = 0;
    const roots = [...document.querySelectorAll('#view, #tabbar, .toast.show, .sheet, dialog[open]')];
    for (const root of roots) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement;
        if (!n.textContent.trim() || seen.has(el)) continue;
        seen.add(el);
        if (el.closest(SKIP)) continue;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (!r.width || !r.height || cs.visibility === 'hidden') continue;
        const bg = background(el);
        const fg = parse(cs.color);
        total++;
        if (!bg || !fg) { skipped++; continue; }
        const o = opacity(el);
        if (o < 0.05) continue; // ausgeblendet (Übergang)
        const shown = over([fg[0], fg[1], fg[2], fg[3] * o], bg);
        const size = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700;
        const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
        const got = ratio(shown, bg);
        if (got < need - 0.005) {
          const cls = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : '';
          out.push(`${where}: Kontrast ${got.toFixed(2)}:1 < ${need}:1 bei ${el.tagName.toLowerCase()}${cls} „${n.textContent.trim().slice(0, 24)}“ (${cs.color} auf rgb(${bg.slice(0, 3).map(Math.round).join(', ')}))`);
        }
      }
    }
    // Ein Check, der fast nichts misst, darf nicht „bestanden“ melden
    if (total >= 5 && skipped / total > 0.2) out.push(`${where}: ${skipped} von ${total} Texten nicht messbar (Bild oder Verlauf im Hintergrund)`);
    return out;
  }, { where, SKIP });
}

export async function auditTargets(p, where) {
  return p.evaluate(({ where, SKIP, FIXED }) => {
    const errors = [], hints = [];
    const sel = 'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="switch"], [role="tab"], summary';
    const name = (e) => e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + (e.getAttribute('aria-label') ? `[${e.getAttribute('aria-label').slice(0, 24)}]` : '') + (e.textContent.trim() ? ` „${e.textContent.trim().slice(0, 20)}“` : '');
    const y0 = scrollY;
    const els = [...document.querySelectorAll(sel)].filter((e) => {
      if (e.closest(SKIP) || e.disabled) return false;
      if (e.parentElement?.closest(sel)) return false; // Teil eines größeren Ziels
      if (e.matches('a') && e.closest('p, li')) return false; // Link im Fließtext (WCAG-Ausnahme)
      if (e.matches('input[type="checkbox"], input[type="radio"]') && e.closest('label')) return false; // das Label ist die Fläche
      const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.pointerEvents !== 'none' && Number(cs.opacity) > 0.05;
    });
    for (const e of els) {
      const fixed = e.closest(FIXED);
      if (!fixed) e.scrollIntoView({ block: 'center', inline: 'nearest' });
      const r = e.getBoundingClientRect();
      // Tippfläche: eigene Box, vergrößert um ein unsichtbares ::after (Muster aus 0.4.3)
      const af = getComputedStyle(e, '::after');
      let w = r.width, hgt = r.height;
      if (af.content !== 'none' && af.position === 'absolute') {
        const ins = ['top', 'right', 'bottom', 'left'].map((k) => parseFloat(af[k]) || 0);
        w = Math.max(w, r.width - ins[1] - ins[3]); hgt = Math.max(hgt, r.height - ins[0] - ins[2]);
      }
      w = Math.round(w); hgt = Math.round(hgt);
      if (w < 24 || hgt < 24) errors.push(`${where}: Tippfläche ${w} × ${hgt} px (< 24) bei ${name(e)}`);
      else if (w < 44 || hgt < 44) hints.push(`${Math.min(w, hgt)} px bei ${name(e)}`);
      // Treffertest: Mitte und 3 px innerhalb jeder Kante der sichtbaren Box
      const pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 3, r.top + r.height / 2], [r.right - 3, r.top + r.height / 2], [r.left + r.width / 2, r.top + 3], [r.left + r.width / 2, r.bottom - 3]]
        .filter(([x, y]) => x >= 0 && y >= 0 && x < innerWidth && y < innerHeight);
      if (!pts.length) continue;
      const centre = document.elementFromPoint(pts[0][0], pts[0][1]);
      if (!centre) continue;
      if (!fixed && centre.closest(FIXED)) continue; // von einer festen Leiste verdeckt: nicht prüfbar
      const hits = (hit) => hit && (hit === e || e.contains(hit) || (hit.contains(e) && hit.matches('label')));
      const miss = pts.filter(([x, y]) => !hits(document.elementFromPoint(x, y)));
      if (miss.length) {
        const hit = document.elementFromPoint(miss[0][0], miss[0][1]);
        errors.push(`${where}: Treffertest verfehlt ${miss.length} von ${pts.length} Punkten bei ${name(e)} (getroffen: ${hit ? name(hit) : 'nichts'})`);
      }
    }
    scrollTo(0, y0);
    return { errors, hints };
  }, { where, SKIP, FIXED });
}

/** Wörter, die ohne Trennstrich über zwei Zeilen laufen (z. B. „Kniebeu|ge“). */
export async function auditWordBreaks(p, where) {
  return p.evaluate(({ where, SKIP }) => {
    const out = [];
    const range = document.createRange();
    const walker = document.createTreeWalker(document.querySelector('#view') || document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || el.closest(SKIP) || !n.textContent.trim()) continue;
      const cs = getComputedStyle(el);
      if (cs.hyphens === 'auto' || cs.visibility === 'hidden' || !el.getClientRects().length) continue;
      const re = /[^\s­\-–\/]{4,}/g;
      for (let m; (m = re.exec(n.textContent));) {
        range.setStart(n, m.index); range.setEnd(n, m.index + m[0].length);
        const rects = [...range.getClientRects()].filter((q) => q.width > 0.5);
        const lines = new Set(rects.map((q) => Math.round(q.top)));
        if (lines.size > 1) { out.push(`${where}: Wort bricht ohne Trennstrich „${m[0].slice(0, 30)}“ in ${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : ''}`); break; }
      }
    }
    return out;
  }, { where, SKIP });
}

/** Seite breiter als der Bildschirm, oder ein Element ragt rechts hinaus (wird sonst still abgeschnitten)?
 *  Ausgenommen: Inhalt in bewusst waagerecht scrollenden Leisten (overflow-x auto/scroll) und unsichtbare Elemente. */
export async function auditWidth(p, where) {
  return p.evaluate(({ where, SKIP }) => {
    const out = [];
    const wide = document.documentElement.scrollWidth - innerWidth;
    if (wide > 0) out.push(`${where}: Seite ist ${wide} px breiter als der Bildschirm`);
    const scrolls = (e) => { for (let a = e.parentElement; a; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === 'auto' || o === 'scroll') return true; } return false; };
    for (const e of document.querySelectorAll('#view *')) {
      if (e.closest(SKIP) || e.closest('.sw-wrap')) continue; // Wisch-Zeilen liegen absichtlich daneben
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height || r.right <= innerWidth + 1) continue;
      const cs = getComputedStyle(e);
      if (cs.visibility === 'hidden' || cs.position === 'fixed' || scrolls(e)) continue;
      out.push(`${where}: ${e.tagName.toLowerCase()}${typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : ''} ragt ${Math.round(r.right - innerWidth)} px über den Rand „${(e.textContent || '').trim().slice(0, 24)}“`);
      if (out.length > 20) break;
    }
    return out;
  }, { where, SKIP });
}
