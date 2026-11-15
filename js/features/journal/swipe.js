// Wischen auf einem Eintrag (0.5.1, Mockup 5A, Nutzerwahl 2026-11-15): nach links = löschen (mit „Rückgängig“),
// nach rechts = noch einmal eintragen. Nach den Wischgesten im Calorie-Tracker (v2.js, ST0PTV, MIT).
// Kurz wischen zeigt die Aktion, ab der Schwelle wird sie beim Loslassen ausgeführt. Senkrechtes Scrollen bleibt
// (touch-action: pan-y); ein Antippen öffnet weiter den Eintrag. Ohne Wischen: Löschen im Mengen-Dialog.

export const SWIPE_AT = 88;   // px bis zur Aktion
const START = 10;             // px, ab denen eine waagerechte Bewegung als Wischen gilt

/**
 * Macht row (das .entry-Element) wischbar. wrap ist der Rahmen mit den beiden Hintergründen.
 * onDelete / onDuplicate werden nach dem Loslassen gerufen; ohne onDuplicate nur nach links.
 */
export function makeSwipe(wrap, row, { onDelete, onDuplicate = null }) {
  let x0 = 0, y0 = 0, dx = 0, active = false, decided = false, swiped = false, id = null;
  const set = (x) => {
    row.style.transform = x ? `translateX(${x}px)` : '';
    wrap.classList.toggle('to-del', x < 0);
    wrap.classList.toggle('to-dup', x > 0);
    wrap.classList.toggle('armed', Math.abs(x) >= SWIPE_AT);
  };
  const end = () => {
    if (!active) return;
    active = false;
    swiped = true;
    row.classList.remove('swiping');
    const x = dx;
    dx = 0;
    if (x <= -SWIPE_AT) { row.style.transform = 'translateX(-100%)'; setTimeout(onDelete, 120); return; }
    if (x >= SWIPE_AT && onDuplicate) { set(0); onDuplicate(); return; }
    set(0);
  };
  row.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    x0 = e.clientX; y0 = e.clientY; dx = 0; decided = false; active = false; swiped = false; id = e.pointerId;
  });
  row.addEventListener('pointermove', (e) => {
    if (e.pointerId !== id || (decided && !active)) return;
    const mx = e.clientX - x0, my = e.clientY - y0;
    if (!decided) {
      if (Math.abs(mx) < START && Math.abs(my) < START) return;
      decided = true;
      if (Math.abs(mx) <= Math.abs(my)) return; // senkrecht: Seite scrollt
      active = true;
      row.classList.add('swiping');
      try { row.setPointerCapture(id); } catch { /* ältere Browser */ }
    }
    dx = onDuplicate ? mx : Math.min(0, mx);
    // hinter der Schwelle gebremst weiter
    const lim = (v) => (Math.abs(v) > SWIPE_AT ? Math.sign(v) * (SWIPE_AT + (Math.abs(v) - SWIPE_AT) * 0.35) : v);
    set(lim(dx));
  });
  row.addEventListener('pointerup', end);
  row.addEventListener('pointercancel', () => { active = false; dx = 0; row.classList.remove('swiping'); set(0); });
  // Nach einem Wischen kein Klick (sonst öffnet sich der Eintrag)
  wrap.addEventListener('click', (e) => { if (swiped) { e.stopImmediatePropagation(); e.preventDefault(); swiped = false; } }, true);
}
