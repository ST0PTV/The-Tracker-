// Abstands-Prüfer für Karten und Sheets (Browser). Gibt eine Liste von Befunden zurück.
// Regeln: untereinanderliegende Bausteine ≥ 6 px Abstand, keine Überlappung, kein Loch > 40 px;
// Label → Feld 3–12 px; Inhalt ≥ 8 px vom Kartenrand (oben, unten, seitlich); Listenzeilen in .card.list zählen nicht.
export async function auditSpacing(p, where) {
  return p.evaluate((where) => {
    const out = [];
    const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.height > 0 && r.width > 0 && cs.visibility !== 'hidden' && cs.position !== 'absolute' && cs.position !== 'fixed'; };
    const name = (e) => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + (e.getAttribute('aria-label') ? `[${e.getAttribute('aria-label').slice(0, 24)}]` : '') + (e.textContent ? ` „${e.textContent.trim().slice(0, 22)}“` : '');
    const boxes = [...document.querySelectorAll('.card, .sheet .sheet-body')].filter((c) => vis(c) && !c.classList.contains('list') && !c.closest('.sheet-overlay'));
    const inSheet = !!document.querySelector('.sheet');
    for (const c of boxes) {
      if (inSheet && !c.closest('.sheet')) continue; // bei offenem Sheet nur das Sheet prüfen
      const cr = c.getBoundingClientRect();
      const isCard = c.classList.contains('card');
      // Bausteine: sichtbare Kinder; ein reiner Wrapper-div ohne eigene Gestaltung wird aufgelöst
      const blocks = [];
      const collect = (el) => {
        for (const k of el.children) {
          if (!vis(k)) continue;
          const cs = getComputedStyle(k);
          const plain = k.tagName === 'DIV' && !k.className && cs.display === 'block' && cs.paddingTop === '0px' && cs.backgroundColor === 'rgba(0, 0, 0, 0)';
          if (plain) collect(k); else blocks.push(k);
        }
      };
      collect(c);
      blocks.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      for (let i = 1; i < blocks.length; i++) {
        const a = blocks[i - 1].getBoundingClientRect(), b = blocks[i].getBoundingClientRect();
        const sideBySide = b.top < a.bottom - 2 && (b.left >= a.right - 1 || b.right <= a.left + 1);
        if (sideBySide) continue;
        const gap = b.top - a.bottom;
        if (gap < -1) out.push(`${where}: Überlappung ${Math.round(gap)} px zwischen ${name(blocks[i - 1])} und ${name(blocks[i])}`);
        else if (gap < 6) out.push(`${where}: zu eng (${Math.round(gap)} px) zwischen ${name(blocks[i - 1])} und ${name(blocks[i])}`);
        else if (gap > 40) out.push(`${where}: Loch ${Math.round(gap)} px zwischen ${name(blocks[i - 1])} und ${name(blocks[i])}`);
      }
      const padT = parseFloat(getComputedStyle(c).paddingTop);
      if (isCard && blocks.length && padT >= 8) { // Karten ohne Innenabstand (z. B. Mahlzeiten) bringen ihn im Kopf selbst mit
        const f = blocks[0].getBoundingClientRect(), l = blocks[blocks.length - 1].getBoundingClientRect();
        if (f.top - cr.top < 8) out.push(`${where}: Inhalt klebt oben am Kartenrand (${Math.round(f.top - cr.top)} px) bei ${name(blocks[0])}`);
        if (cr.bottom - l.bottom < 8) out.push(`${where}: Inhalt klebt unten am Kartenrand (${Math.round(cr.bottom - l.bottom)} px) bei ${name(blocks[blocks.length - 1])}`);
      }
      for (const e of c.querySelectorAll('input, select, textarea, button, .seg, .chips')) {
        if (!vis(e)) continue;
        const r = e.getBoundingClientRect();
        if (r.left < cr.left - 0.5 || r.right > cr.right + 0.5) out.push(`${where}: ragt seitlich heraus: ${name(e)}`);
      }
      for (const lab of c.querySelectorAll('label.form-label, .form label')) {
        const sp = lab.querySelector(':scope > span'), f = lab.querySelector('input, select, textarea');
        if (!sp || !f || !vis(sp) || !vis(f)) continue;
        const g = f.getBoundingClientRect().top - sp.getBoundingClientRect().bottom;
        if (g < 3 || g > 12) out.push(`${where}: Label „${sp.textContent.trim().slice(0, 20)}“ → Feld ${Math.round(g)} px`);
      }
    }
    // Seitenebene: Karten, Überschriften, Knöpfe untereinander
    if (!inSheet) {
      const top = [...document.querySelectorAll('#view > div > *')].filter(vis);
      for (let i = 1; i < top.length; i++) {
        const a = top[i - 1].getBoundingClientRect(), b = top[i].getBoundingClientRect();
        const gap = b.top - a.bottom;
        if (gap < 6) out.push(`${where}: Seite – zu eng (${Math.round(gap)} px) zwischen ${name(top[i - 1])} und ${name(top[i])}`);
      }
    }
    return out;
  }, where);
}

