// Koffein-Kurve von 6 Uhr bis 6 Uhr am Folgetag: Modellwert, Schlafzeit, Schwelle, „jetzt“, optional Vorschau.
// Nach caffChartSvg im Kalorien-Tracker (Rezeptbuch/tracker/js/caffeine.js, ST0PTV/JuliaKelp, MIT).
// Farben kommen aus CSS-Klassen (Tokens), nicht aus dem Code.
import { absHours, level } from './caffeine-model.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Gibt SVG-Text zurück. o: { iso, doses, plan?, nowH?, ke, thr, bed, wake, h?, axis?, label? } */
export function chartSvg(o) {
  const { iso, doses, plan = null, nowH = null, ke, thr, bed, wake, h: H = 150, axis = true } = o;
  const W = 326, top = 8, bot = H - (axis ? 16 : 4);
  const t0 = absHours(iso, 360), t1 = t0 + 24;
  const ts = []; for (let t = t0; t <= t1 + 1e-9; t += 0.1) ts.push(t);
  const lb = ts.map((t) => level(doses, t, ke));
  const lp = plan ? ts.map((t) => level(plan, t, ke)) : null;
  const peak = Math.max(0, ...lb, ...(lp || []));
  const maxMg = Math.max(100, thr * 2, peak * 1.15);
  const x = (t) => ((t - t0) / 24) * W;
  const y = (mg) => bot - (Math.min(mg, maxMg) / maxMg) * (bot - top);
  const path = (arr, dl, a = t0, b = t1) => {
    let d = '';
    ts.forEach((t, i) => { if (t >= a - 1e-9 && t <= b + 1e-9) d += (d ? ' L ' : 'M ') + x(t).toFixed(1) + ' ' + y(arr[i]).toFixed(1); });
    return d + (b === t1 ? '' : ` L ${x(b).toFixed(1)} ${y(level(dl, b, ke)).toFixed(1)}`);
  };
  const inRange = nowH != null && nowH >= t0 && nowH <= t1;
  let s = `<svg class="cchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || 'Koffein im Körper (Modellwert) von 6 Uhr bis 6 Uhr am Folgetag')}">`;
  if (bed < t1) {
    const bx = Math.max(0, x(bed)), wx = x(Math.min(wake, t1));
    s += `<rect class="sleep" x="${bx.toFixed(1)}" y="${top - 2}" width="${(wx - bx).toFixed(1)}" height="${bot - top + 2}" rx="8"></rect><text class="lab" x="${(bx + 6).toFixed(1)}" y="${top + 10}">Schlaf</text>`;
  }
  s += `<line class="thr" x1="0" x2="${W}" y1="${y(thr).toFixed(1)}" y2="${y(thr).toFixed(1)}"></line><text class="lab" x="2" y="${(y(thr) - 4).toFixed(1)}">${Math.round(thr)} mg</text>`;
  if (inRange) {
    const past = path(lb, doses, t0, nowH);
    s += `<path class="area" d="${past} L ${x(nowH).toFixed(1)} ${bot} L 0 ${bot} Z"></path>`;
    s += `<path class="line${plan ? ' base' : ''}" d="${past}"></path><path class="line fut${plan ? ' base' : ''}" d="${path(lb, doses, nowH, t1)}"></path>`;
  } else {
    const d = path(lb, doses);
    s += `<path class="area" d="${d} L ${x(t1).toFixed(1)} ${bot} L 0 ${bot} Z"></path><path class="line${plan ? ' base' : ''}" d="${d}"></path>`;
  }
  if (plan) s += `<path class="line plan" d="${path(lp, plan)}"></path>`;
  if (inRange) {
    const ny = y(level(plan || doses, nowH, ke));
    s += `<line class="now" x1="${x(nowH).toFixed(1)}" x2="${x(nowH).toFixed(1)}" y1="${top - 2}" y2="${bot}"></line><circle class="dot" cx="${x(nowH).toFixed(1)}" cy="${ny.toFixed(1)}" r="4.5"></circle>`;
  }
  if (axis) {
    for (const [t, f, a] of [['6', 0, 'start'], ['12', 0.25, 'middle'], ['18', 0.5, 'middle'], ['24', 0.75, 'middle'], ['6', 1, 'end']]) {
      s += `<text class="lab" x="${(f * W).toFixed(1)}" y="${H - 3}" text-anchor="${a}">${t}</text>`;
    }
  }
  return s + '</svg>';
}

/** Heatmap: Koffein im Körper je Stunde (Zeilen) und Tag (Spalten). days: [{ iso, doses, mg }]. */
export function heatSvg({ days, ke, thr, limit, bed, wake, sel, nowH }) {
  const n = days.length, W = 340, L = 26, top = 6, ch = 7, cw = (W - L) / n, H = top + 24 * ch + 18;
  const lvl = (v) => (v < 1 ? 0 : v / thr < 0.5 ? 1 : v / thr < 1 ? 2 : v / thr < 2 ? 3 : v / thr < 3 ? 4 : 5);
  const bedH = Math.floor((bed % 1440) / 60), wakeH = Math.ceil(wake / 60);
  const sleepRow = (h) => (bedH >= wakeH ? (h >= bedH || h < wakeH) : (h >= bedH && h < wakeH));
  let s = `<svg class="heat" viewBox="0 0 ${W} ${H}" role="img" aria-label="Heatmap: Koffein im Körper je Stunde und Tag, ${n} Tage">`;
  for (let h = 0; h < 24; h++) if (sleepRow(h)) s += `<rect class="hs" x="${L - 6}" y="${top + h * ch + 0.5}" width="3" height="${ch - 1}" rx="1"></rect>`;
  for (const h of [0, 6, 12, 18]) s += `<text class="lab" x="${L - 10}" y="${top + h * ch + 6}" text-anchor="end">${h}</text>`;
  days.forEach((d, i) => {
    for (let h = 0; h < 24; h++) {
      const t = absHours(d.iso, h * 60 + 30);
      if (nowH != null && t > nowH) continue;
      s += `<rect class="hc h${lvl(level(d.doses, t, ke))}" x="${(L + i * cw + 0.5).toFixed(1)}" y="${top + h * ch + 0.5}" width="${(cw - 1).toFixed(1)}" height="${ch - 1}" rx="1.5"></rect>`;
    }
    if (d.mg > limit) s += `<circle class="hover" cx="${(L + i * cw + cw / 2).toFixed(1)}" cy="${top + 24 * ch + 5}" r="2"></circle>`;
    if (i % 5 === 0 || i === n - 1) s += `<text class="lab" x="${(L + i * cw + cw / 2).toFixed(1)}" y="${H - 2}" text-anchor="middle">${new Date(d.iso + 'T12:00:00').getDate()}</text>`;
    s += `<rect class="hit" data-heat="${i}" x="${(L + i * cw).toFixed(1)}" y="${top}" width="${cw.toFixed(1)}" height="${24 * ch}"></rect>`;
  });
  if (sel != null) s += `<rect class="hsel" x="${(L + sel * cw).toFixed(1)}" y="${top - 1}" width="${cw.toFixed(1)}" height="${24 * ch + 2}" rx="2"></rect>`;
  return s + '</svg>';
}