// Felder: der Text (Wert oder Platzhalter) muss in jedem sichtbaren Eingabefeld senkrecht mittig sitzen (± 3 px).
// Gemessen an den Pixeln des Screenshots, damit auch eingebaute Zeit-/Datumsfelder erfasst werden. Gibt Befunde zurück.
export async function auditFields(p, where) {
  const sel = 'input.input:not([type=checkbox]):not([type=range]), select.input';
  const n = await p.locator(sel).count();
  const out = [];
  await p.evaluate(() => document.querySelectorAll('.toast').forEach((t) => { t.style.visibility = 'hidden'; })); // Hinweise verdecken sonst Felder
  for (let i = 0; i < n; i++) {
    const el = p.locator(sel).nth(i);
    if (!(await el.isVisible())) continue;
    await el.evaluate((e) => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(60);
    const box = await el.boundingBox();
    if (!box || box.height < 20) continue;
    const label = (await el.getAttribute('aria-label')) || (await el.getAttribute('type')) || 'Feld';
    // iPhone: eingebaute Zeit-/Datumsfelder setzen den Wert sonst oben ein; Chromium zeigt das nicht, deshalb zusätzlich die Regel prüfen
    const type = await el.getAttribute('type');
    if (type === 'time' || type === 'date') {
      const cs = await el.evaluate((e) => { const c = getComputedStyle(e); return [c.display, c.alignItems, c.height]; });
      if (cs[0] !== 'flex' || cs[1] !== 'center') out.push(`${where}: „${label}“ – Zeit-/Datumsfeld ohne Zentrierung (display ${cs[0]}, align-items ${cs[1]})`);
    }
    const png = await el.screenshot();
    const r = await p.evaluate(async (b64) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      const lum = (x, y) => { const o = (y * c.width + x) * 4; return 0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2]; };
      const inset = Math.round(c.height * 0.12), x0 = Math.round(c.height * 0.3), x1 = Math.round(c.width * 0.6);
      const bg = lum(x0, Math.round(c.height / 2) - Math.round(c.height * 0.4)); // Hintergrund nahe der Oberkante
      let top = -1, bottom = -1;
      for (let y = inset; y < c.height - inset; y++) {
        let ink = false;
        for (let x = x0; x < x1; x++) if (Math.abs(lum(x, y) - bg) > 45) { ink = true; break; }
        if (ink) { if (top < 0) top = y; bottom = y; }
      }
      return { top, bottom, h: c.height };
    }, png.toString('base64'));
    if (r.top < 0) continue; // leer, nichts zu messen
    const dpr = r.h / box.height;
    const off = ((r.top + r.bottom) / 2 - r.h / 2) / dpr;
    if (Math.abs(off) > 3) out.push(`${where}: „${label}“ – Text sitzt ${off.toFixed(1)} px ${off < 0 ? 'zu hoch' : 'zu tief'} im Feld`);
  }
  return out;
}
